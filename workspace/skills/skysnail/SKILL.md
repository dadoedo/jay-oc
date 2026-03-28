---
name: skysnail
description: SkySnail (Thumbgen) - YouTube thumbnail generator at skysnail.io
---

# SkySnail (Thumbgen)

YouTube thumbnail generator and optimization tool.

## Links

- **URL:** https://skysnail.io
- **API:** https://api.skysnail.io
- **GitHub:** https://github.com/dadoedo/thumbgen

## Tech Stack

- Frontend: Next.js (port 3000)
- Backend: Node.js API (port 3001)
- YT Transcript service: Python (port 8001)
- Database: PostgreSQL 15
- Cache: Redis 7

## Infrastructure

- Hosted on Infinee Hetzner server (same server as Jay)
- Nginx reverse proxy for skysnail.io and api.skysnail.io

## Database Access

Connection string available as `$SKYSNAIL_DB_URL` environment variable.

```bash
# List tables
psql "$SKYSNAIL_DB_URL" -c "\dt"

# Quick user count
psql "$SKYSNAIL_DB_URL" -c "SELECT count(*) FROM users;"

# Recent signups
psql "$SKYSNAIL_DB_URL" -c "SELECT id, email, created_at FROM users ORDER BY created_at DESC LIMIT 10;"
```

## Key Tables

TODO - explore with `\dt` and `\d+ tablename` and update this section

## Common Tasks

- Check user signups and activity
- Debug thumbnail generation issues (check logs + DB)
- Monitor API health

## Common Issues

TODO - document frequent issues as they come up
