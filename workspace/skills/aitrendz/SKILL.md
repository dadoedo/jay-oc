---
name: aitrendz
description: AITrendz.xyz - AI tools directory, digital products, blog content, and WooCommerce store management
---

# AITrendz

WordPress-based AI tools directory and content platform with WooCommerce store.

## Links

- **URL:** https://aitrendz.xyz
- **WordPress admin:** https://aitrendz.xyz/wp-admin
- **Shop:** https://aitrendz.xyz/shop/
- **Submit AI Link:** https://aitrendz.xyz/submit-ai-link/

## Tech Stack

- **CMS:** WordPress with Elementor
- **E-commerce:** WooCommerce
- **SEO:** Yoast SEO
- **Plugins:** JetPack, Complianz (GDPR), WPForms, RSS Feed aggregator

## Site Structure

### Content Types

| Section | URL Pattern | Description |
|---------|-------------|-------------|
| Homepage | `/` | Featured AI tools, categories, latest listings |
| AI Tool Directory | `/link-detail/{tool-slug}/` | Individual AI tool pages with descriptions, reviews, alternatives |
| Tool Categories | `/link-category/{category}/` | AI Audio Tools, AI Video Tools, AI Writing Tools, etc. |
| Blog | `/blog/` | Articles organized by categories |
| Shop | `/shop/` | Digital products (playbooks, ebooks) |
| Discounts | `/discounts/` | Affiliate discount codes |

### Blog Categories

- **AITrendz Newsletter** (ID: 255) - 23 posts
- **Guides** (ID: 241) - 9 posts  
- **Learn** (ID: 230) - 32 posts
- **Prompts** (ID: 728) - 12 posts
- **Stories** (ID: 234) - 13 posts

### Digital Products (WooCommerce)

- AI Newsletter subscription
- Top 20 AI Tools For 2026
- Social Media Growth Hacking Playbook
- Facebook Influencer Blueprint
- 100 Best Nano Banana Image Prompts
- JSON Video Prompting Blueprint

## API Access

### WordPress REST API

Use Application Password from `$AITRENDZ_WP_APP_PASS`:

```bash
# List recent posts
curl -s -u "admin:$AITRENDZ_WP_APP_PASS" \
  "https://aitrendz.xyz/wp-json/wp/v2/posts?per_page=5" | python3 -m json.tool

# Get specific post by ID
curl -s -u "admin:$AITRENDZ_WP_APP_PASS" \
  "https://aitrendz.xyz/wp-json/wp/v2/posts/49500" | python3 -m json.tool

# List pages
curl -s -u "admin:$AITRENDZ_WP_APP_PASS" \
  "https://aitrendz.xyz/wp-json/wp/v2/pages?per_page=10" | python3 -m json.tool

# List categories
curl -s "https://aitrendz.xyz/wp-json/wp/v2/categories?per_page=50" | python3 -m json.tool

# List tags
curl -s "https://aitrendz.xyz/wp-json/wp/v2/tags?per_page=50" | python3 -m json.tool

# List users
curl -s -u "admin:$AITRENDZ_WP_APP_PASS" \
  "https://aitrendz.xyz/wp-json/wp/v2/users" | python3 -m json.tool

# List media
curl -s -u "admin:$AITRENDZ_WP_APP_PASS" \
  "https://aitrendz.xyz/wp-json/wp/v2/media?per_page=10" | python3 -m json.tool
```

### Create Content

```bash
# Create a new post (draft)
curl -s -X POST -u "admin:$AITRENDZ_WP_APP_PASS" \
  "https://aitrendz.xyz/wp-json/wp/v2/posts" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Post Title Here",
    "content": "Post content with <strong>HTML</strong> formatting.",
    "status": "draft",
    "categories": [230],
    "tags": [233]
  }' | python3 -m json.tool

# Publish a draft (change status)
curl -s -X PUT -u "admin:$AITRENDZ_WP_APP_PASS" \
  "https://aitrendz.xyz/wp-json/wp/v2/posts/POST_ID" \
  -H "Content-Type: application/json" \
  -d '{"status": "publish"}' | python3 -m json.tool

# Update post content
curl -s -X PUT -u "admin:$AITRENDZ_WP_APP_PASS" \
  "https://aitrendz.xyz/wp-json/wp/v2/posts/POST_ID" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Updated Title",
    "content": "Updated content here"
  }' | python3 -m json.tool
```

### Upload Media

```bash
# Upload image
curl -s -X POST -u "admin:$AITRENDZ_WP_APP_PASS" \
  "https://aitrendz.xyz/wp-json/wp/v2/media" \
  -H "Content-Disposition: attachment; filename=image.png" \
  -H "Content-Type: image/png" \
  --data-binary @/path/to/image.png | python3 -m json.tool

# Set featured image on post
curl -s -X PUT -u "admin:$AITRENDZ_WP_APP_PASS" \
  "https://aitrendz.xyz/wp-json/wp/v2/posts/POST_ID" \
  -H "Content-Type: application/json" \
  -d '{"featured_media": MEDIA_ID}' | python3 -m json.tool
```

