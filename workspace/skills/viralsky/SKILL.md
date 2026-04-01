---
name: viralsky
description: ViralSky - AI-powered social media content generator at viralsky.io. Use stripe_analytics skill with project="viralsky" to view Stripe revenue data, MRR, churn, and top customers.
---

# ViralSky

AI-powered social media content generation platform. Users generate viral threads, images, news posts, and content ideas using multiple AI providers (Claude, OpenAI, Gemini, xAI, Perplexity). Includes a template library, community groups directory, image inspirations, blog, affiliate program, and a full admin panel.

## Links

- **URL:** https://viralsky.io
- **GitHub:** https://github.com/dadoedo/amber (repo name "amber", npm name "viralsky")
- **Local path:** `/home/david/PhpstormProjects/private/amber`

## Tech Stack

| Area | Tech |
|------|------|
| Runtime | Node.js, npm |
| Web app | Next.js 16 (App Router), React 19, standalone |
| Language | TypeScript 5.9 |
| Styling / UI | Tailwind CSS 3, @tailwindcss/typography, next-themes (dark default), Embla Carousel |
| Database | PostgreSQL (migrated from Neon → Hetzner self-hosted) |
| ORM | Prisma 6 (@prisma/client, @auth/prisma-adapter) |
| Auth | NextAuth.js 4 (JWT sessions), Google OAuth + Credentials (email/password) |
| Passwords | bcryptjs |
| Payments | Stripe (checkout, portal, webhooks; tiers: Pro, Ultra, Max) |
| Email | Brevo (@getbrevo/brevo) — transactional + scheduled template emails |
| Analytics | PostHog (EU proxy via next.config.js rewrites) |
| Affiliate tracking | Anderro (NEXT_PUBLIC_ANDERRO_PUBLIC_KEY, ANDERRO_SECRET_KEY) |
| AI - primary | Anthropic Claude (@anthropic-ai/sdk) — default provider with fallback chain |
| AI - fallback | OpenAI (openai), Google Gemini (@google/generative-ai, @google/genai), xAI |
| AI - news | Perplexity (search + content when API key present) |
| AI - images | OpenRouter (openrouter-image) |
| Images | sharp (processing) |
| Dev tools | dotenv, ts-node, puppeteer |

## Project Structure

```
amber/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── (auth)/             # Login, signup, select-plan, forgot/reset password
│   │   ├── (dashboard)/        # Sidebar layout: generate, templates, admin, affiliate, account
│   │   ├── affiliate/          # Public affiliate landing page
│   │   ├── blog/               # Blog listing + [slug] detail
│   │   ├── api/                # 68 API route handlers
│   │   ├── layout.tsx          # Root layout (theme, session, PostHog, Anderro, SEO)
│   │   ├── page.tsx            # Marketing homepage
│   │   └── sitemap.ts
│   ├── components/             # Navigation, Footer, Sidebar, generate UI, blog, analytics
│   ├── contexts/               # SidebarContext
│   ├── lib/                    # Shared utilities (NO src/utils/)
│   │   ├── ai/                 # AI providers: claude, openai, gemini, xai, perplexity, openrouter-image, providers, news-content
│   │   ├── seo/                # Metadata + JSON-LD helpers
│   │   ├── auth.ts             # NextAuth config (Google + Credentials + MASTER_PASSWORD bypass)
│   │   ├── auth-adapter.ts     # Custom Prisma adapter (case-insensitive email, OAuth linking)
│   │   ├── affiliate-auth.ts   # Separate affiliate portal auth (cookie-based)
│   │   ├── stripe.ts           # Stripe config
│   │   ├── credits.ts          # Credit system
│   │   ├── email.ts            # Brevo email sending + scheduling
│   │   ├── brevo.ts            # Brevo contacts/lists
│   │   ├── db.ts               # Prisma client
│   │   ├── blog.ts             # Blog data helpers
│   │   ├── admin.ts            # Admin helpers
│   │   ├── analytics.ts        # PostHog analytics
│   │   ├── anderro.ts          # Anderro integration
│   │   └── utils.ts            # cn(), addDays(), upload path helpers
│   └── types/
├── prisma/
│   ├── schema.prisma           # Database schema (21 models)
│   ├── seed.ts
│   └── migrations/             # gitignored — use db:push or private sync
├── deploy/
│   └── hetzner-db/             # Docker Compose for PostgreSQL 16 on Hetzner
├── scripts/                    # One-off migration/email scripts
├── docs/                       # Internal specs (affiliate, migration, news generator, etc.)
├── next.config.js              # Rewrites, CSP headers, PostHog proxy, images unoptimized
├── tailwind.config.ts
├── tsconfig.json               # Path alias @/* → ./src/*
└── package.json
```

