---
name: foodient
description: Foodient - AI-powered food detection mobile app for allergen and sensitivity tracking. Use stripe_analytics skill with project="foodient" to view Stripe revenue data, MRR, churn, and top customers.
---

# Foodient

AI-powered mobile application that helps users identify allergens and food sensitivities through photo/barcode scanning. Built for people with food allergies, intolerances, and dietary restrictions.

## Links

- **Website:** https://www.foodient.app
- **GitHub (backend):** https://github.com/dadoedo/food-detection-api
- **GitHub (mobile):** https://github.com/dadoedo/food-detection-app
- **App Store:** [TODO]
- **Play Store:** [TODO]

---

## Tech Stack Overview

### Backend (food-detection-api)

| Component | Technology |
|-----------|------------|
| Runtime | Node.js |
| Framework | Express 5 |
| Database | PostgreSQL |
| Auth | JWT + bcrypt, express-session |
| AI Providers | Anthropic Claude (default), OpenAI, Google Gemini, xAI |
| Email | Brevo |
| OAuth | Google, Apple Sign-In |
| In-App Purchases | Apple App Store Server Library, Google Play |
| Scheduling | node-cron |

### Mobile App (food-detection-app)

| Component | Technology |
|-----------|------------|
| Framework | React Native 0.81.4 + Expo SDK 54 |
| Language | TypeScript (strict) |
| Navigation | Expo Router (file-based) |
| UI | react-native-paper |
| Camera | react-native-vision-camera |
| State | React Context (no Redux) |
| IAP | react-native-iap |
| OAuth | Google Sign-In, Apple Sign-In |

---

## Infrastructure

- **Backend hosting:** [TODO - David to confirm]
- **Database:** PostgreSQL (connection via `$FOODIENT_DB_URL`)
- **Static assets:** `/var/data/images` (production)

### Database Access

```bash
# List tables
psql "$FOODIENT_DB_URL" -c "\dt"

# Explore specific table
psql "$FOODIENT_DB_URL" -c "\d+ users"

# Active subscriptions count
psql "$FOODIENT_DB_URL" -c "SELECT status, COUNT(*) FROM user_subscriptions GROUP BY status;"
```

---

## Database Schema (Key Tables)

### Users & Auth
- **`users`** — email, password_hash, OAuth fields, email verification, subscription_required_after
- **`refresh_tokens`** — JWT refresh rotation
- **`user_oauth_accounts`** — linked Google/Apple accounts
- **`user_sessions`** — express-session storage (PostgreSQL)

### Subscriptions & Billing
- **`user_subscriptions`** — active subscription per user (Apple/Google fields, status, grace)
- **`subscription_plans`** — available plans
- **`apple_product_mappings`** — App Store product IDs
- **`payment_transactions`** — payment history
- **`promo_codes`** — promotional codes
- **`apple_webhook_logs`**, **`google_play_webhook_logs`** — raw IAP webhooks

### Food & Allergens
- **`allergens`** + **`allergen_translations`** — allergen definitions (multilingual)
- **`food_categories`** + **`food_category_translations`** — food groupings
- **`foods`** + **`food_translations`** — individual foods
- **`food_allergens`** — food-to-allergen mapping
- **`user_sensitivities`** — user's allergens/foods with severity

### Analysis
- **`analysis_history`** — per-scan records (user_id, type: image|barcode)
- **`analysis_detected_allergens`**, **`analysis_detected_foods`** — scan results

### Content
- **`learn_articles`** + translations, images, tags — educational content
- **`recipes`** + translations, ingredients, allergens, nutrition — curated recipes
- **`recipe_generation_history`** — AI-generated recipes with share_hash
- **`recipe_favorites`** — user saved recipes
- **`blog_posts`** + translations, tags — website blog

---

## API Endpoints (Base: `/api/v1`)

### Core Analysis
- `POST /analyze` — image analysis (base64)
- `POST /analyze/barcode` — barcode scan (uses Open Food Facts)
- `GET /analyze/history` — user's scan history

### Auth
- `POST /auth/register`, `POST /auth/login` — credentials
- `GET /auth/profile` — current user
- `POST /auth/refresh` — token refresh
- OAuth: `/auth/oauth/google/*`, `/auth/oauth/apple/*`

### User Profile
- `GET/PUT /user/profile` — profile management
- `POST /user/password` — change password
- `DELETE /user` — account deletion
- `POST /user/forgot-password`, `POST /user/reset-password`

### Sensitivities
- `GET/POST/PUT/DELETE /sensitivities` — CRUD user allergens/foods
- `GET /sensitivities/allergens`, `/foods`, `/categories`

### Subscriptions
- `GET /subscription/current`, `/plans`
- `POST /subscription/apple/verify`, `/android/verify`
- `POST /subscription/apple/webhook`, `/android/webhook`
- `POST /subscription/activate`, `/cancel`
- `GET /subscription/payment-history`

### Recipes
- `GET /recipes` — list with filters
- `GET /recipes/suitable` — filtered by user sensitivities
- `POST /recipes/generate` — AI recipe generation
- `GET /recipes/shared/:hash` — public share link
- `POST /recipes/:id/favorite`

### Learn Articles
- `GET /learn/articles` — list
- `GET /learn/articles/relevant` — personalized by sensitivities
- `GET /learn/articles/:code`

### Blog (Website)
- `GET /blog/posts`, `/blog/posts/latest`, `/blog/posts/:slug`

---

## Mobile App Structure

### Screens (Expo Router)

**Tab Navigator:**
1. **Library** (`library.tsx`) — browse foods, categories, search
2. **Learn** (`learn.tsx`) — educational articles
3. **Scan** (`scan.tsx`) — camera/barcode analysis (center tab)
4. **Recipes** (`recipes.tsx`) — recipe list + AI generation
5. **Profile** (`mylist.tsx`) — sensitivities, settings, account

