# Local Development

## Prerequisites

- **Node.js 22+** — the bot runs directly from TypeScript source via `tsx`, no build step needed
- **PostgreSQL** — any locally accessible instance works (Docker is the easiest option)
- **A Discord application** with a bot token — create one at [discord.com/developers/applications](https://discord.com/developers/applications)

### Required Discord bot settings

In your application's Bot settings:

- Enable **Server Members Intent** and **Message Content Intent** under Privileged Gateway Intents
- Under OAuth2, invite the bot to your test server with the `bot` and `applications.commands` scopes and `Administrator` permissions (or scope down as needed)

## 1. Install dependencies

```bash
npm install
```

## 2. Configure environment

```bash
cp .env.example .env
```

Fill in `.env`:

```env
DISCORD_TOKEN=       # Bot token from the Discord Developer Portal
CLIENT_ID=           # Application ID (General Information → Application ID)
OWNER_IDS=           # Your Discord user ID — grants access to owner-only commands
DATABASE_URL=        # e.g. postgresql://postgres:password@localhost:5432/hypnobot
DEV_MODE=true        # Registers commands to a single guild for instant propagation
DEV_GUILD_ID=        # The ID of your test server
```

`STATUS_WEBHOOK_URL` is optional and can be left blank locally.

## 3. Set up the database

Create the database if it doesn't exist, then push the schema:

```bash
npm run db:push
```

If you want a named migration history instead:

```bash
npm run db:migrate
```

After any change to `prisma/schema.prisma`, run:

```bash
npm run db:generate   # regenerate the Prisma client
npm run db:push       # sync the schema to the DB
```

## 4. Register slash commands

Commands must be registered with Discord before the bot can receive them. With `DEV_MODE=true` they register only to `DEV_GUILD_ID` and propagate instantly:

```bash
npm run deploy
```

Re-run this whenever you add, remove, or rename a command. You do **not** need to re-run it on every restart.

## 5. Start the bot

```bash
npm run dev
```

This starts the bot with `tsx watch`, which automatically restarts on any file change.

## Useful commands

```bash
npm run build    # Type-check without running (catches TypeScript errors)
npm run deploy   # Re-register slash commands with Discord
```

## Tips

- Use a dedicated test server rather than the live HypnoSpace server so you can trigger joins, leaves, and mod actions freely.
- `DEV_MODE=true` is important during development — global command registration can take up to an hour to propagate, whereas guild-scoped registration is instant.
- The Prisma client is generated to `src/generated/prisma/` (not `node_modules/`). If you see type errors after a schema change, make sure you've run `npm run db:generate`.
