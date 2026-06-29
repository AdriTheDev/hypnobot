# Deployment

HypnoBot is deployed as a Docker container. The image is published to a private GitHub Container Registry package on every push to `main`.

## Prerequisites

- Docker with the Compose plugin (`docker compose`)
- A PostgreSQL database (external — not bundled)
- A Discord application with a bot token and the required intents enabled

## 1. Authenticate with the container registry

The image is private. Authenticate with a GitHub personal access token (PAT) that has `read:packages` scope:

```bash
echo YOUR_PAT | docker login ghcr.io -u YOUR_GITHUB_USERNAME --password-stdin
```

## 2. Create the deployment directory

```bash
sudo mkdir -p /opt/hypnobot
cd /opt/hypnobot
```

## 3. Add docker-compose.yml

Copy or create `docker-compose.yml`:

```yaml
services:
    bot:
        image: ghcr.io/adrithedev/hypnobot:latest
        restart: unless-stopped
        environment:
            DISCORD_TOKEN: ${DISCORD_TOKEN}
            CLIENT_ID: ${CLIENT_ID}
            OWNER_IDS: ${OWNER_IDS}
            DEV_MODE: false
            DATABASE_URL: ${DATABASE_URL}
            STATUS_WEBHOOK_URL: ${STATUS_WEBHOOK_URL}
```

## 4. Create .env

Create a `.env` file in the same directory:

```env
DISCORD_TOKEN=your_bot_token
CLIENT_ID=your_application_id
OWNER_IDS=comma,separated,user,ids
DATABASE_URL=postgresql://user:password@host:5432/hypnobot
STATUS_WEBHOOK_URL=https://discord.com/api/webhooks/...
```

`STATUS_WEBHOOK_URL` is optional — omit it if you don't want startup/shutdown notifications.

## 5. Register slash commands

Slash commands must be registered with Discord before the bot can receive them. Do this once after the initial deploy and again whenever commands are added, removed, or renamed:

```bash
DISCORD_TOKEN=your_bot_token CLIENT_ID=your_application_id npm run deploy
```

Or if you have a local `.env`:

```bash
npm run deploy
```

> This step requires Node.js and the project dependencies installed locally (`npm install`). It only needs to be run when the command list changes, not on every restart.

## 6. Start the bot

```bash
docker compose up -d
```

Pull the latest image and restart:

```bash
docker compose pull && docker compose up -d
```

View logs:

```bash
docker compose logs -f
```

## Database

The bot expects an existing PostgreSQL database. The schema is managed with Prisma — apply it before the first run:

```bash
DATABASE_URL=postgresql://... npx prisma db push
```

Or with a migration history:

```bash
DATABASE_URL=postgresql://... npx prisma migrate deploy
```

Re-run `db push` / `migrate deploy` after any schema change before restarting the container.

## Updates

The image tag `latest` always points to the most recent build from `main`. To update:

```bash
docker compose pull
docker compose up -d
```

If the schema changed in the update, run `prisma migrate deploy` (or `db push`) against your database before restarting.
