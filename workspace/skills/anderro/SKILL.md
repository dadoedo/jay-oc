---
name: anderro
description: Anderro - SaaS affiliate/partner platform (anderro.com). Use stripe_analytics skill with project="anderro" to view Stripe revenue data, MRR, churn, and top customers.
---

# Anderro

SaaS affiliate and partner management platform. Businesses list their SaaS products, affiliates join via partnerships, and the system tracks clicks, signups, payments, computes commissions, and handles payouts via Stripe Connect.

## Links

- **URL:** https://anderro.com
- **Tracking:** https://track.anderro.com
- **GitHub:** https://github.com/dadoedo/anderro

**GitHub API (OpenClaws):** `GITHUB_PAT_TOKEN` in the workspace `.env` has access to `dadoedo/anderro` (Anderro). Use for GitHub API, PRs, or automation from this environment.

## Tech Stack

| Area | Tech |
|------|------|
| Runtime | Node.js ≥ 20, npm workspaces |
| Web app | Next.js 16 (App Router), React 19, standalone output |
| Styling / UI | Tailwind CSS 4, Radix UI, shadcn/ui, Framer Motion, Lucide icons |
| Forms | react-hook-form + Zod |
| Rich text | TipTap |
| Charts | Recharts |
| Database | PostgreSQL 16 |
| ORM | Drizzle ORM + drizzle-kit |
| Auth | NextAuth v5 (JWT sessions), @auth/drizzle-adapter |
| Passwords | bcryptjs, optional TOTP 2FA (otpauth + qrcode) |
| Email | Resend |
| Payments | Stripe (Connect for payouts, Billing for subscriptions + LTD) |
| Tracking service | Fastify + BullMQ + ioredis (Redis queue) |
| Analytics | PostHog |
| Error tracking | Sentry (@sentry/nextjs) |
| Sanitization | isomorphic-dompurify |

## Monorepo Structure

```
anderro/
├── apps/
│   ├── web/           # Next.js app (dashboards, marketing, APIs)
│   └── tracking/      # Fastify microservice (port 4000), BullMQ worker
├── packages/
│   ├── db/            # Drizzle schema, migrations, seeds (@anderro/db)
│   ├── shared/        # Constants: plans, LTD, tracking, rate limits, achievements (@anderro/shared)
│   └── wordpress-plugin/  # WP plugin for integration
├── nginx/             # Nginx configs (anderro.com, track.anderro.com)
├── scripts/
│   └── deploy.sh      # Build + deploy script
├── docker-compose.yml      # Local dev (Postgres :5450, Redis :6380)
└── docker-compose.prod.yml # Production
```

## Infrastructure

- Hosted on a **dedicated Hetzner server** (NOT the same as Jay)
- SSH alias: `anderro-prod` (configurable via `DEPLOY_SSH_HOST`)
- Remote path: `/opt/anderro`
- Nginx reverse proxy: `anderro.com` → web (:3000), `track.anderro.com` → tracking (:4000)
- Docker Compose in production: Postgres + Redis on 127.0.0.1, web + tracking containers
- Uploads directory: `/opt/anderro/uploads` (UID 1001 = nextjs user in container)

## Database Access

Connection string available as `$ANDERRO_DB_URL` environment variable.

```bash
psql "$ANDERRO_DB_URL" -c "\dt"
psql "$ANDERRO_DB_URL" -c "\d+ tablename"
```

## Database Schema (22 tables)

### Core

| Table | Purpose |
|-------|---------|
| `users` | email, password_hash, role (business/affiliate/admin/pending), TOTP fields, soft delete |
| `accounts` | OAuth link rows (NextAuth adapter) |
| `sessions` | DB sessions (NextAuth adapter) |
| `verification_tokens` | Email verification tokens |
| `password_reset_tokens` | Forgot-password flow |

### Business

| Table | Purpose |
|-------|---------|
| `businesses` | Per-user business entity; Stripe Connect + Billing fields, plan/subscription, onboarding step |
| `saas_products` | Program per business: URLs, commission config, cookie window, attribution model, approval mode, auto_tracking, payout settings, public/secret API keys, samcart_webhook_token, join page branding, marketplace visibility, slug |

### Affiliates

| Table | Purpose |
|-------|---------|
| `affiliate_profiles` | Global affiliate profile per user (bio, website, slug, leaderboard visibility) |
| `partnerships` | Affiliate ↔ SaaS link: referral_code, status (pending/active/rejected/removed), terms acceptance |
| `invite_links` | Invite codes for programs (optional email, expiry) |

