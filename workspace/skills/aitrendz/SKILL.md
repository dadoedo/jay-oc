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
curl -s -u "Zapierik:$AITRENDZ_WP_APP_PASS" \
  "https://aitrendz.xyz/wp-json/wp/v2/posts?per_page=5" | python3 -m json.tool

# Get specific post by ID
curl -s -u "Zapierik:$AITRENDZ_WP_APP_PASS" \
  "https://aitrendz.xyz/wp-json/wp/v2/posts/49500" | python3 -m json.tool

# List pages
curl -s -u "Zapierik:$AITRENDZ_WP_APP_PASS" \
  "https://aitrendz.xyz/wp-json/wp/v2/pages?per_page=10" | python3 -m json.tool

# List categories
curl -s "https://aitrendz.xyz/wp-json/wp/v2/categories?per_page=50" | python3 -m json.tool

# List tags
curl -s "https://aitrendz.xyz/wp-json/wp/v2/tags?per_page=50" | python3 -m json.tool

# List users
curl -s -u "Zapierik:$AITRENDZ_WP_APP_PASS" \
  "https://aitrendz.xyz/wp-json/wp/v2/users" | python3 -m json.tool

# List media
curl -s -u "Zapierik:$AITRENDZ_WP_APP_PASS" \
  "https://aitrendz.xyz/wp-json/wp/v2/media?per_page=10" | python3 -m json.tool
```

### Create Content

```bash
# Create a new post (draft)
curl -s -X POST -u "Zapierik:$AITRENDZ_WP_APP_PASS" \
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
curl -s -X PUT -u "Zapierik:$AITRENDZ_WP_APP_PASS" \
  "https://aitrendz.xyz/wp-json/wp/v2/posts/POST_ID" \
  -H "Content-Type: application/json" \
  -d '{"status": "publish"}' | python3 -m json.tool

# Update post content
curl -s -X PUT -u "Zapierik:$AITRENDZ_WP_APP_PASS" \
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
curl -s -X POST -u "Zapierik:$AITRENDZ_WP_APP_PASS" \
  "https://aitrendz.xyz/wp-json/wp/v2/media" \
  -H "Content-Disposition: attachment; filename=image.png" \
  -H "Content-Type: image/png" \
  --data-binary @/path/to/image.png | python3 -m json.tool

# Set featured image on post
curl -s -X PUT -u "Zapierik:$AITRENDZ_WP_APP_PASS" \
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
   curl -s -X POST -u "Zapierik:$AITRENDZ_WP_APP_PASS" \
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
   curl -s -X PUT -u "Zapierik:$AITRENDZ_WP_APP_PASS" \
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

AI tools are stored as **WooCommerce products** (`post_type=product`) and accessed via the WooCommerce REST API. Each tool is assigned to categories like "AI Agents Tools", "AI Video Tools", etc.

### WooCommerce API Access

Use Application Password from `$AITRENDZ_WP_APP_PASS` with username `Zapierik`:

```bash
# List all AI tools (products)
curl -s -u "Zapierik:$AITRENDZ_WP_APP_PASS" \
  "https://aitrendz.xyz/wp-json/wc/v3/products?per_page=20" | python3 -m json.tool

# Get AI tools by category (e.g., AI Agents Tools = ID 393)
curl -s -u "Zapierik:$AITRENDZ_WP_APP_PASS" \
  "https://aitrendz.xyz/wp-json/wc/v3/products?category=393&per_page=20" | python3 -m json.tool

# Get newest AI tools (sorted by date)
curl -s -u "Zapierik:$AITRENDZ_WP_APP_PASS" \
  "https://aitrendz.xyz/wp-json/wc/v3/products?category=393&orderby=date&order=desc&per_page=10" | python3 -m json.tool

# Get specific product by ID
curl -s -u "Zapierik:$AITRENDZ_WP_APP_PASS" \
  "https://aitrendz.xyz/wp-json/wc/v3/products/49525" | python3 -m json.tool
```

### AI Tool Category IDs

| Category | ID | Description |
|----------|-----|-------------|
| AI Agents Tools | 393 | Autonomous AI agents |
| AI Audio Tools | 394 | Audio generation/editing |
| AI Business Tools | 395 | Business automation |
| AI Chatbots | 396 | Conversational AI |
| AI Content | 397 | Content creation |
| AI Marketing Tools | 398 | Marketing automation |
| AI Video Tools | 399 | Video generation/editing |
| AI Writing Tools | 400 | Writing assistants |
| AI Tools For Developers | 401 | Developer tools |
| AI Mobile Apps | 402 | Mobile AI applications |

