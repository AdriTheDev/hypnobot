# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev          # Start with tsx watch (hot reload)
npm run build        # Type-check TypeScript (no output — tsx runs source directly)
npm run start        # Run with tsx
npm run deploy       # Register/update slash commands with Discord (run manually after command changes)

npm run db:generate  # Regenerate Prisma client after schema changes
npm run db:push      # Sync schema to the DB without a migration file
npm run db:migrate   # Create a named migration and apply it
```

Copy `.env.example` to `.env` and fill in values before running.

## Architecture

### Command handler

Commands live in `src/commands/<Category>/`. Each subfolder name becomes the command's `category`, which surfaces in `/help`. The handler auto-registers all non-`deleted` commands on startup — globally by default, or to a single guild when `DEV_MODE=true` + `DEV_GUILD_ID` is set (instant propagation, useful during development).

Every command file must export a default object satisfying the `Command` interface (`src/lib/types.ts`):

```ts
export default {
  data: new SlashCommandBuilder().setName('...').setDescription('...'),
  cooldown: 10,      // seconds; defaults to 3
  ownerOnly: false,  // checks OWNER_IDS env var (comma-separated)
  deleted: false,    // set true to skip loading and registration
  async execute(interaction, client) { ... },
} satisfies Command;
```

### Event handler

Events live in `src/events/<eventName>/`. The folder name is the exact Discord.js event name (e.g. `messageCreate`, `interactionCreate`). Every `.ts` file inside is registered as a separate listener for that event. Set `once: true` on any export to use `client.once()` instead of `client.on()`.

### Leveling system

XP is granted in `src/events/messageCreate/grantXP.ts` — 15–25 XP per message, with a 60-second per-user/guild in-memory cooldown that resets on restart. The formula for XP required to advance from one level to the next is:

```
xpForLevel(n) = 5n² + 75n + 150
```

The `UserLevel` Prisma model stores lifetime `xp` and the last-known `level`. `resolveLevel(totalXP)` in `src/lib/levelingUtils.ts` recomputes level and within-level progress from raw XP on demand.

### Rank card

`/rank` generates a PNG via `@napi-rs/canvas` (see `src/lib/rankCard.ts`) and sends it as a file attachment. The card shows the avatar, username, guild rank position, level, and an XP progress bar.

### ExtendedClient

`src/index.ts` casts the Discord.js `Client` to `ExtendedClient` (defined in `src/lib/types.ts`), which adds `commands: Collection<string, Command>` and `cooldowns: Collection<string, Collection<string, number>>`. All command/event files that need access to loaded commands receive this type.

### Database

`src/lib/prisma.ts` exports a single `PrismaClient` instance using the `@prisma/adapter-pg` driver adapter. The project uses Prisma v7, which requires a `prisma.config.ts` at the root (datasource URL for CLI tools) and generates the client to `src/generated/prisma/` rather than `node_modules/`.

After any change to `prisma/schema.prisma`, run `npm run db:generate` then either `db:push` (dev, no migration history) or `db:migrate` (named migration). Import the Prisma client from `src/lib/prisma.ts`, never from the generated path directly.

### Moderation stack

All moderation commands share utilities from `src/lib/modUtils.ts`:

- `buildModEmbed(options)` — constructs a standard mod-action embed (user, moderator, reason, optional duration).
- `sendModLog(guild, embed)` — posts to the guild's `modLogChannel`.
- `sendPublicModLog(guild, embed)` — strips the Moderator and Warning ID fields, then posts to `publicModLogChannel`.
- `sendPunishmentDM(user, options)` — DMs the target with action details; returns `false` if DMs are closed.
- `resolveReason(guildId, type, text)` — looks up a `GuildAlias` for the given type (`warn`, `kick`, `ban`, `mute`) and expands short aliases to their full text.
- `fetchAuditEntry` / `fetchAuditExecutor` — fetches a recent audit log entry for a given action + target, used by log events to attribute bot-initiated actions to the responsible moderator.

The `/warn` command auto-bans after a configurable threshold. `/suspend` and `/unsuspend` use a `Suspended` role (auto-created if missing) that strips all existing roles and restores them from the `SuspendedUser` model on unsuspend.

### Automod system

`src/lib/automodUtils.ts` implements a risk-point system that runs on `guildMemberAdd` and `guildMemberUpdate` (screening pass):

- Static factors: no avatar, account age < 7 days, `word.word.1234`-style username, non-ASCII display name — each worth 1 point by default.
- Configurable role factors stored in the `AutomodFactor` model, managed via `/automod role add/remove`.
- When total points reach `AUTOMOD_THRESHOLD` (5), the member is automatically suspended via `runAutomodCheck()`.

### Alias system

The `GuildAlias` model serves two purposes, distinguished by `type`:

- `warn / kick / ban / mute` — reason shortcuts. `resolveReason()` expands them transparently inside mod commands before storing or displaying the reason.
- `trigger` — message commands. `handleTriggers.ts` watches `messageCreate`, matches the first word of a message against trigger aliases, deletes the original, and re-sends the trigger's value with any mentioned users prepended. Use `\n` in the value for line breaks.

### Member cleanup on leave

`src/events/guildMemberRemove/cleanup.ts` runs on every member departure and:
1. Deletes the Discord system join message from the system channel (if present).
2. Deletes the bot's stored welcome message (from `WelcomeMessage`) and removes the DB record.
3. Deletes the member's posts in the configured `introChannel` (text or forum).
4. Deletes the member's threads in each configured `forumChannels` entry.

### Welcome/goodbye messages

`src/lib/memberActions.ts` exports `resolvePlaceholders(template, member, guild)` which substitutes `{@user}`, `{username}`, `{displayname}`, `{membercount}`, and `{server}` in a template string. Both `sendWelcome()` and the goodbye event handler use this — falling back to hardcoded defaults when no custom message is configured in `GuildConfig`.

### botDeletedMessages

`src/lib/botDeletedMessages.ts` exports a TTL-keyed in-memory set. Any time the bot deletes a message itself, call `botDeletedMessages.add(messageId)` **before** the delete so that log events (`messageDelete`, `messageDeleteBulk`) can suppress the resulting noise. If the delete fails, call `botDeletedMessages.delete(messageId)` to clean up.

## Configuration commands

Whenever a setting is added to or removed from `/config` (`src/commands/Admin/config.ts`), also update `/view-config` (`src/commands/Admin/view-config.ts`) to display it. Every field surfaced by `/config` must appear in `/view-config`.

## Code style

No comments unless the reason behind something is genuinely non-obvious. Never add JSDoc blocks, section headers, or inline comments that describe what the code is doing — only write a comment if you would be explaining _why_.

## Environment variables

| Variable             | Required           | Purpose                                                |
| -------------------- | ------------------ | ------------------------------------------------------ |
| `DISCORD_TOKEN`      | Yes                | Bot token                                              |
| `CLIENT_ID`          | Yes                | Application ID for command registration                |
| `OWNER_IDS`          | Yes                | Comma-separated user IDs with owner access             |
| `DATABASE_URL`       | Yes                | PostgreSQL connection string                           |
| `DEV_MODE`           | No                 | Set `true` to register commands to a single guild      |
| `DEV_GUILD_ID`       | When DEV_MODE=true | Target guild for dev command registration              |
| `STATUS_WEBHOOK_URL` | No                 | Discord webhook URL for startup/shutdown/restart logs  |
| `MC_RCON_HOST`       | For `/whitelist`   | Hostname or IP of the Minecraft server                 |
| `MC_RCON_PORT`       | No                 | RCON port (default: 25575)                             |
| `MC_RCON_PASSWORD`   | For `/whitelist`   | RCON password set in server.properties                 |