## Infrastructure

- **Hosting:** The Next.js app runs (historically on Render, DB migrated to Hetzner self-hosted PostgreSQL 16)
- **DB Docker:** `deploy/hetzner-db/docker-compose.yml` — PostgreSQL 16 Alpine, user `viralsky`, DB `viralsky`, port 5433→5432
- **File uploads:** `/var/data/uploads` in production, `public/uploads` in dev; served via `/uploads/*` rewrite → `/api/uploads/*`
- **Cron jobs:** HTTP endpoints called externally (Render cron or similar):
  - `GET /api/cron/fetch-news-topics` — fetches trending news topics via Perplexity
  - `GET /api/cron/send-scheduled-emails` — sends due Brevo template emails
  - Both accept optional `?token=` matching `CRON_SECRET_TOKEN`

## Database Access

Connection string available as `$VIRALSKY_DB_URL` environment variable.

```bash
psql "$VIRALSKY_DB_URL" -c "\dt"
psql "$VIRALSKY_DB_URL" -c "\d+ tablename"
```

## Database Schema (21 models)

### Core / Auth

| Table | Purpose |
|-------|---------|
| `User` | id, name, email (unique), password (hashed, nullable for OAuth), isAdmin, timestamps |
| `Account` | NextAuth OAuth accounts: provider, providerAccountId, tokens; FK → User (cascade) |
| `Session` | NextAuth sessions: sessionToken, expires; FK → User (cascade) |
| `VerificationToken` | Email verification: identifier, token, expires |

### Subscription & Credits

| Table | Purpose |
|-------|---------|
| `Subscription` | 1:1 per user; stripeCustomerId, stripeSubscriptionId, status (default "trialing"), planType (monthly/annual), tier (pro/ultra/max), trialEndsAt, currentPeriodEnd; FK → User (cascade) |
| `UserCredits` | 1:1 per user; credits (int), lastResetAt; FK → User (cascade) |

### Content Generation

| Table | Purpose |
|-------|---------|
| `Generation` | AI-generated content; type (thread/image/video/audio), topic, aiProvider, model, outputFormat, outputContent, imagePath, imageUrl, cta (JSON), imageSize, writingStyle, isPinned; FK → User (cascade). Indexes: [userId,type], [type,createdAt] |
| `IdeaGeneration` | Generated content ideas; niche, nicheKey, ideas (string[]), fromCache, aiProvider, isPinned; FK → User (cascade). Indexes: [userId,createdAt], [nicheKey] |
| `NewsGenerationHistory` | Generated news posts; topic, sourceUrls (string[]), outputType, content, isPinned; FK → User (cascade). Indexes: [userId], [createdAt] |
| `NewsTopicCache` | Cached trending news topics; category, headline, summary, sourceUrls (string[]), fetchedAt. Indexes: [category], [fetchedAt] |

### Content Libraries (no user FK)

| Table | Purpose |
|-------|---------|
| `CommonTopic` | Suggested topics: text (unique), order |
| `TemplateLibrary` | Thread templates: category, title, description, content, imageUrl, examplePostUrl, order |
| `ImageInspiration` | Viral image examples: type (post/comment), title, category, description, comment, imagePath, preview, order |
| `CommunityGroupCategory` | Group categories: name (unique), icon, order |
| `CommunityGroup` | Community groups: name, members, url, type (default "facebook"), order; FK → CommunityGroupCategory (cascade) |

### Blog

| Table | Purpose |
|-------|---------|
| `BlogPost` | Blog articles: slug (unique), title, description, content (HTML), author, category, tags, keywords (string[]), image, readingTime, featured, published, SEO fields. Indexes: [slug], [published,publishedAt], [category], [featured] |

### Affiliate System

