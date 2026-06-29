# Changelog

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