### Tracking & Revenue

| Table | Purpose |
|-------|---------|
| `tracking_events` | click/signup/payment events: visitor_id, customer_email, amount_cents, IP, user_agent |
| `commissions` | Per-event commission: amount_cents, status (pending/approved/paid/rejected), hold_until |
| `payouts` | Batch payouts: amount_cents, status, stripe_transfer_id |
| `daily_stats` | Daily aggregates per SaaS: clicks, signups, conversions, revenue, commissions, active affiliates |

### Gamification

| Table | Purpose |
|-------|---------|
| `achievements` | Per affiliate × SaaS achievements (unique on affiliate + saas + achievement_id) |

### Assets

| Table | Purpose |
|-------|---------|
| `assets` | File library per SaaS product (name, URL, thumbnail, type, category, size) |

### Legal

| Table | Purpose |
|-------|---------|
| `legal_documents` | Versioned legal docs: terms, privacy, DPA, affiliate contract, vendor agreement |
| `legal_acceptances` | User acceptance records with IP + user agent |

### Email

| Table | Purpose |
|-------|---------|
| `email_preferences` | Per-user toggles: onboarding, tips, digest, milestones, marketing, reminders |
| `scheduled_emails` | Scheduled/sent emails with template_key, category, status, metadata |
| `unsubscribe_tokens` | One-click unsubscribe tokens per category |

### Audit

| Table | Purpose |
|-------|---------|
| `audit_events` | Typed audit log: partnerships, payouts, Stripe, billing, security events; actor_id, target, metadata |

### Key Enums

- `user_role`: business, affiliate, admin, pending
- `commission_type`: percentage, fixed
- `attribution_model`: first_click, last_click
- `approval_mode`: automatic, manual
- `partnership_status`: pending, active, rejected, removed
- `event_type`: click, signup, payment
- `commission_status`: pending, approved, paid, rejected
- `payout_status`: pending, approved, processing, completed, failed
- `audit_event_type`: 22 event types (partnership_*, payout_*, stripe_*, saas_*, subscription_*, etc.)
- `email_category`: transactional, onboarding, tips, digest, milestones, marketing, reminders
- `legal_document_type`: terms, privacy, gdpr_dpa, affiliate_contract, vendor_agreement

## Auth System

- **NextAuth v5** with JWT sessions (`maxAge` from shared constants)
- **Providers:** Google, GitHub (optional), Credentials (email/password + optional TOTP)
- OAuth creates users with role `pending` until onboarding
- **Middleware:** Edge JWT check on all routes except public paths. Public: `/`, `/pricing`, `/auth/*`, `/invite/*`, `/join/*`, `/explore/*`, `/saas/*`, `/marketer/*`, legal pages, and all `/api/*` (APIs do their own auth). Non-public routes redirect to `/auth/login?callbackUrl=...`
- Optional `AUTH_MASTER_PASSWORD` for dev impersonation (not for prod)

## Key Routes

### Marketing / Public
`/`, `/pricing`, `/explore/saas`, `/explore/affiliates`, `/saas/[slug]`, `/affiliate/[slug]`, `/marketer/[slug]`

### Auth
`/auth/login`, `/auth/register`, `/auth/select-role`, `/auth/signout`, `/auth/forgot-password`, `/auth/reset-password`

### Onboarding
`/business/onboarding`

### Business Dashboard (`/business/...`)
Dashboard, SaaS CRUD + settings/integrations/billing, assets, affiliates, payouts, settings

### Affiliate Dashboard (`/affiliate/...`)
Dashboard, programs, browse, assets, links, payouts, leaderboard, settings

### Admin (`/admin/...`)
Overview, businesses, affiliates, SaaS, audit, simulator, docs

### API (67+ route handlers)
NextAuth, Stripe Connect/callback/webhooks, billing checkout/webhook/portal, cron jobs (digests, emails, aggregate-stats, cleanup, process-payouts), SamCart webhooks, WordPress plugin, affiliate/business CRUD, legal, email preferences, TOTP, password flows

## External Integrations

- **Stripe Connect:** Affiliate payouts via transfers
- **Stripe Billing:** Business subscriptions (Starter/Pro/Max plans + LTD tiers)
- **Resend:** Transactional and lifecycle emails

