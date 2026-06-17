# Flash-it — Changelog

Changes are written for Andres, not developers. Each entry explains what works now that didn't before.

---

## [2026] — Phase 3: Notifications

Customers and guests now get real-time updates without refreshing anything.

- Web push notifications: customers get notified when a new photo is taken at their event (browser push, works on desktop and most Android browsers)
- Notification history: a full log of past notifications, accessible from the dashboard
- Mark-as-read tracking — unread count shown in the UI
- Push subscriptions are stored per account so notifications work even after reopening the browser
- Backend routes: `GET /api/notifications`, `PATCH /api/notifications/:id/read`, `POST /api/push/subscribe`

---

## [2026] — Phase 2: Multi-tenant accounts + admin panel

Each client now has their own account, dashboard, and private events. Nothing is shared between customers.

- Customer registration and login (`/register`, `/login`)
- JWT-based auth — works without Supabase in development (local JSON store in `config/users.json`)
- Customer dashboard: see your events, photo counts, and plan status
- Account details endpoint (`GET /api/accounts/me`) — returns account info and linked events
- Admin panel at `/admin` — Andres can see all customers, all events, all photos, and plan details
- Admin auth via `ADMIN_SECRET` header — separate from customer auth
- When `SUPABASE_URL` is set, auth and data move to Supabase automatically (zero code change needed)

---

## [2026] — Phase 1: Payments (Stripe)

Clients can now self-serve — no need for Andres to manually create accounts.

- Stripe Checkout integration — three plans: Starter ($39), Party ($79), Celebration ($149)
- Webhook handler creates the customer account and event automatically on successful payment
- PDF invoice generated and emailed to the customer via SendGrid after checkout
- Add-on purchases supported (extra SMS credits, extra guests)
- Plans enforce limits: max guest count, SMS credits, available themes
- `POST /api/payments/checkout` — create a Stripe Checkout session
- `POST /api/payments/webhook` — receives Stripe events (raw body, mounted before JSON middleware)

---

## [2026] — Phase 0: Photo booth core

The booth works end-to-end: guest takes a photo, AI transforms it, guest gets the result.

- Camera capture on the iPad via `getUserMedia` with 3-second countdown
- Theme picker — guests choose their AI scene (galaxy, jungle, sunset, and more)
- AI pipeline: fal.ai birefnet removes the background, fal.ai FLUX generates the themed scene, `sharp` composites the final image
- Photos stored in Cloudflare R2 (public URL or presigned link depending on bucket settings)
- Guest delivery: QR code on screen + SMS via Twilio + WhatsApp via Twilio
- Per-event gallery page at `/gallery?event=EVENT_ID`
- Admin event management: create events, set branding, assign themes, view usage logs
- Offline queue on the frontend — photos captured during weak signal are held locally and retried automatically
- `POST /api/capture` — main photo processing endpoint (accepts base64 image + theme)
- `GET /health` — health check used by Railway for uptime monitoring