### WooCommerce API

WooCommerce requires separate API keys (Consumer Key + Secret), not the WordPress Application Password.

```bash
# Set WC credentials (if available)
export WC_KEY="ck_xxxxx"
export WC_SECRET="cs_xxxxx"

# List products
curl -s -u "$WC_KEY:$WC_SECRET" \
  "https://aitrendz.xyz/wp-json/wc/v3/products" | python3 -m json.tool

# List orders
curl -s -u "$WC_KEY:$WC_SECRET" \
  "https://aitrendz.xyz/wp-json/wc/v3/orders" | python3 -m json.tool

# Get product categories
curl -s -u "$WC_KEY:$WC_SECRET" \
  "https://aitrendz.xyz/wp-json/wc/v3/products/categories" | python3 -m json.tool
```

## Common Tasks

### Publishing Blog Content

1. **Create draft post:**
   ```bash
   curl -s -X POST -u "admin:$AITRENDZ_WP_APP_PASS" \
     "https://aitrendz.xyz/wp-json/wp/v2/posts" \
     -H "Content-Type: application/json" \
     -d '{
       "title": "My Article Title",
       "content": "Article content...",
       "status": "draft",
       "categories": [230]
     }'
   ```

2. **Review in WP admin:** https://aitrendz.xyz/wp-admin/edit.php

3. **Publish when ready:**
   ```bash
   curl -s -X PUT -u "admin:$AITRENDZ_WP_APP_PASS" \
     "https://aitrendz.xyz/wp-json/wp/v2/posts/POST_ID" \
     -H "Content-Type: application/json" \
     -d '{"status": "publish"}'
   ```

### Content Categories Quick Reference

| Category | ID | Use For |
|----------|-----|---------|
| Learn | 230 | Tutorials, how-tos |
| Guides | 241 | Step-by-step guides |
| Prompts | 728 | AI prompts, templates |
| Stories | 234 | Case studies, narratives |
| AITrendz Newsletter | 255 | Newsletter content |

### Search & Discovery

```bash
# Search posts
curl -s "https://aitrendz.xyz/wp-json/wp/v2/posts?search=chatgpt&per_page=10" | python3 -m json.tool

# Get posts by category
curl -s "https://aitrendz.xyz/wp-json/wp/v2/posts?categories=728&per_page=10" | python3 -m json.tool

# Get posts by tag
curl -s "https://aitrendz.xyz/wp-json/wp/v2/posts?tags=233&per_page=10" | python3 -m json.tool
```

### Site Health Check

```bash
# Check site info
curl -s "https://aitrendz.xyz/wp-json" | python3 -c "import json,sys; d=json.load(sys.stdin); print(f'Name: {d[\"name\"]}'); print(f'Description: {d[\"description\"]}'); print(f'URL: {d[\"url\"]}')"

# List available API namespaces
curl -s "https://aitrendz.xyz/wp-json" | python3 -c "import json,sys; d=json.load(sys.stdin); print('\\n'.join(d.get('namespaces', [])))"
```

## AI Tool Directory

The AI tool directory uses a custom post type with URL pattern `/link-detail/{tool-slug}/`. Each tool page includes:

- Tool name and description
- Visit Website link
- Category tags (AI SEO Tools, AI Video Tools, etc.)
- Social sharing buttons
- Related/Alternative tools carousel
- User reviews section

### Tool Categories (from homepage)

- AI Agents Tools
- AI Audio Tools
- AI Browser Extensions
- AI Business Tools
- AI Chatbots
- AI Content
- AI Detection Tools
- AI Education Tools
- AI Finance Tools
- AI HR
- AI Marketing Tools
- AI Mobile Apps
- AI models
- AI Productivity Tools
- AI Tool Aggregators
- AI Tools For Developers
- AI Video Tools
- AI Visual Art Tools
- AI Writing Tools
- ChatGPT Tools
- Lifestyle AI Tools
- Multifunctional AI Tools
- Open Source AI Tools

## Social Media

- **Twitter/X:** @AiTrendz
- **Instagram:** @aitrendz_xyz
- **YouTube:** /channel/UCDI1QTPzFvB-mQhvC2-CRrQ
- **TikTok:** @aitrendz.xyz
- **Facebook:** /AITrendz.xyz
- **LinkedIn:** /company/aitrendz
- **Discord:** /invite/HuyWbX9um8
- **Threads:** @aitrendz

## Related Projects

AITrendz promotes these related projects:

- **Anderro** - https://anderro.com
- **SkySnail** - Thumbnail generator
- **ViralSky** - Viral content tools
- **Foodient** - AI food sensitivity app
