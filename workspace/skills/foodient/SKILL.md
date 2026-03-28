---
name: foodient
description: Foodient - React Native mobile app with food detection
---

# Foodient

React Native mobile application for food detection.

## Links

- **GitHub (backend):** https://github.com/dadoedo/food-detection-api
- **GitHub (mobile):** https://github.com/dadoedo/food-detection-app
- **App Store / Play Store:** TODO

## Tech Stack

- Frontend: React Native
- Backend: TODO
- Database: PostgreSQL

## Infrastructure

TODO - David to fill in where backend/API is hosted

## Database Access

Connection string available as `$FOODIENT_DB_URL` environment variable.

```bash
# List tables
psql "$FOODIENT_DB_URL" -c "\dt"

# Explore schema
psql "$FOODIENT_DB_URL" -c "\d+ tablename"
```

## Key Tables

TODO - explore with `\dt` and update this section

## Common Tasks

TODO

## Common Issues

TODO
