# jay-oc

OpenClaw "Jay" configuration for Infinee. Contains workspace files (skills, identity, tools) and deploy tooling.

**Production:** https://jay.infinee.pro  
**Server:** 46.224.84.45 (hetzner-prod), `/opt/openclaw-jay/`

## Structure

```
workspace/              → synced to /opt/openclaw-jay/data/.openclaw/workspace/
  AGENTS.md             - workspace conventions
  SOUL.md               - Jay's identity
  TOOLS.md              - available tools and DB access
  HEARTBEAT.md          - periodic task config
  skills/
    aitrendz/SKILL.md   - AITrendz WordPress site
    anderro/SKILL.md    - Anderro project
    foodient/SKILL.md   - Foodient mobile app
    skysnail/SKILL.md   - SkySnail/Thumbgen
    viralsky/SKILL.md   - ViralSky analytics

docker-compose.override.yml  → synced to /opt/openclaw-jay/
deploy.sh                    - deploy script
.env.example                 - template for server .env
```

## Deploy

```bash
# Preview what will change
./deploy.sh --dry-run

# Deploy workspace files + docker-compose override
./deploy.sh

# Deploy and restart gateway
./deploy.sh --restart
```

## What's NOT in this repo

- OpenClaw upstream code (cloned separately on server)
- `.env` with actual credentials
- `openclaw.json` (gateway config with tokens)
- `memory/` and `MEMORY.md` (Jay's runtime memory, lives on server only)
- `USER.md` and `BOOTSTRAP.md` (created during onboarding)

## Quick Reference

See `cheatsheet.md` for SSH commands, `infinee/setup.md` for full deployment docs.
