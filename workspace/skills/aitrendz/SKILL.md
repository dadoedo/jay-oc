---
name: aitrendz
description: AITrendz.xyz - WordPress site about AI trends, tools directory, featured listings
---

# AITrendz

WordPress website covering AI trends, with a tools directory and featured placement options.

## Links

- **URL:** https://aitrendz.xyz
- **WordPress admin:** https://aitrendz.xyz/wp-admin

## Tech Stack

- CMS: WordPress
- Hosting: TODO - where is it hosted?

## API Access

Use the WP REST API with the application password from `$AITRENDZ_WP_APP_PASS`:

```bash
# List recent posts
curl -s -u "admin:$AITRENDZ_WP_APP_PASS" \
  "https://aitrendz.xyz/wp-json/wp/v2/posts?per_page=5" | python3 -m json.tool

# List pages
curl -s -u "admin:$AITRENDZ_WP_APP_PASS" \
  "https://aitrendz.xyz/wp-json/wp/v2/pages?per_page=10" | python3 -m json.tool

# List users
curl -s -u "admin:$AITRENDZ_WP_APP_PASS" \
  "https://aitrendz.xyz/wp-json/wp/v2/users" | python3 -m json.tool

# List categories
curl -s "https://aitrendz.xyz/wp-json/wp/v2/categories?per_page=50" | python3 -m json.tool
```

## Content

- AI trends and news articles
- Tools directory (listings of AI tools)
- Featured/promoted listings

## Common Tasks

- Publishing articles
- Managing tool listings
- Updating featured placements
- Checking site health via REST API