| Table | Purpose |
|-------|---------|
| `AffiliatePartner` | Affiliate accounts (separate auth): name, email, password (nullable, supports Google), googleId, referralCode (unique), commissionType, commissionPercentage. Indexes: [referralCode], [email], [googleId] |
| `AffiliateReferral` | Tracks user signups via affiliate link: affiliatePartnerId, userId, referralCode, cookieSetAt, userRegisteredAt, subscriptionStartDate, status (default "pending"). FK → AffiliatePartner + User (cascade) |
| `AffiliateCommission` | Commission records: amount (decimal), commissionType, planType, paymentNumber, periodStart, periodEnd, status (default "pending"). FK → AffiliatePartner + AffiliateReferral (cascade), → Subscription (SetNull) |
| `AffiliateClick` | Click tracking: referralCode, ipAddress, userAgent, isUnique. FK → AffiliatePartner (cascade). Index: [ipAddress,userAgent,referralCode] |

### Email

| Table | Purpose |
|-------|---------|
| `ScheduledEmail` | Queued emails: userId, email, templateId (Brevo), scheduledDate, status (pending/sent/failed), sentAt, error. FK → User (cascade). Indexes: [status,scheduledDate], [userId] |

## Auth System

- **Main app:** NextAuth 4 with JWT sessions
  - Providers: Google OAuth (optional if env set), Credentials (email/password with bcrypt)
  - `MASTER_PASSWORD` env var allows login as any user (dev/admin bypass)
  - Custom adapter: case-insensitive email matching, auto-links OAuth to existing email accounts
  - Config: `src/lib/auth.ts`, `src/lib/auth-adapter.ts`
- **Affiliate portal:** Separate cookie-based auth (`affiliate_session` cookie)
  - Supports email/password + Google login
  - Same `MASTER_PASSWORD` bypass
  - Config: `src/lib/affiliate-auth.ts`
- **Middleware** (`src/middleware.ts`): NextAuth `withAuth`; handles `?affiliate=` param → cookie + click tracking; exempts `/affiliate` paths from NextAuth; protects `/generate`, `/generate-image`, `/generate-news`, `/account`, `/subscription`, `/templates`, `/viral-images`, `/viral-comments`, `/image-inspirations`, `/admin`

## Key Routes

### Public / Marketing
`/`, `/blog`, `/blog/[slug]`, `/terms`, `/privacy`, `/affiliate` (landing), `/export-logo`

### Auth
`/login`, `/signup`, `/select-plan`, `/forgot-password`, `/reset-password`

### Dashboard (sidebar layout, auth required)
`/generate` — AI thread generation
`/generate-image` — AI image generation
`/generate-ideas` — Content idea generation
`/generate-news` — News-based content generation
`/generate-news/history` — News generation history
`/templates`, `/templates/[id]` — Template library
`/viral-images` — Viral image gallery
`/viral-comments` — Viral comment examples
`/image-inspirations` — Image inspiration gallery
`/community-groups` — Community groups directory
`/account` — Account settings
`/subscription`, `/subscription/success` — Subscription management

### Affiliate Portal (separate auth)
`/affiliate/register`, `/affiliate/login`, `/affiliate/dashboard`

### Admin (isAdmin required)
`/admin/dashboard` — Overview stats
`/admin/users`, `/admin/users/[id]` — User management
`/admin/affiliates`, `/admin/affiliates/[id]` — Affiliate management
`/admin/template-library` — Manage templates
`/admin/blog-posts` — Manage blog
`/admin/prompt-structure` — AI prompt configuration
`/admin/common-topics` — Manage suggested topics
`/admin/community-groups`, `/admin/community-groups/categories` — Manage groups
`/admin/image-inspirations` — Manage image inspirations

### API (68 route handlers)
Auth, account, Stripe (checkout/webhook/portal), subscription, credits, generation (thread/image/ideas/news), template library, common topics, community groups, image inspirations, blog, uploads, affiliate (register/login/dashboard/track-click/Google auth), admin CRUD, cron jobs, security alerts

## Stripe Integration

