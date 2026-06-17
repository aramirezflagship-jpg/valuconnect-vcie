# Flash-it — AI Photo Booth

Flash-it is a self-serve AI photo booth SaaS built for events. Guests step in front of an iPad, pick a theme, and seconds later receive a fully AI-transformed photo — same person, completely new world — delivered by SMS or QR code. Hosts book a plan online, get a branded event link, and can track every photo from their dashboard. No app download, no staff required at the booth.

---

## Architecture

```
landing/          Static marketing website (bilingual ES/EN, port 4000 in dev)
frontend/         React + Vite kiosk PWA — the guest-facing booth (port 3001, HTTPS)
backend/          Express API — AI pipeline, auth, payments, SMS (port 3000)
config/           themes.json (AI prompts), events.json (event configs)
supabase/         Postgres migrations for production (optional — local mode uses JSON)
print-agent/      Windows mini-PC script that pulls photos and sends to DNP printer
```

### Photo pipeline (per capture)

1. Guest photo uploaded as base64 to `POST /api/capture`
2. Backend calls **fal.ai birefnet** to remove the background (cutout PNG)
3. Backend calls **fal.ai FLUX** with a theme prompt to generate the styled background
4. `sharp` composites the cutout onto the generated scene + applies event branding overlay
5. Final image is stored in **Cloudflare R2**
6. Guest receives a QR code on screen + optional SMS/WhatsApp via **Twilio**

### Auth

- **Development (no Supabase):** local JWT stored in `config/users.json`. Demo accounts are auto-seeded on startup.
- **Production:** Supabase Auth — set `SUPABASE_URL` and keys to activate.

---

## Quick Start (3 terminals)

### Prerequisites

- Node 18+
- A `backend/.env` file (copy `backend/.env.example` and fill in the required keys — at minimum `ADMIN_SECRET`, `JWT_SECRET`, and `FAL_API_KEY`)

### Terminal 1 — Backend

```bash
cd backend
npm install
npm run dev
# Running on http://localhost:3000
```

### Terminal 2 — Kiosk frontend

The frontend runs over HTTPS (required for `getUserMedia` camera access on most browsers).

```bash
cd frontend
npm install
npm run dev
# Running on https://localhost:3001
# Accept the self-signed cert warning in your browser
```

### Terminal 3 — Marketing website

```bash
cd landing
npx serve . -p 4000
# or: python3 -m http.server 4000
# Open http://localhost:4000
```

---

## Demo credentials

| Role | URL | Email | Password |
|---|---|---|---|
| Customer | `https://localhost:3001/login` | `demo@flash-it.app` | `demo123` |
| Admin | `http://localhost:3000/admin` | — | Use `ADMIN_SECRET` from `.env` |

Demo accounts are auto-created on first backend startup when `SUPABASE_URL` is not set.

---

## Environment variables

See `backend/.env.example` for the full list with descriptions. The table below covers the ones you need on day one.

| Variable | Required | What it does |
|---|---|---|
| `PORT` | No (default 3000) | Backend listen port |
| `ADMIN_SECRET` | Yes | Password for `/admin` panel |
| `JWT_SECRET` | Yes | Signs customer auth tokens |
| `FAL_API_KEY` | Yes | fal.ai — background removal + FLUX generation |
| `R2_ACCESS_KEY_ID` / `R2_SECRET_ACCESS_KEY` | Yes | Cloudflare R2 photo storage |
| `R2_BUCKET_NAME` | Yes | Your R2 bucket name |
| `R2_PUBLIC_URL` | No | Public R2 URL (skips presigned URLs if set) |
| `STRIPE_SECRET_KEY` | For payments | Stripe checkout + invoices |
| `STRIPE_WEBHOOK_SECRET` | For payments | Validates webhook events from Stripe |
| `TWILIO_ACCOUNT_SID` / `TWILIO_AUTH_TOKEN` | For SMS | Twilio credentials |
| `TWILIO_PHONE_NUMBER` | For SMS | Your Twilio sender number |
| `TWILIO_WHATSAPP_FROM` | For WhatsApp | Twilio WhatsApp sender |
| `SENDGRID_API_KEY` | For email | Invoice + receipt emails |
| `VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` | For push | Web push notifications |
| `SUPABASE_URL` / keys | Prod only | Supabase Auth + DB (local mode if omitted) |
| `FRONTEND_URL` | Prod | Comma-separated allowed CORS origins |

---

## Customer journey

1. Customer visits the **landing page** and picks a plan (Starter $39 / Party $79 / Celebration $149)
2. Stripe Checkout collects payment — webhook creates the account and event automatically
3. Customer logs into the **dashboard** at `/dashboard`
4. Customer shares their unique **event link** (e.g. `/booth?event=abc123`) with their venue or sets up the iPad kiosk
5. Guests open the event link, pick a theme, take a photo, approve or retake, then enter their phone number
6. Guest receives their photo via SMS/WhatsApp and QR code on screen
7. Customer views all photos in their dashboard gallery

## Admin journey

1. Go to `http://localhost:3000/admin` (or your deployed backend URL + `/admin`)
2. Enter `ADMIN_SECRET` to log in
3. Admin panel shows all customers, events, photos taken, and plan status
4. Admin can create events manually, adjust plans, and view usage

---

## Plans

| Plan | Price | Guests | SMS credits | Themes |
|---|---|---|---|---|
| Starter | $39 | 30 | 30 | 1 |
| Party | $79 | 100 | 100 | 3 |
| Celebration | $149 | Unlimited | Unlimited | All |

---

## Deployment

See [DEPLOYMENT.md](./DEPLOYMENT.md) for step-by-step instructions to deploy the backend on Railway and the frontend on Vercel.
