# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev          # Start with tsx watch (hot reload)
npm run build        # Type-check TypeScript (no output — tsx runs source directly)
npm run start        # Run with tsx

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
xpForLevel(n) = 5n² + 50n + 100
```

The `UserLevel` Prisma model stores lifetime `xp` and the last-known `level`. `resolveLevel(totalXP)` in `src/lib/levelingUtils.ts` recomputes level and within-level progress from raw XP on demand.

### Rank card

`/rank` generates a PNG via `@napi-rs/canvas` (see `src/lib/rankCard.ts`) and sends it as a file attachment. The card shows the avatar, username, guild rank position, level, and an XP progress bar.

### ExtendedClient

`src/index.ts` casts the Discord.js `Client` to `ExtendedClient` (defined in `src/lib/types.ts`), which adds `commands: Collection<string, Command>` and `cooldowns: Collection<string, Collection<string, number>>`. All command/event files that need access to loaded commands receive this type.

### Database

`src/lib/prisma.ts` exports a single `PrismaClient` instance using the `@prisma/adapter-pg` driver adapter. The project uses Prisma v7, which requires a `prisma.config.ts` at the root (datasource URL for CLI tools) and generates the client to `src/generated/prisma/` rather than `node_modules/`.

After any change to `prisma/schema.prisma`, run `npm run db:generate` then either `db:push` (dev, no migration history) or `db:migrate` (named migration). Import the Prisma client from `src/lib/prisma.ts`, never from the generated path directly.

## Code style

No comments unless the reason behind something is genuinely non-obvious. Never add JSDoc blocks, section headers, or inline comments that describe what the code is doing — only write a comment if you would be explaining _why_.

## Environment variables

| Variable        | Required           | Purpose                                           |
| --------------- | ------------------ | ------------------------------------------------- |
| `DISCORD_TOKEN` | Yes                | Bot token                                         |
| `CLIENT_ID`     | Yes                | Application ID for command registration           |
| `OWNER_IDS`     | Yes                | Comma-separated user IDs with owner access        |
| `DATABASE_URL`  | Yes                | PostgreSQL connection string                      |
| `DEV_MODE`      | No                 | Set `true` to register commands to a single guild |
| `DEV_GUILD_ID`  | When DEV_MODE=true | Target guild for dev command registration         |