- **Tiers:** Pro, Ultra, Max (each with monthly + annual price IDs)
- **Flow:** `/api/stripe/checkout` → Stripe Checkout → `/subscription/success`; `/api/stripe/portal` for management
- **Webhook:** `/api/stripe/webhook` handles subscription events, updates `Subscription` table
- **Price IDs from env:** `STRIPE_PRO_MONTHLY_PRICE_ID`, `STRIPE_PRO_ANNUAL_PRICE_ID`, `STRIPE_ULTRA_MONTHLY_PRICE_ID`, `STRIPE_ULTRA_ANNUAL_PRICE_ID`, `STRIPE_MAX_MONTHLY_PRICE_ID`, `STRIPE_MAX_ANNUAL_PRICE_ID`

## Stripe Analytics

Use the `stripe_analytics` skill to view revenue data and debug customer issues for ViralSky:

### Dashboard & Analytics
```bash
/stripe-metrics viralsky                    # Default dashboard (30 days)
/stripe-metrics viralsky --churn            # Churn analysis
```

### Debug Specific Customer
```bash
# Lookup by customer ID
{"action": "customer", "project": "viralsky", "customer_id": "cus_xxx"}

# Lookup by email
{"action": "customer", "project": "viralsky", "email": "user@example.com"}

# Check subscription status
{"action": "subscription", "project": "viralsky", "subscription_id": "sub_xxx"}

# View customer invoices
{"action": "invoices", "project": "viralsky", "customer_id": "cus_xxx"}

# Raw Stripe API access
{"action": "raw", "project": "viralsky", "endpoint": "payment_intents", "params": {"customer": "cus_xxx"}}
```

### Available Actions
- `analytics` - Dashboard with MRR, churn, segments (default)
- `customer` - Full customer details + subscriptions + invoices + payment methods
- `subscription` - Subscription details + upcoming invoice
- `invoices` - Customer invoice history
- `events` - Stripe events for customer
- `raw` - Direct API access to any Stripe endpoint

Requires: `STRIPE_VIRALSKY_READ_KEY` environment variable (read-only key).

## AI Provider Chain

Default provider is **Claude** with automatic fallback: Claude → OpenAI → Gemini → xAI. Configured in `src/lib/ai/providers.ts`. Each provider in `src/lib/ai/`:
- `claude.ts` — Anthropic Claude (primary)
- `openai.ts` — OpenAI
- `gemini.ts` — Google Gemini
- `xai.ts` — xAI/Grok
- `perplexity.ts` — Perplexity (news search + content, when API key present)
- `openrouter-image.ts` — OpenRouter (image generation)
- `openai-news.ts` — OpenAI for news processing

## Email System (Brevo)

- **Transactional:** Welcome, subscription thank you, payment failed, trial ending, subscription canceled, password reset, affiliate welcome
- **Scheduled templates:** Follow-up email sequences created via `scheduleFollowUpEmails()`, processed by cron
- **Contact management:** Brevo lists (`BREVO_LIST_ID`, `BREVO_AFFILIATE_LIST_ID`)
- **Config:** `src/lib/email.ts`, `src/lib/brevo.ts`

## Environment Variables

### Required
- `DATABASE_URL` — PostgreSQL connection string
- `NEXTAUTH_URL`, `NEXTAUTH_SECRET` — NextAuth config
- `STRIPE_SECRET_KEY`, `STRIPE_PUBLISHABLE_KEY`, `STRIPE_WEBHOOK_SECRET` — Stripe
- `STRIPE_PRO_MONTHLY_PRICE_ID`, `STRIPE_PRO_ANNUAL_PRICE_ID` — Stripe Pro prices
- `STRIPE_ULTRA_MONTHLY_PRICE_ID`, `STRIPE_ULTRA_ANNUAL_PRICE_ID` — Stripe Ultra prices
- `STRIPE_MAX_MONTHLY_PRICE_ID`, `STRIPE_MAX_ANNUAL_PRICE_ID` — Stripe Max prices
- `ANTHROPIC_API_KEY` — Claude (primary AI)
- `BREVO_API_KEY` — Email