## Stripe Analytics

Use the `stripe_analytics` skill to view revenue data and debug customer issues for Anderro:

### Dashboard & Analytics
```bash
/stripe-metrics anderro                    # Default dashboard (30 days)
/stripe-metrics anderro --churn            # Churn analysis
```

### Debug Specific Customer
```bash
# Lookup by customer ID
{"action": "customer", "project": "anderro", "customer_id": "cus_xxx"}

# Lookup by email
{"action": "customer", "project": "anderro", "email": "user@example.com"}

# Check subscription status
{"action": "subscription", "project": "anderro", "subscription_id": "sub_xxx"}

# View customer invoices
{"action": "invoices", "project": "anderro", "customer_id": "cus_xxx"}

# Raw Stripe API access
{"action": "raw", "project": "anderro", "endpoint": "payment_intents", "params": {"customer": "cus_xxx"}}
```

### Available Actions
- `analytics` - Dashboard with MRR, churn, segments (default)
- `customer` - Full customer details + subscriptions + invoices + payment methods
- `subscription` - Subscription details + upcoming invoice
- `invoices` - Customer invoice history
- `events` - Stripe events for customer
- `raw` - Direct API access to any Stripe endpoint

Requires: `STRIPE_ANDERRO_READ_KEY` environment variable (read-only key).
- **SamCart:** Webhook integration per SaaS product
- **WordPress:** Plugin for tracking integration
- **PostHog:** Product analytics (build-time keys)
- **Sentry:** Error monitoring
- **Google / GitHub:** OAuth providers

## Business Plans

Defined in `@anderro/shared`: **Starter**, **Pro**, **Max** subscription plans with billing intervals, plus **LTD** (lifetime deal) tiers. Features include cookie window limits, hold periods, and achievement definitions.

## Development Commands

```bash
npm run dev              # Next.js dev (apps/web)
npm run dev:tracking     # Tracking app dev
npm run build            # Production build web
npm run build:tracking   # Build tracking service
npm run db:generate      # Drizzle generate migrations
npm run db:migrate       # Run migrations
npm run db:push          # Drizzle push (dev)
npm run db:studio        # Drizzle Studio
npm run db:seed          # Seed database
```

## Deploy

```bash
./scripts/deploy.sh           # Build + deploy all (web + tracking)
./scripts/deploy.sh web       # Deploy only web
./scripts/deploy.sh tracking  # Deploy only tracking
./scripts/deploy.sh migrate   # Run DB migrations only
```

Builds Docker images locally, compresses + uploads via SCP, loads on server, restarts containers via `docker compose`, reloads Nginx, runs health checks.

## Local Development

```bash
docker compose up -d     # Postgres on :5450, Redis on :6380
npm run db:push          # Push schema to local DB
npm run db:seed          # Seed data
npm run dev              # Start web app
npm run dev:tracking     # Start tracking service (separate terminal)
```

Local Postgres password: `anderro`, port `5450`. Local Redis port: `6380`.

## Common Queries

```sql
-- User count by role
SELECT role, count(*) FROM users WHERE deleted_at IS NULL GROUP BY role;

-- Active businesses with plan info
SELECT b.name, b.plan, b.plan_status, u.email
FROM businesses b JOIN users u ON b.user_id = u.id
WHERE b.deleted_at IS NULL;

-- SaaS products overview
SELECT name, slug, commission_type, commission_value, marketplace_visible
FROM saas_products WHERE deleted_at IS NULL;

-- Recent tracking events
SELECT event_type, count(*) FROM tracking_events
WHERE created_at > NOW() - INTERVAL '7 days'
GROUP BY event_type;

-- Pending payouts
SELECT p.amount_cents, p.status, b.name as business
FROM payouts p JOIN businesses b ON p.business_id = b.id
WHERE p.status = 'pending';

-- Commission summary
SELECT status, count(*), sum(amount_cents) FROM commissions GROUP BY status;
```

## Common Issues

- **NEXT_PUBLIC_* vars not working in prod:** These are baked at build time. The deploy script sources `.env.local` and passes them as `--build-arg`. If values look like localhost, it defaults to `https://anderro.com`.
- **Uploads permission error:** The uploads dir must be owned by UID 1001 (nextjs user in container). Deploy script handles this.
- **Tracking service not processing:** Check Redis connectivity and BullMQ worker status (`npm run start:worker` in tracking app).
