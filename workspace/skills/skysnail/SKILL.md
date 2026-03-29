---
name: skysnail
description: SkySnail (Thumbgen) - AI-powered YouTube thumbnail generator at skysnail.io
---

# SkySnail (Thumbgen)

AI-powered SaaS tool for generating CTR-optimized YouTube thumbnails using Gemini AI.

## Links

- **Production URL:** https://skysnail.io
- **API:** https://api.skysnail.io
- **GitHub:** https://github.com/dadoedo/thumbgen

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | Next.js 16+ (App Router), React 19, Tailwind CSS 4 |
| Backend | Node.js, Express 5, TypeScript, Prisma ORM |
| Database | PostgreSQL 15 |
| Cache/Queue | Redis 7, BullMQ |
| Storage | AWS S3 (eu-north-1) |
| Auth | Google OAuth 2.0, Email/Password with JWT |
| Billing | Stripe (subscriptions + one-time credits) |
| AI - Images | Google Gemini API (gemini-3-pro-image-preview) |
| AI - Summaries | OpenAI API (gpt-4o-mini) |
| Transcripts | Python FastAPI microservice (yt-dlp, Whisper) |
| Emails | Brevo (transactional + marketing) |

## Infrastructure

- **Server:** Infinee Hetzner server (46.224.84.45, Ubuntu 24.04)
- **Ports:**
  - Frontend: 3000
  - Backend API: 3001
  - YT Transcript service: 8001
  - PostgreSQL: 5432
  - Redis: 6379
- **Reverse Proxy:** Nginx for skysnail.io → :3000, api.skysnail.io → :3001
- **Container orchestration:** Docker Compose with autoheal

## Database Access

Connection string: `$SKYSNAIL_DB_URL` environment variable

```bash
# List all tables
psql "$SKYSNAIL_DB_URL" -c "\dt"

# Show table schema
psql "$SKYSNAIL_DB_URL" -c "\d+ users"

# User count
psql "$SKYSNAIL_DB_URL" -c "SELECT count(*) FROM users;"

# Recent signups (last 10)
psql "$SKYSNAIL_DB_URL" -c "SELECT id, email, created_at, plan_type, credits FROM users ORDER BY created_at DESC LIMIT 10;"

# Active subscriptions
psql "$SKYSNAIL_DB_URL" -c "SELECT u.email, s.plan_type, s.status, s.current_period_end FROM subscriptions s JOIN users u ON s.user_id = u.id WHERE s.status = 'active' ORDER BY s.created_at DESC LIMIT 20;"

# Thumbnail generation stats (last 24h)
psql "$SKYSNAIL_DB_URL" -c "SELECT status, count(*) FROM thumbnails WHERE created_at > NOW() - INTERVAL '24 hours' GROUP BY status;"

# Failed jobs
psql "$SKYSNAIL_DB_URL" -c "SELECT id, user_id, title, created_at FROM thumbnails WHERE status = 'failed' ORDER BY created_at DESC LIMIT 10;"
```

## Database Schema (Key Tables)

### Core Tables

| Table | Purpose |
|-------|---------|
| `users` | User accounts (email, credits, plan_type, stripe_customer_id) |
| `projects` | User projects with YT link or transcript |
| `thumbnails` | Generated thumbnails (status: pending/done/failed) |
| `templates` | System templates for thumbnail generation |
| `avatars` | User-uploaded avatar images |
| `avatar_models` | Avatar model references for AI |
| `user_templates` | User's custom uploaded templates |
| `brand_kits` | User brand colors/fonts |

### Billing & Subscriptions

| Table | Purpose |
|-------|---------|
| `subscriptions` | Stripe subscriptions (creator_lite/creator/creator_premium) |
| `affiliate_partners` | Affiliate program partners |
| `affiliate_referrals` | Referral tracking (user → partner) |
| `affiliate_commissions` | Commission payouts |
| `affiliate_clicks` | Click tracking for referral links |

### Content & Communication

| Table | Purpose |
|-------|---------|
| `blog_posts` | AI-generated SEO blog articles |
| `scheduled_emails` | Email automation queue |
| `email_logs` | Sent email tracking |

## Credit System

- **1 credit = 1 generated thumbnail**
- **Edit = 1 credit**
- **Pricing:** $1 = 10 credits (one-time purchase)
- **Subscriptions include monthly credits:**
  - Creator Lite: 50 credits/month
  - Creator: 150 credits/month
  - Creator Premium: 500 credits/month

## Core Flows

### Thumbnail Generation Flow

1. User creates **Project** (YouTube link, transcript, or video upload)
2. User selects **Template** and optional **Avatar**
3. POST `/thumbnail/generate` → creates pending Thumbnail, enqueues BullMQ job
4. **Worker** processes job:
   - Fetches transcript (if YouTube link) via Python microservice
   - Generates summary via OpenAI (gpt-4o-mini)
   - Prepares template + avatar images as base64
   - Calls Gemini API with prompt
   - Uploads result to S3
   - Updates Thumbnail status to `done`
   - Deducts credits
5. Frontend polls GET `/project/:id` every 2s until complete

### Transcript Sources

- **YouTube link:** Python service calls yt-dlp → fetches captions or audio → Whisper transcription
- **Video upload:** Upload to S3 → Python service downloads → Whisper transcription
- **Manual:** User pastes transcript text directly

## API Endpoints

