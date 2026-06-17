# Flash-it — Deployment Guide

This guide walks through deploying the backend to Railway and the frontend to Vercel. Both platforms have free tiers; the backend will need a paid Railway plan ($5/mo) once you have real traffic.

---

## 1. Backend — Railway

### Steps

1. Go to [railway.app](https://railway.app) and create a new project
2. Click **Deploy from GitHub repo** and select this repository
3. Set the **root directory** to `backend`
4. Railway detects `railway.toml` automatically — no build config needed
5. Add all environment variables (see table below) under **Variables**
6. Click **Deploy** — Railway will run `npm start` and health-check `/health`
7. In the Railway **Settings** tab, optionally add a custom domain (e.g. `api.flash-it.app`)

The `railway.toml` already configures the health check path (`/health`), restart policy, and Nixpacks builder. No changes needed.

### Required backend environment variables

| Variable | Where to get it |
|---|---|
| `PORT` | Leave unset — Railway sets this automatically |
| `NODE_ENV` | Set to `production` |
| `ADMIN_SECRET` | Make up a strong random string |
| `JWT_SECRET` | Make up a strong random string (32+ chars) |
| `FAL_API_KEY` | [fal.ai dashboard](https://fal.ai/dashboard) |
| `R2_ACCOUNT_ID` | Cloudflare dashboard → Workers & Pages (right sidebar) |
| `R2_ACCESS_KEY_ID` | Cloudflare → R2 → Manage R2 API tokens → Create token (Read & Write) |
| `R2_SECRET_ACCESS_KEY` | Same token creation page |
| `R2_BUCKET_NAME` | Name of your R2 bucket |
| `R2_PUBLIC_URL` | Cloudflare → R2 → your bucket → Settings → Public access URL |
| `STRIPE_SECRET_KEY` | [Stripe dashboard](https://dashboard.stripe.com/apikeys) — use live key for prod |
| `STRIPE_WEBHOOK_SECRET` | See "Stripe webhook" section below |
| `TWILIO_ACCOUNT_SID` | [Twilio console](https://console.twilio.com) |
| `TWILIO_AUTH_TOKEN` | Twilio console |
| `TWILIO_PHONE_NUMBER` | Your Twilio purchased number |
| `TWILIO_WHATSAPP_FROM` | `whatsapp:+14155238886` (sandbox) or your approved sender |
| `SENDGRID_API_KEY` | [SendGrid API keys](https://app.sendgrid.com/settings/api_keys) |
| `VAPID_PUBLIC_KEY` | Run `npx web-push generate-vapid-keys` and copy the public key |
| `VAPID_PRIVATE_KEY` | Same command, private key |
| `VAPID_EMAIL` | `mailto:hello@flash-it.app` |
| `FRONTEND_URL` | Your Vercel frontend URL (e.g. `https://flash-it.vercel.app`) — allows CORS |
| `SUPABASE_URL` | [Supabase project settings](https://supabase.com/dashboard) → API |
| `SUPABASE_ANON_KEY` | Same page |
| `SUPABASE_SERVICE_ROLE_KEY` | Same page (keep this secret — it bypasses RLS) |

---

## 2. Frontend — Vercel

### Steps

1. Go to [vercel.com](https://vercel.com) and click **Add New Project**
2. Import this GitHub repo
3. Set the **root directory** to `frontend`
4. Vercel will detect Vite automatically — no build config needed
5. Add the environment variables below under **Environment Variables**
6. Click **Deploy**
7. Optionally add a custom domain (e.g. `booth.flash-it.app`) under **Domains**

Note: the Vite config uses `basicSsl` for local dev only. Vercel serves HTTPS by default in production — no changes needed.

### Required frontend environment variables

| Variable | Value |
|---|---|
| `VITE_API_URL` | Your Railway backend URL (e.g. `https://flash-it-backend.up.railway.app`) |
| `VITE_SUPABASE_URL` | Your Supabase project URL (same as backend) |
| `VITE_SUPABASE_ANON_KEY` | Supabase anon key (public — safe to expose) |
| `VITE_VAPID_PUBLIC_KEY` | The same VAPID public key you set on the backend |

---

## 3. Stripe webhook setup

After deploying the backend, you must register the webhook URL with Stripe so payments activate accounts correctly.

1. Go to [Stripe Webhooks](https://dashboard.stripe.com/webhooks) → **Add endpoint**
2. Set the URL to: `https://your-railway-url.up.railway.app/api/payments/webhook`
3. Select events: `checkout.session.completed`, `invoice.payment_succeeded`, `customer.subscription.deleted`
4. Copy the **Signing secret** (starts with `whsec_`) and set it as `STRIPE_WEBHOOK_SECRET` in Railway

---

## 4. Supabase migrations

The `supabase/` directory contains the production schema. After connecting to your Supabase project:

```bash
# From the repo root
supabase login
supabase link --project-ref YOUR_PROJECT_REF
supabase db push
```

This applies all migrations in order. Run this any time you pull new migrations from this repo.

---

## 5. Post-deploy checklist

- [ ] `GET https://your-backend.up.railway.app/health` returns `{"status":"ok"}`
- [ ] `FRONTEND_URL` in Railway matches your exact Vercel domain (no trailing slash)
- [ ] Stripe webhook is registered and `STRIPE_WEBHOOK_SECRET` is set
- [ ] Supabase RLS is enabled on all tables (check Barry's migrations)
- [ ] R2 bucket is created and `R2_PUBLIC_URL` points to the public access URL
- [ ] Test a full end-to-end: checkout → account created → booth link works → photo delivered

---

## 6. Custom domains

### Backend (Railway)
Railway Settings → Networking → Custom Domain → enter `api.flash-it.app` → add the CNAME record in your DNS provider.

### Frontend (Vercel)
Vercel project → Settings → Domains → add `booth.flash-it.app` or `flash-it.app` → follow the DNS instructions.

After custom domains are set, update `FRONTEND_URL` in Railway to match the new frontend domain.

---

## 7. Rollback procedures

### Revert a bad backend deploy (Railway)

1. Railway dashboard → your service → **Deployments** tab
2. Find the last good deploy and click **Redeploy**
3. Railway swaps traffic to that build within ~30 seconds

### Revert a bad frontend deploy (Vercel)

1. Vercel dashboard → your project → **Deployments** tab
2. Find the last good deployment → click the three-dot menu → **Promote to Production**

### Revert a bad database migration (Supabase)

Supabase does not auto-rollback migrations. If a migration breaks something:

1. Go to [Supabase SQL editor](https://supabase.com/dashboard) for your project
2. Manually run the inverse SQL (DROP TABLE, ALTER TABLE, etc.) to undo the change
3. Remove or fix the migration file in `supabase/migrations/`
4. Push the corrected migration with `supabase db push`

For safety, always test migrations on a staging Supabase project before running on prod.
