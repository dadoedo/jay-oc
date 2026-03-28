---
name: viralsky
description: ViralSky - social media analytics platform hosted on Render
---

# ViralSky

Social media analytics and viral content tracking platform.

## Links

- **URL:** TODO
- **GitHub:** https://github.com/dadoedo/amber
- **Render dashboard:** TODO

## Tech Stack

TODO - David to fill in

## Infrastructure

- Hosted on Render (web service + managed Postgres)

## Database Access

Connection string available as `$VIRALSKY_DB_URL` environment variable.

```bash
# List tables
psql "$VIRALSKY_DB_URL" -c "\dt"

# Explore schema
psql "$VIRALSKY_DB_URL" -c "\d+ tablename"
```

## Key Tables

TODO - explore with `\dt` and update this section

## Common Tasks

TODO

## Common Issues

TODO
