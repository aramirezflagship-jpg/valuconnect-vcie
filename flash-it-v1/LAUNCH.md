# Flash-it — Launch Checklist
**by ValuConnect Solutions · Owner: Andres Ramirez · Updated June 2026**

Live status: the **/admin → 🚀 Launch** tab auto-checks config + data every time you open it.
This file is the plan. **The migration is the final step — see the bottom.**

Legend: ✅ done · ⬜ to do · **[You]** = config/account · **[External]** = third party · **[Me]** = Claude builds

---

## ✅ Built & live (no action needed)
- **Kiosk capture** — Natural + Character modes, $0/photo (AI-free)
- **7 themed Natural frames** — fiesta, wedding, quinceañera, birthday, kids-birthday, corporate, holiday
- **Admin** — 🚀 Launch readiness · Customers (add / edit / reset password) · Events (create / edit / cancel / extend) · Products (Solo + Full Service, editable) · Messages (templates) · Backgrounds · Analytics
- **Self-contained messaging** — lead auto-reply + 8 bilingual templates ("Valu" voice, white/blue-thunder theme)
- **Stripe** — checkout + webhook + invoice PDF + customer portal + **promotion codes** (discounts)
- **Legal** — Refund (`/refund`), Terms, Privacy, Photo/Biometric + Marketing consent (DRAFT, wired)
- **Ops** — Sentry error monitoring (gated), hardened JWT secret

## ⬜ Your to-do before launch

### Config — minutes, in Render → Environment
- ⬜ **[You]** Set **`JWT_SECRET`** (the value Claude generated)
- ⬜ **[You]** Verify a **SendGrid sender** → set `SENDGRID_API_KEY` + `SENDGRID_FROM_EMAIL`
- ⬜ **[You]** **Stripe**: `STRIPE_SECRET_KEY` + `STRIPE_WEBHOOK_SECRET`, and add the webhook in Stripe → endpoint `…/api/payments/webhook`
- ⬜ **[You]** *(optional)* `SENTRY_DSN` to turn on error monitoring

### Long-lead — START NOW (these take weeks)
- ⬜ **[External]** **A2P 10DLC** registration (Twilio) — gates SMS, 1–3 weeks. Steps in `docs/launch-comms-setup.md`
- ⬜ **[External]** **Attorney review** of the legal docs, especially the photo/biometric consent
- ⬜ **[You]** Send Claude the legal **[PLACEHOLDERS]** (business name, address, state, support email + phone, effective date) + refund terms → Claude fills them

### Content & quality
- ⬜ **[You]** Set your real **Full Service prices** in /admin → Products (current ones are placeholders)
- ⬜ **[You]** Upload ≥1 **Character** template per theme via /admin → Backgrounds (Natural frames already ship)
- ⬜ **[You]** Create any **discount codes** in Stripe → Coupons (checkout box already enabled)
- ⬜ **[You+Me]** **iPad dry-run** at a mock event: consent → mode → frame → capture → photo actually arrives (QR + email)

---

## 🗓️ 3-week timeline — target **Saturday, July 11, 2026**
- **Week 1 (Jun 20–27):** start A2P + attorney; set `JWT_SECRET`; verify SendGrid; send legal values. *(Build — admin management, editable products, discounts, refund: ✅ done.)*
- **Week 2 (Jun 28–Jul 4):** Stripe keys + webhook + test checkout; upload Character art; set Full Service prices; iPad dry-run #1; turn on Sentry.
- **Week 3 (Jul 5–11):** A2P approval → SMS test; final iPad dry-run; attorney sign-off; confirm **/admin → 🚀 Launch = 0 blockers**; **run the migration (below)**; go-live with your first paid Full Service event.
- *If A2P is late: launch Full Service with **email + QR** delivery on Jul 11, add SMS when it clears.*

---

## 🏁 FINAL STEP — run the migration (the last thing)
When the prep above is in place, open **Supabase → SQL Editor → New query**, paste the
combined **0003 + 0004 + 0005** SQL (in the chat, and in `flash-it-v1/backend/supabase/migrations/`),
and **Run**. It's idempotent and needs no secrets. It:
- **0003** — powers dashboard leads + the Managed/Solo split
- **0004** — persists message-template edits + auto-seeds the 4 starter templates
- **0005** — makes product prices (Solo + Full Service) editable

Then hard-refresh **/admin → 🚀 Launch** — the items flip green and you're go. ✅

---

## Infra reference
- **Frontend:** Vercel — `valuconnect-vcie.vercel.app` (from `main`) · **Backend:** Render — `flash-it-backend-akf5.onrender.com`
- **DB:** Supabase · **Storage:** Cloudflare R2 · **Email:** SendGrid · **SMS:** Twilio · **Payments:** Stripe · **Monitoring:** Sentry
