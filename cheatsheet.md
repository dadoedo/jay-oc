# OpenClaw Jay - Cheatsheet

All commands run via SSH on the Hetzner server.

```bash
ssh hetzner-prod
cd /opt/openclaw-jay
```

## Gateway Management

```bash
# Start gateway
docker compose up -d openclaw-gateway

# Stop gateway
docker compose down

# Restart gateway
docker compose restart openclaw-gateway

# View logs (live)
docker compose logs -f openclaw-gateway

# View last 50 lines
docker compose logs --tail=50 openclaw-gateway

# Check container status
docker ps --filter name=openclaw-jay

# Health check
curl -fsS http://127.0.0.1:18789/healthz
```

## CLI Commands

All CLI commands use `docker compose run --rm openclaw-cli` prefix.

```bash
# Gateway status
docker compose run --rm openclaw-cli gateway status

# Full health check
docker compose run --rm openclaw-cli health

# Get dashboard URL with token
docker compose run --rm openclaw-cli dashboard --no-open

# View config
docker compose run --rm openclaw-cli config get

# Edit config (interactive)
docker compose run --rm openclaw-cli config edit

# Re-run setup wizard
docker compose run --rm openclaw-cli configure
```

## Device Pairing

When a new browser connects, it needs approval.

```bash
# List all devices (pending + paired)
docker compose run --rm openclaw-cli devices list

# Approve a pending device
docker compose run --rm openclaw-cli devices approve <requestId>

# Revoke a paired device
docker compose run --rm openclaw-cli devices revoke --device <deviceId> --role operator
```

## Channels (Discord)

```bash
# List channels
docker compose run --rm openclaw-cli channels list

# Add Discord bot
docker compose run --rm openclaw-cli channels add --channel discord --token "<bot-token>"

# Channel status
docker compose run --rm openclaw-cli channels status
```

## Updating OpenClaw

```bash
cd /opt/openclaw-jay
git pull
docker compose build openclaw-gateway
docker compose up -d openclaw-gateway
```

## Config File Locations

```bash
# OpenClaw config (gateway, auth, model provider)
nano /opt/openclaw-jay/data/.openclaw/openclaw.json

# Docker env vars
nano /opt/openclaw-jay/.env

# Docker compose overrides
nano /opt/openclaw-jay/docker-compose.override.yml

# Nginx config
nano /etc/nginx/sites-enabled/openclaw-jay

# Workspace files (SOUL.md, skills, etc.)
ls /opt/openclaw-jay/data/.openclaw/workspace/
```

## Useful URLs

- **Control UI:** https://jay.infinee.pro
- **Health check:** https://jay.infinee.pro/healthz
- **Docs:** https://docs.openclaw.ai
