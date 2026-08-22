# Changelog

## [1.5.7] — 2026-08-22

### Added
- `/membercount` — shows the server's total, human, and bot member counts

### Removed
- Minecraft whitelist integration — `/whitelist`, RCON mirroring of moderation actions (ban/kick/suspend/unban/unsuspend), and the `MinecraftWhitelist` table have been removed, along with the `rcon-client` dependency and `MC_RCON_*` environment variables

---

## [1.5.6] — 2026-07-16

### Added
- Bot baiting — a configurable trap channel/message (`/config bot-bait-channel`) that auto-bans anyone who posts in it or reacts to the warning message, with a running "bots baited" counter shown in the message footer
- JoinGuard — new or suspicious joiners (based on risk score or account age) are automatically assigned configurable roles on join (`/config join-guard-role add/remove`)

### Changed
- Consolidated scheduler and utility modules internally (suspension/ban expiry pollers merged into `punishmentSchedulers.ts`, presence/status/webhook logic merged into `botStatus.ts`, invite caching and bot-deleted-message tracking consolidated)
- Deploy workflow fixes

### Fixed
- Minor bug fixes across moderation and logging

---

## [1.5.5] — 2026-07-13

### Added
- Meow Counter (`/meow board`, `/meow user`) — tracks meow-like words said in the server with a paginated leaderboard (words/users) and per-user stats

### Fixed
- Minor bug fixes

---

## [1.5.4] — 2026-07-06

### Changed
- Moderation commands refactored to share logic via a new `applyPunishment`/`reversePunishment` module (`src/lib/moderationActions.ts`), replacing duplicated per-command logic across ban, kick, mute, suspend, unban, unmute, unsuspend, and warn
- Voice channels created via join-to-create now receive a message listing the `/vc` manager subcommands when the channel is created

### Fixed
- Timeout duration no longer exceeds Discord's max timeout when muting

---

## [1.5.3] — 2026-07-03

### Added
- Join-to-create voice channels (`/config join-to-create`) — members joining a trigger VC get their own channel, managed via `/vc name/user_limit/manager/lock/unlock/kick/ban/unban/ghost/unghost`
- Moderating a member with a linked Minecraft whitelist entry (ban, kick, suspend, unban, unsuspend) now mirrors the action to the Minecraft server via RCON

### Changed
- `/alt` moved from the Moderation category to Admin; `/report-ai` moved from Moderation to Utility

### Fixed
- Docker Compose and Node version fixes; added a connection timeout to RCON

---

## [1.5.2] — 2026-06-29

### Added
- Temporary suspension durations — `/suspend` now accepts a `duration` option (default 7d) and auto-restores roles when it expires via an in-memory scheduler
- Alt account linking — `/alt link/unlink/list` lets moderators associate accounts so that ban, kick, mute, warn, and suspend automatically apply to all linked alts
- Minecraft whitelist self-service — `/whitelist add <username>` lets members whitelist their own Java Edition account via RCON; `/whitelist remove @user` and `/whitelist list` are mod-only

---

## [1.5.1] — 2026-06-29

### Fixed
- AI report scheduler not correctly processing pending reports on startup

---

## [1.5.0] — 2026-06-25

### Added
- Automod risk-point system (`/automod role add/remove`) — automatically suspends new members who score above a threshold based on account age, avatar, username patterns, and configurable role factors
- AI-assisted content reporting (`/report-ai`) — members can flag messages for AI review; moderators vote to confirm or dismiss via buttons, with a scheduled checker for stale reports
- XP is now deleted when a member is banned or permanently leaves
- `/purge-xp` admin command to wipe a member's XP
- `guildMemberUpdate` handler triggers automod on screening pass
- Timeout changes are now logged via `guildMemberUpdate`

### Changed
- Command handler refactored to load categories dynamically
- Deploy script updated to skip `deleted` commands and handle subcommand groups correctly

---

## [1.3.4] — 2026-06-15

### Added
- XP-enabled toggle and per-guild no-XP roles/channels (configurable via `/config`)
- `/purge` now supports filtering by user
- `/warn` now shows warnings remaining before auto-ban in the DM
- Unban logging event (`guildBanRemove`)
- Bulk message delete logging (`messageDeleteBulk`)
- Role restoration on rejoin — roles are saved on leave and restored when the member returns (opt-in via `/config`)
- `/note` command for storing internal staff notes on members

### Fixed
- Member cleanup on leave now correctly handles forum thread deletion
- Trigger aliases now support `\n` for multi-line responses

---

## [1.2.5] — 2026-06-03

### Added
- Autocomplete on moderation commands (ban, kick, mute, warn) using guild-scoped reason aliases
- Message trigger aliases — first-word triggers delete the original message and re-send the alias value
- Bot presence set on startup

### Changed
- Upgraded all packages to ESM
- Aliases are now guild-scoped rather than global; the `type` field distinguishes reason shortcuts from message triggers

### Fixed
- PluralKit proxied message deletion no longer generates spurious log entries
- Ban command now deletes recent messages on ban

---

## [1.2.1] — 2026-06-02

### Added
- Public mod log channel — mod embeds are re-posted without moderator/warning ID fields
- Voice state change logging
- Audit-log attribution for bans and kicks not initiated by the bot

### Fixed
- Leaderboard pagination and rank display
- Fonts loading correctly in rank card generation
- Various database and filtering bugs from initial release

---

## [1.0.0] — 2026-05-29

### Added
- Core bot framework: auto-loading command and event handlers, `ExtendedClient` with commands and cooldowns collections
- Leveling system: XP grant (15–25 per message, 60s cooldown), `xpForLevel` formula, `/rank` card generated with `@napi-rs/canvas`, `/leaderboard`
- Moderation suite: `/ban` (temp + permanent), `/kick`, `/mute` (Discord timeout), `/unmute`, `/warn` (with auto-ban at 4 warnings), `/purge`, `/lock`, `/unlock`, `/lockdown`, `/suspend`, `/unsuspend`
- Admin tools: `/config`, `/view-config`, `/alias`, `/set-level`
- Utility: `/info`, `/warnings`, `/ping`, `/help`
- Welcome and goodbye messages with `{@user}`, `{username}`, `{membercount}`, `{server}` placeholders
- Member cleanup on leave: deletes system join message, stored welcome message, intro posts, and forum threads
- Temp ban scheduler that persists across restarts via the `TempBan` table
- Full Prisma v7 schema with PostgreSQL via `@prisma/adapter-pg`
- Docker setup, GitHub Actions build and deploy workflows