### Optional / Feature-specific
- `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` — Google OAuth
- `OPENAI_API_KEY` — OpenAI fallback
- `GOOGLE_AI_API_KEY` — Gemini fallback
- `XAI_API_KEY` — xAI fallback
- `PERPLEXITY_API_KEY` — News features
- `OPENROUTER_API_KEY` — Image generation
- `MASTER_PASSWORD` — Admin bypass for any user/affiliate login
- `CRON_SECRET_TOKEN` — Auth for cron endpoints
- `BREVO_SENDER_EMAIL` — Custom sender
- `BREVO_LIST_ID`, `BREVO_AFFILIATE_LIST_ID` — Brevo contact lists
- `NEXT_PUBLIC_POSTHOG_KEY` — PostHog analytics
- `NEXT_PUBLIC_ANDERRO_PUBLIC_KEY`, `ANDERRO_SECRET_KEY` — Anderro affiliate tracking
- `NEXT_PUBLIC_NEXTAUTH_URL` — Used in admin for absolute URLs
- `NEXT_PUBLIC_BASE_URL` — Used in scripts

## Development Commands

```bash
npm run dev              # Next.js dev server
npm run build            # Production build
npm run start            # Production server
npm run db:generate      # Prisma generate client
npm run db:push          # Push schema to DB (dev)
npm run db:migrate       # Run migrations
npm run db:studio        # Prisma Studio GUI
npm run db:seed          # Seed database (prisma/seed.ts)
npm run backfill:emails  # Run email backfill script
```

## Common Queries

```sql
-- User count
SELECT count(*) FROM "User";

-- Recent signups
SELECT id, name, email, "isAdmin", "createdAt" FROM "User" ORDER BY "createdAt" DESC LIMIT 20;

-- Active subscriptions by tier
SELECT tier, status, count(*) FROM "Subscription" GROUP BY tier, status ORDER BY tier;

-- Generation stats by type
SELECT type, count(*) FROM "Generation" GROUP BY type;

-- Recent generations
SELECT g.type, g.topic, g."aiProvider", g."createdAt", u.email
FROM "Generation" g JOIN "User" u ON g."userId" = u.id
ORDER BY g."createdAt" DESC LIMIT 20;

-- Affiliate overview
SELECT name, email, "referralCode", "commissionPercentage", "isActive"
FROM "AffiliatePartner" ORDER BY "createdAt" DESC;

-- Affiliate referrals with status
SELECT ap.name AS affiliate, u.email AS user, ar.status, ar."createdAt"
FROM "AffiliateReferral" ar
JOIN "AffiliatePartner" ap ON ar."affiliatePartnerId" = ap.id
JOIN "User" u ON ar."userId" = u.id
ORDER BY ar."createdAt" DESC LIMIT 20;

-- Pending commissions
SELECT ac.amount, ac.status, ap.name AS affiliate
FROM "AffiliateCommission" ac
JOIN "AffiliatePartner" ap ON ac."affiliatePartnerId" = ap.id
WHERE ac.status = 'pending';

-- Blog posts
SELECT slug, title, category, published, "publishedAt" FROM "BlogPost" ORDER BY "publishedAt" DESC LIMIT 10;

-- Scheduled emails pending
SELECT se.email, se."templateId", se."scheduledDate", se.status
FROM "ScheduledEmail" se WHERE se.status = 'pending' ORDER BY se."scheduledDate" LIMIT 20;

-- Credit balances
SELECT u.email, uc.credits, uc."lastResetAt"
FROM "UserCredits" uc JOIN "User" u ON uc."userId" = u.id
ORDER BY uc.credits DESC LIMIT 20;
```

## Common Issues

- **Prisma migrations not in git:** The `/prisma/migrations` folder is gitignored. After clone, use `npx prisma db push` to sync schema, or get migrations privately. Some schema changes were applied via `db push` rather than formal migrations.
- **README inaccuracies:** README says "NextAuth v5" and "Next.js 14+" but actual deps are NextAuth 4.x and Next 16. Trust `package.json` over README.
- **Images unoptimized:** `next.config.js` sets `images.unoptimized: true` — images are not processed by Next.js Image Optimization.
- **Uploads path:** Production expects `/var/data/uploads` directory. Dev uses `public/uploads`. The `/uploads/*` URL rewrite routes through `/api/uploads/*` API handler.
- **NEXT_PUBLIC_* env vars:** Baked at build time. Changing them requires a rebuild.
- **AI provider failures:** The system has a fallback chain (Claude → OpenAI → Gemini → xAI). If the primary fails, check all API keys are set and valid.
- **Affiliate auth is separate:** Affiliate portal uses cookie-based auth (`affiliate_session`), completely independent from NextAuth. Don't confuse the two systems.
