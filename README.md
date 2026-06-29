# HypnoBot

A Discord bot for the HypnoSpace server, built with Discord.js v14, TypeScript, Prisma v7, and PostgreSQL.

## Features

### Leveling
Members earn 15–25 XP per message (60-second cooldown). `/rank` generates a canvas-rendered rank card showing level, XP progress, and server position. `/leaderboard` lists the top members, with an optional live-updating leaderboard post in a configured channel. XP can be disabled per-role or per-channel, and admins can adjust levels directly with `/set-level`.

### Moderation
Full moderation stack: `/warn`, `/kick`, `/ban` (including temp-ban with auto-expiry), `/mute` (Discord timeout), `/unmute`, `/purge`, and `/lockdown` (server-wide or per-channel, with configurable exempt channels). Warnings accumulate against a threshold and can trigger an automatic permanent ban. All actions DM the target and post to a private mod log; a separate public mod log receives a redacted version without moderator identity.

### Suspension
`/suspend` strips all of a member's roles and applies a `Suspended` role (auto-created if missing). `/unsuspend` restores the original roles from the database. Useful for placing members in a restricted state without a full ban.

### Automod
Two independent systems run in parallel:

- **Join-time risk scoring** — runs on every new member and on membership screening completion. Scores members on signals (no avatar, new account, pattern-matching username, non-ASCII display name) plus configurable per-role risk factors set via `/automod`. Members exceeding the threshold are auto-suspended.
- **Message spam detection** — detects rapid flooding and cross-channel spam within a rolling window, applying a timeout automatically.

### Alias system
`/alias` manages two types of alias backed by the same `GuildAlias` model:
- **Reason shortcuts** (`warn`, `kick`, `ban`, `mute`) — short names that expand to full reason text inside any mod command.
- **Triggers** — keywords that, when typed as the first word of a message, delete the original and re-post a configured response with any @mentions forwarded.

### Welcome & goodbye
Configurable embed messages sent to designated channels when members join or leave. Both support placeholders: `{@user}`, `{username}`, `{displayname}`, `{membercount}`, `{server}`. Defaults are used when no custom message is set. Welcome messages are stored in the database and automatically deleted if the member leaves before a configured time.

### Member cleanup on leave
When a member leaves the bot deletes: the Discord system join message, the stored welcome message, their posts in the configured introduction channel, and their threads in any configured forum channels.

### Logging
Six independent log channels, all optional and toggled via `/config`:

| Channel | What it captures |
|---|---|
| Mod log | All moderation actions |
| Public mod log | Redacted mod actions (no moderator identity or warning ID) |
| Member log | Joins, leaves, nickname/role changes, timeouts |
| Message log | Edits and deletes (bot-initiated deletes are suppressed) |
| Server log | Channel and role create/update/delete |
| Voice log | Voice join, leave, and channel switches |

### AI content reporting
Members can flag messages as potentially AI-generated via `/report-ai` or a message context menu. Reports are aggregated and posted to a configured review channel for moderators to act on.

### Other
- **Join roles** — roles automatically assigned on member join
- **Role restore** — optionally restores roles when a member rejoins
- **Invite tracking** — caches invites to attribute which invite a new member used
- `/info` — account and server membership details for any user
- `/say` — posts a message as the bot to a specified channel

## Stack

| Layer | Technology |
|---|---|
| Runtime | Node.js 22, TypeScript via `tsx` |
| Discord | discord.js v14 |
| Database | PostgreSQL + Prisma v7 (`@prisma/adapter-pg`) |
| Image generation | `@napi-rs/canvas` |

## Deployment

See [DEPLOYMENT.md](DEPLOYMENT.md) for Docker Compose setup instructions.

## Development

See [CLAUDE.md](CLAUDE.md) for architecture details and the full command reference.
