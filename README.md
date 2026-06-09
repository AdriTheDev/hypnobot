# HypnoBot Discord Bot

## Deployment

### Prerequisites

- Docker
- A PostgreSQL database
- A Discord application with a bot token

### Setup

The image is hosted in a private GitHub Container Registry package. Authenticate with a personal access token (PAT) with `read:packages` scope before pulling:

```bash
echo YOUR_PAT | docker login ghcr.io -u YOUR_GITHUB_USERNAME --password-stdin
```

Create the directory and place the files there:

```bash
sudo mkdir -p /opt/hypnobot
cd /opt/hypnobot
```

Copy `docker-compose.yml` and create a `.env` file alongside it with your values (see `.env.example`), then run:

```bash
docker compose up -d
```

> **Note:** Before the first run, register slash commands with Discord by running `npm run deploy` locally with `CLIENT_ID` and `DISCORD_TOKEN` set in your environment.