### Authentication
- `POST /api/auth/google` - Get Google OAuth URL
- `GET /api/auth/callback/google` - OAuth callback
- `POST /api/auth/register` - Email/password registration
- `POST /api/auth/login` - Email/password login
- `POST /api/auth/verify-email` - Email verification

### Projects
- `POST /api/project` - Create project
- `GET /api/project` - List user projects
- `GET /api/project/:id` - Get project with thumbnails
- `DELETE /api/project/:id` - Delete project
- `POST /api/project/:id/video-upload` - Upload video file

### Thumbnails
- `POST /api/thumbnail/generate` - Start generation
- `GET /api/thumbnail/:id/download` - Download full-size PNG
- `POST /api/thumbnail/:id/edit` - Edit with prompt

### Templates
- `GET /api/template` - List all templates
- `POST /api/template` - Create template (admin)
- `GET /api/user-template` - List user's custom templates
- `POST /api/user-template` - Upload custom template

### Billing
- `POST /api/billing/checkout` - Create Stripe checkout session
- `POST /api/billing/webhook` - Stripe webhook handler
- `GET /api/billing/portal` - Stripe customer portal URL

### Avatars
- `GET /api/avatar` - List user avatars
- `POST /api/avatar` - Upload avatar
- `DELETE /api/avatar/:id` - Delete avatar

## Backend Scripts

```bash
# Credit renewal (subscription billing cycle)
npm run renew-credits

# Blog generation
npm run blog:generate           # Generate and publish
npm run blog:generate-draft     # Generate as draft
npm run blog:generate-batch     # Generate 5 posts
npm run blog:list-published     # List published posts

# Email scripts
npm run send-feedback-email     # Send feedback request emails
npm run send-affiliate-activation  # Activate affiliate accounts

# Brevo list cleanup
npm run brevo:cleanup-list:dry     # Preview unverified users to remove
npm run brevo:cleanup-list:execute # Actually remove them
```

## YT Transcript Microservice (Python)

Port 8001, FastAPI-based service for video/transcript processing.

### Endpoints

- `POST /transcript/from-youtube` - Extract transcript from YouTube URL
- `POST /transcript/from-video` - Transcribe uploaded video (Whisper)
- `POST /title/from-youtube` - Get video title from YouTube URL
- `GET /health` - Health check

### Dependencies
- yt-dlp for YouTube downloads
- Whisper for transcription
- Supports cookies.txt for YouTube authentication

## Common Tasks

### Check user signups and activity
```bash
psql "$SKYSNAIL_DB_URL" -c "SELECT email, created_at, plan_type, credits FROM users WHERE created_at > NOW() - INTERVAL '7 days' ORDER BY created_at DESC;"
```

### Debug failed thumbnail generation
1. Check thumbnail status in DB
2. Check Redis queue: `redis-cli KEYS 'bull:thumbnail-generation:*'`
3. Check backend logs for job errors
4. Common issues: Gemini rate limits, S3 upload failures, transcript service down

### Monitor API health
```bash
curl https://api.skysnail.io/api/health
curl http://localhost:8001/health  # Transcript service
```

### Check subscription renewals
```bash
psql "$SKYSNAIL_DB_URL" -c "SELECT u.email, s.plan_type, s.current_period_end, s.last_credit_renewal FROM subscriptions s JOIN users u ON s.user_id = u.id WHERE s.status = 'active' AND s.current_period_end < NOW() + INTERVAL '3 days';"
```

## Common Issues

### Thumbnail generation fails with "Insufficient credits"
- Check user's credit balance: `SELECT credits FROM users WHERE id = '...'`
- Verify subscription is active

### YouTube transcript fetch fails
- Check if video has captions available
- Check cookies.txt validity (YouTube may require auth)
- Check proxy configuration if rate limited

### S3 signed URLs expired
- URLs valid for 1 hour
- Frontend polling refreshes URLs automatically

### Gemini API 429 errors
- Rate limit hit - worker has exponential backoff
- Check concurrency settings in worker (currently 2)

### Email not sending
- Check Brevo API key and quota
- Check email_logs table for errors
- Verify user.email_verified = true

## Environment Variables (Key)

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL connection string |
| `REDIS_HOST`, `REDIS_PASSWORD` | Redis connection |
| `GOOGLE_AI_API_KEY` | Gemini API key |
| `OPENAI_API_KEY` | OpenAI API key |
| `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` | Stripe keys |
| `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `S3_BUCKET_NAME` | S3 storage |
| `BREVO_API_KEY` | Email service |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | Google OAuth |
| `JWT_SECRET` | Auth token signing |
| `PY_YT_TRANSCRIPT_URL` | Python service URL (http://localhost:8001) |

## Deployment

Uses `build-and-deploy.sh` script:
1. Builds Docker images locally
2. Pushes to server via SSH
3. Runs docker-compose up

Key files:
- `docker-compose.yml` - Service definitions
- `backend/Dockerfile`, `frontend/Dockerfile`, `yt-transcript/Dockerfile`
- `infra/` - Nginx configs

## Monitoring Points

- **User signups:** Daily new registrations
- **Thumbnail generation:** Success rate, average generation time
- **Subscription MRR:** Active subscriptions × plan price
- **Credit usage:** Credits consumed per day
- **Failed jobs:** Monitor `thumbnails WHERE status = 'failed'`
- **Email deliverability:** Check Brevo dashboard + email_logs
