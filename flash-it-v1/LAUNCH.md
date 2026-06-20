# Flash-it — Launch Checklist
**by ValuConnect Solutions · Owner: Andres Ramirez · Updated June 2026**

The fastest path to your first paid event, then to full public launch. Items are
marked **[You]** (config/account work only you can do), **[Me]** (build work
Claude can do), or **[External]** (third party — start these EARLY, they're slow).

Legend: ✅ done · ⬜ to do

---

## Phase 0 — 2-minute config (do these first)
- ⬜ **[You] Apply migration `0003_admin_dashboard.sql`** in Supabase → SQL Editor.
  *(powers the admin dashboard metrics + Full Service leads)*
- ⬜ **[You] Apply migration `0004_message_templates.sql`** in Supabase → SQL Editor.
  *(persists your message-template edits; auto-seeds the 4 DB starters on first open)*
- ⬜ **[You] Set `JWT_SECRET` in Render** → service → Environment → add the value Claude
  generated → Save. *(without it, everyone is logged out on every redeploy)*

Files: `flash-it-v1/backend/supabase/migrations/`

---

## Phase 1 — Long-lead items (START TODAY — these take weeks)
- ⬜ **[External] A2P 10DLC registration** for your Twilio number (Twilio Console →
  Messaging → Regulatory Compliance). **Required before sending marketing/branded
  SMS in the US. Takes 1–3 weeks.** Photo-delivery SMS to guests also benefits.
- ⬜ **[External] Attorney review of the legal docs**, *especially the photo/biometric
  consent* (face detection has real exposure under laws like Illinois BIPA, Texas
  CUBI). Don't run a real event on un-reviewed biometric consent.
- ⬜ **[You] Fill the legal `[PLACEHOLDERS]`** — business legal name, address, state,
  support email + phone, effective date — in `pixel-ai/frontend/src/legal/legalContent.js`
  and `flash-it/legal/*.md`. (Claude can do the find/replace once you give the values.)

---

## Phase 2 — Prove photo delivery (the core guest deliverable)
- ⬜ **[You] Verify a SendGrid sender** (Single Sender or domain auth) so photo emails
  + auto-replies actually arrive. Set `SENDGRID_FROM_EMAIL` to that verified address.
- ⬜ **[You] Verify SMS** end-to-end once A2P is approved (set `TWILIO_PHONE_NUMBER`).
- ⬜ **[You+Me] iPad dry-run at a mock event:** open the kiosk link, run a guest through
  consent → mode → frame → capture → and confirm the photo **actually arrives** by
  QR + email (+ SMS once approved). Test on the real device, not just curl.

---

## Phase 3 — Full Service launch (your first revenue, fastest path)
Full Service = you run the booth; you can **invoice** (no Stripe needed yet).
- ✅ Kiosk capture (Natural + Character) — built & live
- ✅ Frame catalogue — 7 themed frames live (fiesta, wedding, quinceañera, birthday,
  kids-birthday, corporate, holiday)
- ✅ Admin: events, dashboard, customers, leads, **Messages** (templates) — built & live
- ✅ Lead auto-reply (editable `lead-welcome` template) — built & live
- ⬜ **[You] Character-mode artwork** — upload at least one real character template per
  theme via **/admin → Backgrounds** (the backend auto-punches the face hole). The
  built-in frames cover Natural mode; Character mode needs your art.
- ⬜ Phases 0–2 complete → **run your first paid Full Service event.**

---

## Phase 4 — Solo self-serve launch (public, recurring revenue)
- ✅ **Stripe is code-complete** — Checkout, webhook (→ event + account + invoice PDF +
  email), customer portal, and payment history are all built (`routes/payments.js`).
  Tiers are inline (`price_data`), so **no Stripe product setup needed**. Plans:
  Starter $39 · Party $79 · Celebration $149 · Brand $299.
- ⬜ **[You] Add Stripe keys in Render:** `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`.
- ⬜ **[You] Add the webhook in Stripe Dashboard** → Developers → Webhooks → endpoint
  `https://flash-it-backend-akf5.onrender.com/api/payments/webhook`, event
  `checkout.session.completed` → copy the signing secret into `STRIPE_WEBHOOK_SECRET`.
- ⬜ **[You+Me] Smoke-test** with a Stripe **test** key end-to-end before going live.
- ⬜ **[You+Me] Custom domain** (e.g. `app.flashit…`) on Vercel + backend URL; update
  `FRONTEND_URL` / `VITE_API_URL` / CORS. Drop the `*.vercel.app` / `*.onrender.com`
  / `@flash-it.app` placeholders.
- ⬜ **[You] Email deliverability** — SPF/DKIM/DMARC for the sending domain so
  auto-replies + marketing don't land in spam.

---

## Phase 5 — Polish (right after launch)
- ✅ **Error monitoring (Sentry) built** — captures backend 500s. ⬜ **[You] set
  `SENTRY_DSN`** in Render to turn it on (no-op until then). Optional:
  `SENTRY_TRACES_SAMPLE_RATE`. ⬜ add uptime/alerting (e.g. a Render/UptimeRobot ping).
- ⬜ **[You+Me] On-site printing** tested end-to-end (if you offer prints) — print
  queue + print-agent + hardware.
- ⬜ **[You] Supabase backups** enabled + a data-retention/deletion runbook (ties to
  the legal data-retention policy).
- ⬜ **[Me] Marketing automation** — drip sequences on the templates (track A) +
  content engine (track B), once A2P is live.

---

## Infra reference
- **Frontend:** Vercel — `valuconnect-vcie.vercel.app`, deploys from `main`
- **Backend:** Render — `flash-it-backend-akf5.onrender.com`, deploys from the working branch
- **DB:** Supabase (Postgres) — accounts, events, backgrounds, photos, leads, templates
- **Storage:** Cloudflare R2 · **AI:** Gemini (admin template gen only) · **Email:** SendGrid
  · **SMS:** Twilio · **Payments:** Stripe (pending)

## Critical path to first dollar
**Phase 0 (2 min)** → **start Phase 1 A2P + attorney today** → **Phase 2 email verify +
iPad dry-run** → **upload one character template** → **run a paid Full Service event.**
Solo launch (Phase 4) follows once Stripe is wired.
