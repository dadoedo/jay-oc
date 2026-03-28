---
name: anderro
description: Anderro - hosted on separate Hetzner server
---

# Anderro

## Links

- **URL:** TODO
- **GitHub:** https://github.com/dadoedo/anderro

## Tech Stack

TODO - David to fill in

## Infrastructure

- Hosted on separate Hetzner server (NOT the same as Jay)

## Database Access

Connection string available as `$ANDERRO_DB_URL` environment variable.

```bash
# List tables
psql "$ANDERRO_DB_URL" -c "\dt"

# Explore schema
psql "$ANDERRO_DB_URL" -c "\d+ tablename"
```

## Key Tables

TODO - explore with `\dt` and update this section

## Common Tasks

TODO

## Common Issues

TODO
