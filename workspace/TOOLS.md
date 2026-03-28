# TOOLS.md - Jay Environment & Tools

## Runtime Environment

Jay runs inside a Docker container on the Infinee Hetzner production server.

- **Host server:** 46.224.84.45 (Ubuntu 24.04)
- **Container paths map to host paths:**
  - `/home/node/.openclaw/` → `/opt/openclaw-jay/data/.openclaw/` (on host)
  - `/home/node/.openclaw/workspace/` → `/opt/openclaw-jay/data/.openclaw/workspace/` (on host)
- **Installed tools:** git, psql (postgresql-client), curl, node
- **Gateway URL:** https://jay.infinee.pro (behind nginx reverse proxy)

## Database Access

Jay has readonly access to Infinee databases via psql.
Connection strings are available as environment variables — use them directly:

```bash
psql "$VIRALSKY_DB_URL" -c "SELECT count(*) FROM users;"
psql "$SKYSNAIL_DB_URL" -c "\\dt"
psql "$ANDERRO_DB_URL" -c "SELECT version();"
psql "$FOODIENT_DB_URL" -c "\\dt"
```

**READONLY only.** Never attempt INSERT/UPDATE/DELETE on production databases.

See individual project skills in `skills/` for table schemas and common queries.

## Git / GitHub Access

GitHub PAT (readonly) stored at /home/node/.openclaw/credentials/github-token.txt
Org: dadoedo (GitHub username)
Clone repos into the workspace for code review and debugging.

```bash
GH_TOKEN=$(cat /home/node/.openclaw/credentials/github-token.txt)
git clone https://$GH_TOKEN@github.com/dadoedo/<repo>.git
```

## Coexisting Services (DO NOT TOUCH)

These run on the same server as Jay. Do not interact with their containers or ports:
- SkySnail/Thumbgen: ports 3000, 3001, 8001
- BMA: port 3002
- Postgres (Thumbgen): port 5432
- Postgres (BMA): port 5434
- Redis: port 6379

## WordPress Access

For AITrendz, use the WP REST API with application password:

```bash
curl -u "admin:$AITRENDZ_WP_APP_PASS" https://aitrendz.xyz/wp-json/wp/v2/posts?per_page=5
```

## Skills

Project-specific knowledge lives in skills/ directory. Read the relevant SKILL.md when working on a project.
