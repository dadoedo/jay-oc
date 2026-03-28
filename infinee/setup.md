# OpenClaw Jay - Infinee Setup

## Overview

Jay is the OpenClaw AI assistant for Infinee, running on the Hetzner production server.

- **URL:** https://jay.infinee.pro
- **URL s tokenom:** https://jay.infinee.pro/#token=6becb298fe9ee163e4c9f93949e42795700af3df716161526a9bef722b25c1a5
- **Gateway port:** 18789 (loopback only, behind nginx)
- **Server:** 46.224.84.45 (hetzner-prod)
- **OS:** Ubuntu 24.04.3 LTS, 4 cores, 7.6GB RAM
- **Install path:** `/opt/openclaw-jay/`
- **Data path:** `/opt/openclaw-jay/data/.openclaw/`
- **Workspace:** `/opt/openclaw-jay/data/.openclaw/workspace/`

## What's Done

- [x] OpenClaw repo cloned to `/opt/openclaw-jay/`
- [x] Docker image built (`openclaw:local`) with `postgresql-client` baked in
- [x] `.env` with generated gateway token and keyring password
- [x] `docker-compose.override.yml` with psql build arg and `--allow-unconfigured`
- [x] `openclaw.json` with token auth, timezone, allowedOrigins
- [x] Gateway running and healthy
- [x] Nginx reverse proxy with WebSocket support
- [x] SSL certificate (Let's Encrypt, auto-renews, expires 2026-06-21)
- [x] DNS A record: jay.infinee.pro -> 46.224.84.45
- [x] Onboarding completed (Kimi model provider, Discord bot token)
- [x] Device pairing approved for David's browser

## What's Left

- [ ] Workspace identity files (SOUL.md, IDENTITY.md, USER.md, TOOLS.md)
- [ ] Skills per project (Anderro, ViralSky, SkySnail, Foodient)
- [ ] GitHub PAT (readonly) for repo access
- [ ] Readonly DB users for all 4 app databases

## GitHub PAT – ako vytvoriť a pridať

**Účel:** Jay potrebuje readonly prístup k Infinee repozitárom (SkySnail, ViralSky, Anderro, Foodient).

### 1. Vytvor PAT na GitHube

1. Otvor **GitHub** → **Settings** → **Developer settings** → **Personal access tokens** → **Tokens (classic)**  
   URL: https://github.com/settings/tokens  
2. Klikni **Generate new token** → **Generate new token (classic)**.
3. Nastav:
   - **Note:** `OpenClaw Jay (Infinee, readonly)`
   - **Expiration:** 90 days (alebo No expiration)
   - **Scopes:** zaškrtni len **`repo`** (pre privátne repos; pre len public repos stačí `public_repo`)
4. **Generate token** – token zobrazí len raz, skopíruj ho.

### 2. Pridaj PAT do OpenClaw

Na serveri:

```bash
ssh hetzner-prod
cd /opt/openclaw-jay
```

**A) Integrácie v config** – do `openclaw.json` alebo hlavného configu doplniť:

```yaml
integrations:
  github:
    enabled: true
    token: "ghp_tvoj_novy_token"
    defaultOwner: "tvoj-github-username"
    defaultRepo: "SkySnail"  # prípadne iný default
    repositories:
      - "org/SkySnail"
      - "org/ViralSky"
      - "org/Anderro"
      - "org/Foodient"
```

**B) TOOLS.md** (ak používaš skill github-pat) – do workspace súboru `/opt/openclaw-jay/data/.openclaw/workspace/TOOLS.md` pridať sekciu:

```markdown
### GitHub

Token: ghp_tvoj_novy_token
```

Config editácia: `docker compose run --rm openclaw-cli config edit`

### 3. Nainštaluj GitHub skill (voliteľné)

```bash
docker compose run --rm openclaw-cli skill install github
# prípadne: npx playbooks add skill openclaw/skills --skill github-pat
```

### 4. Kam ďalej

Po pridaní PAT skontroluj v Jay, či dokáže klonovať/čítať repozitáre (SkySnail, ViralSky, Anderro, Foodient).
- [ ] Discord: verify bot is working in #openclaw channel
- [ ] Test full conversation flow

## Architecture

```
Internet
  │
  ├── Browser ──► nginx (443/SSL) ──► 127.0.0.1:18789 ──► Docker: OpenClaw Gateway
  │                jay.infinee.pro
  │
  └── Discord ◄──────────────────────► Docker: OpenClaw Gateway (bot API)
```

Existing apps on the same server (DO NOT TOUCH):
- SkySnail/Thumbgen: ports 3000, 3001, 8001 + Postgres 5432 + Redis 6379
- BMA: port 3002 + Postgres 5434

## Files on Server

| File | Purpose |
|------|---------|
| `/opt/openclaw-jay/.env` | Docker env vars (token, paths, timezone) |
| `/opt/openclaw-jay/docker-compose.override.yml` | Custom overrides (psql, --allow-unconfigured) |
| `/opt/openclaw-jay/data/.openclaw/openclaw.json` | OpenClaw gateway config |
| `/opt/openclaw-jay/data/.openclaw/workspace/` | Agent workspace (SOUL.md, skills, memory) |
| `/etc/nginx/sites-enabled/openclaw-jay` | Nginx reverse proxy config |
| `/etc/letsencrypt/live/jay.infinee.pro/` | SSL certificates |

## Credentials (DO NOT COMMIT)

- Gateway token: stored in `.env` on server
- Discord bot token: stored in OpenClaw config on server
- Kimi API key: stored in OpenClaw config on server
- See `info.txt` for Discord app details

## Infinee Apps (Jay should have access to all)

1. **SkySnail (Thumbgen)** - same Hetzner server, Postgres on port 5432
2. **ViralSky** - hosted on Render
3. **Anderro** - separate Hetzner server
4. **Foodient** - React Native app