**Auth Flow:**
- `onboarding.tsx` — first-time user flow
- `signin.tsx` — login/register
- `subscription.tsx` — paywall
- `allergen-setup.tsx` — initial sensitivity selection

### Key Services
- `apiClient.ts` — Axios with token refresh queue
- `analyzeService.ts` — scan operations
- `authService.ts` — login, register, OAuth
- `subscriptionService.ts` + `iapService.ts` — IAP handling
- `storageService.ts` — AsyncStorage wrapper

### Context Providers
- `AuthContext` — session state
- `AllergenContext` — user sensitivities
- `SubscriptionContext` — premium state, paywall modals
- `OnboardingContext` — first-run flow
- `ScanContext` — scan results state

---

## External Services

| Service | Purpose |
|---------|---------|
| **Anthropic Claude** | Primary AI for food analysis |
| **OpenAI** | Fallback AI provider |
| **Google Gemini** | Alternate AI provider |
| **xAI** | Optional AI provider |
| **Open Food Facts** | Barcode product data |
| **Brevo** | Transactional email, marketing |
| **Apple App Store** | iOS subscriptions, Sign-In |
| **Google Play** | Android subscriptions |
| **Stripe** | Web subscriptions and billing |

AI provider is configured via `AI_PROVIDER` env variable; factory pattern in `aiAnalyzerService.js`.

---

## Stripe Analytics

Use the `stripe_analytics` skill to view revenue data and debug customer issues for Foodient:

### Dashboard & Analytics
```bash
/stripe-metrics foodient                    # Default dashboard (30 days)
/stripe-metrics foodient --churn            # Churn analysis
```

### Debug Specific Customer
```bash
# Lookup by customer ID
{"action": "customer", "project": "foodient", "customer_id": "cus_xxx"}

# Lookup by email
{"action": "customer", "project": "foodient", "email": "user@example.com"}

# Check subscription status
{"action": "subscription", "project": "foodient", "subscription_id": "sub_xxx"}

# View customer invoices
{"action": "invoices", "project": "foodient", "customer_id": "cus_xxx"}

# Raw Stripe API access
{"action": "raw", "project": "foodient", "endpoint": "payment_intents", "params": {"customer": "cus_xxx"}}
```

### Available Actions
- `analytics` - Dashboard with MRR, churn, segments (default)
- `customer` - Full customer details + subscriptions + invoices + payment methods
- `subscription` - Subscription details + upcoming invoice
- `invoices` - Customer invoice history
- `events` - Stripe events for customer
- `raw` - Direct API access to any Stripe endpoint

Requires: `STRIPE_FOODIENT_READ_KEY` environment variable (read-only key).

---

## Common Tasks

### Check User Subscription Status
```bash
psql "$FOODIENT_DB_URL" -c "
  SELECT u.email, us.status, us.current_period_end, us.apple_product_id, us.google_play_product_id
  FROM users u
  LEFT JOIN user_subscriptions us ON u.id = us.user_id
  WHERE u.email = 'user@example.com';"
```

### Get Analysis Stats
```bash
psql "$FOODIENT_DB_URL" -c "
  SELECT analysis_type, DATE(created_at) as day, COUNT(*)
  FROM analysis_history
  WHERE created_at > NOW() - INTERVAL '7 days'
  GROUP BY analysis_type, day
  ORDER BY day DESC;"
```

### Active Subscriptions Overview
```bash
psql "$FOODIENT_DB_URL" -c "
  SELECT status, COUNT(*) as count
  FROM user_subscriptions
  GROUP BY status;"
```

### User Sensitivities
```bash
psql "$FOODIENT_DB_URL" -c "
  SELECT u.email, a.code as allergen, us.severity
  FROM user_sensitivities us
  JOIN users u ON us.user_id = u.id
  LEFT JOIN allergens a ON us.allergen_id = a.id
  WHERE u.email = 'user@example.com';"
```

---

## Common Issues

### Subscription Not Recognized
1. Check `user_subscriptions` table for user
2. Check `apple_webhook_logs` or `google_play_webhook_logs` for recent webhooks
3. Verify subscription status is 'active' and `current_period_end` is future
4. Check `subscription_device_logs` for device binding issues

### Analysis Failing
1. Check AI provider status (Claude, OpenAI, etc.)
2. Verify `AI_PROVIDER` env setting
3. Check rate limits in `analysis_history` for user
4. Review logs for API errors

### OAuth Issues
1. Verify OAuth credentials in env
2. Check `user_oauth_accounts` for linked accounts
3. For Apple: verify Apple keys in certificates/

---

## Environment Variables (Key)

```
DATABASE_URL=postgresql://...
JWT_SECRET=...
AI_PROVIDER=anthropic|openai|gemini|xai
ANTHROPIC_API_KEY=...
OPENAI_API_KEY=...
GOOGLE_GEMINI_API_KEY=...
BREVO_API_KEY=...
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
APPLE_CLIENT_ID=...
SITE_URL=https://www.foodient.app
```

---

## Cron Jobs

- **Apple subscription refresh** — validates/updates Apple subscriptions
- **Android subscription refresh** — validates/updates Google Play subscriptions

Both run only when `NODE_ENV === 'production'`.

---

## Notes for Jay

- Backend has no Docker config — runs directly via `npm start`
- Mobile app uses Expo with native projects (not Expo Go)
- Schema source of truth: `DB_SCHEME.txt` + migrations/
- API docs available at `/api/v1/docs`
- Stripe is referenced in code but not in package.json dependencies
- Production image path: `/var/data/images`