### List All Categories

```bash
curl -s -u "Zapierik:$AITRENDZ_WP_APP_PASS" \
  "https://aitrendz.xyz/wp-json/wc/v3/products/categories?per_page=50" | python3 -m json.tool
```

### Tool Page Structure

Each tool page (`/link-detail/{tool-slug}/`) includes:
- Tool name and description
- Visit Website link
- Category tags
- Social sharing buttons
- Related/Alternative tools carousel
- User reviews section
- JSON-LD metadata with `datePublished` and `dateModified`

## Social Media

- **Twitter/X:** @AiTrendz
- **Instagram:** @aitrendz_xyz
- **YouTube:** /channel/UCDI1QTPzFvB-mQhvC2-CRrQ
- **TikTok:** @aitrendz.xyz
- **Facebook:** /AITrendz.xyz
- **LinkedIn:** /company/aitrendz
- **Discord:** /invite/HuyWbX9um8
- **Threads:** @aitrendz

## Adding New AI Tools

### Category-Specific Rules (From René)

**For Games Category:**
- Must be browser-based web apps (no downloads required)
- Verify games work directly in browser before adding
- Examples: CrazyGames, Addicting Games, Armor Games, Kongregate, Poki, Miniclip, Y8, Newgrounds, itch.io, Cool Math Games, Agar.io, Slither.io, Paper.io, 2048, Tetris, GeoGuessr, Little Alchemy 2, Shell Shockers, Krunker.io
- Remove any games that require downloads (Steam, Epic, etc.)

**For Ebooks/Audiobooks Category:**
- Must offer free content (not just paid)
- Include mix of ebooks and audiobooks
- Verify content is legally available

### Workflow for Creating New Tool Entries

**Important Rules:**
- Use only **1 category** per tool (most specific one)
- Never use em dashes (—) in descriptions
- Add paragraph spacing after every 2-3 sentences
- Always include a screenshot of the tool website
- **USE BATCH/PARALLEL APPROACH** for multiple tools (see below)

### Batch Approach for Multiple Tools (CRITICAL)

When adding 3+ tools, use this optimized workflow:

**Step 1: Create all JSON files first (parallel writing)**
```bash
# Create all JSON files before any API calls
# Write descriptions in batch mode without submitting
```

**Step 2: Submit all products in parallel**
```bash
# Submit all products simultaneously using background processes
curl ... -d @tool1.json &
curl ... -d @tool2.json &
curl ... -d @tool3.json &
wait
```

**Step 3: Get all screenshots in parallel**
```bash
# Fetch all screenshots simultaneously
curl microlink1 &
curl microlink2 &
curl microlink3 &
wait
```

**Step 4: Upload all images in batch**
```bash
# Upload all images and attach to products
for id in ID1 ID2 ID3; do
  upload &
done
wait
```

**Why batch approach:**
- **10x faster** than sequential processing
- Parallel API calls, screenshots, and uploads
- 9 tools in ~20 minutes vs 8+ hours sequentially
- Only notify user AFTER all screenshots are attached

1. **Check if tool already exists:**
   ```bash
   curl -s -u "Zapierik:$AITRENDZ_WP_APP_PASS" \
     "https://aitrendz.xyz/wp-json/wc/v3/products?search=ToolName&per_page=10"
   ```

2. **Create the product:**
   ```bash
   curl -s -X POST -u "Zapierik:$AITRENDZ_WP_APP_PASS" \
     "https://aitrendz.xyz/wp-json/wc/v3/products" \
     -H "Content-Type: application/json" \
     -d '{
       "name": "ToolName",
       "slug": "toolname",
       "type": "external",
       "status": "publish",
       "catalog_visibility": "visible",
       "description": "<p>Full description with features, use cases, and benefits. Add spacing every 2-3 sentences.</p>",
       "short_description": "<p>One-line summary for listings. No em dashes.</p>",
       "external_url": "https://toolwebsite.com/",
       "categories": [{"id": CATEGORY_ID}],
       "tags": [{"name": "Tag1"}, {"name": "Tag2"}]
     }'
   ```

3. **Get screenshot via Microlink API:**
   ```bash
   # Get actual website screenshot (NEVER use placeholders)
   screenshot_url=$(curl -s "https://api.microlink.io/?url=https://toolwebsite.com/&screenshot=true&meta=false" | python3 -c "import json,sys; d=json.load(sys.stdin); print(d.get('data',{}).get('screenshot',{}).get('url',''))")
   
   # Download screenshot
   curl -s -o "/tmp/toolname.png" "$screenshot_url"
   
   # Upload to WordPress
   curl -s -X POST -u "Zapierik:$AITRENDZ_WP_APP_PASS" \
     "https://aitrendz.xyz/wp-json/wp/v2/media" \
     -H "Content-Disposition: attachment; filename=toolname.png" \
     -H "Content-Type: image/png" \
     --data-binary @/tmp/toolname.png
   ```

4. **Attach image to product:**
   ```bash
   curl -s -X PUT -u "Zapierik:$AITRENDZ_WP_APP_PASS" \
     "https://aitrendz.xyz/wp-json/wc/v3/products/PRODUCT_ID" \
     -H "Content-Type: application/json" \
     -d '{"images": [{"id": MEDIA_ID}]}'
   ```

### SEO/AEO Guidelines for Tool Descriptions (From René)

- **Long description:** 800-1500 characters (not words) for optimal SEO
- **Each sentence must bring new information** - no duplicate content or filler
- **No artificial word count inflation** - every sentence must be relevant and informative
- **Focus on SEO-optimized text** so page links can be easily discovered in search and AI engines
- **Short description:** 1 sentence maximum
- **Categories:** Only 1 category (most specific one)
- **Tags:** 3-5 relevant keywords
- **External URL:** Direct link to tool website
- **Image:** Screenshot of actual website via Microlink API - never placeholders
- **Content structure:** What the platform is, key features, popular examples, unique value proposition, user experience, technical details

### Formatting Rules (CRITICAL - From René)

- **NO em dashes** (—) anywhere in content - use hyphens (-) instead
- **Paragraph spacing** after every 2-3 sentences for readability
- **Only 1 category** per tool (plus parent "Free Entertainment" if applicable)
- **Always include screenshot** of actual website via Microlink API - never use placeholders or colored images
- **English only** - all content must be in English
- **No technical details** when speaking to René (executive/marketing focus)
- **Never create new categories** unless explicitly asked by user
- **Short description:** 1 sentence maximum
- **External URL:** Use direct link to tool website (no redirects)
- **Yoast SEO:** Must populate "Focus keyphrase" with exact tool name
- **Language requirement:** English-only websites for AITrendz entries

### Example: Base44 (Created 2026-03-30)

**Categories:** AI Coding Tools (98), AI Tools For Developers (459)  
**Tags:** No-Code, App Builder, AI Development, Full-Stack, MVP  
**URL:** https://aitrendz.xyz/link-detail/base44/  
**Product ID:** 49557

## René's Rules Summary (CRITICAL)

When working with AITrendz content, follow these rules established by René:

### Content Rules
1. **English only** - All content must be in English
2. **No technical details** when speaking to René (executive/marketing focus)
3. **Never create new categories** unless explicitly asked

### Formatting Rules
4. **NO em dashes** (—) - use hyphens (-) instead
5. **Paragraph spacing** after every 2-3 sentences
6. **Only 1 category** per tool (plus parent if applicable)
7. **Short description:** 1 sentence maximum

### SEO Rules
8. **Long description:** 800-1500 characters (not words)
9. **Each sentence brings new information** - no duplicates
10. **No artificial word count inflation** - relevant info only
11. **Focus on SEO-optimized text** for search and AI discovery
12. **Yoast SEO:** Focus keyphrase = exact tool name

### Image Rules
13. **Screenshot mandatory** - use Microlink API for actual website screenshots
14. **Never use placeholders** or colored images
15. **English-only websites** for AITrendz entries

### URL Rules
16. **External URL:** Direct link to tool website (no redirects)

## Related Projects

AITrendz promotes these related projects:

- **Anderro** - https://anderro.com
- **SkySnail** - Thumbnail generator
- **ViralSky** - Viral content tools
- **Foodient** - AI food sensitivity app
