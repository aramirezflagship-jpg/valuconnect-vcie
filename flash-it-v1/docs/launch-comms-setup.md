# Flash-it — Launch Comms Setup (Email + SMS)
Companion to [LAUNCH.md](../LAUNCH.md). Concrete, copy-paste steps for the two
delivery channels. Email is fast; **SMS (A2P 10DLC) is the long pole — start it first.**

---

## A) SendGrid — verify your sender (email)

Until a sender is verified, **all email silently skips** (photo emails, lead
auto-reply, password reset, template sends).

### Option 1 — Single Sender (fastest, fine to start)
1. SendGrid → **Settings → Sender Authentication → Single Sender Verification → Create New Sender**.
2. Use a real inbox you control — recommended **`info@vcsolutions.us`**. From name:
   `Flash-it (Andres)`. Reply-to: same.
3. Click the verification link SendGrid emails you.
4. In **Render → Environment**, set:
   - `SENDGRID_API_KEY` = your SendGrid API key
   - `SENDGRID_FROM_EMAIL` = the exact verified address
   - `LEAD_REPLY_TO` = `info@vcsolutions.us` (where lead replies go)
5. Test: **/admin → Messages → Send test** to your own inbox.

### Option 2 — Domain Authentication (better deliverability; do before scaling)
1. SendGrid → **Authenticate Your Domain** → enter your sending domain.
2. Add the **CNAME records** it gives you at your DNS host — this sets up **SPF/DKIM**
   so messages don't land in spam.
3. Verify → then you can send from any `@yourdomain` address.

---

## B) A2P 10DLC — register for SMS (US). ~1–3 weeks. Do this FIRST.

Required before sending **any** SMS from a US 10-digit number (photo delivery **and**
marketing). Twilio Console → **Messaging → Regulatory Compliance → A2P 10DLC**.

### Step 1 — Brand (your business) — *you provide*
Legal business name · EIN/Tax ID (or sole-proprietor) · business address · website ·
contact name/email/phone.

### Step 2 — Campaign — *use the content below*
- **Use case:** **Mixed** (or *Low Volume Mixed* if under ~6k msgs/day). Flash-it sends
  both transactional photo links and opt-in promotional follow-ups.
- **Campaign description** (paste):
  > Flash-it sends event guests a link to download the photo they took at a photo
  > booth. Separately, only guests who explicitly opt in receive occasional
  > promotional offers from the booth operator (ValuConnect Solutions).
- **Sample messages** (provide 2–3 — these match what the app sends):
  1. `✨ Your Flash-it photo from Maria's Quinceañera is ready! Download: https://flsh.it/abc  Reply STOP to opt out.`
  2. `Thanks for celebrating with Flash-it! 🎉 Book your next event & save 10%: https://flsh.it/book  Reply STOP to unsubscribe.`
  3. `Hi Ana, this is Andres from Flash-it — your booking is confirmed for Aug 15. Reply STOP to opt out.`
- **Opt-in / call-to-action** (paste):
  > Guests enter their phone number at the photo-booth kiosk to receive their photo.
  > For marketing texts, a separate checkbox — **unchecked by default** — is shown on
  > the same screen with the disclosure "msg & data rates may apply; reply STOP to
  > unsubscribe." Consent is logged with a timestamp.
- **Opt-in proof:** screenshot the kiosk delivery screen showing the **marketing
  opt-in checkbox + disclosure** (Twilio requires this image).
- **Opt-out:** `Users reply STOP to unsubscribe, HELP for help.` (Twilio auto-handles STOP/HELP.)
- Embedded link: **Yes** · Embedded phone: No · Age-gated content: No.

### Step 3 — after approval — *you provide*
In **Render → Environment**: `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`,
`TWILIO_PHONE_NUMBER`. Test via **/admin → Messages** (an SMS-channel template) → Send test.

### ⚠️ Compliance
Every **marketing** SMS must include "Reply STOP to opt out." When you create an
SMS-channel template in **/admin → Messages**, include that line in the body. Keep the
marketing opt-in **unchecked by default** with consent logged (TCPA).

---

## Quick reference — env vars these unlock
| Channel | Render env vars |
|---|---|
| Email | `SENDGRID_API_KEY`, `SENDGRID_FROM_EMAIL`, `LEAD_REPLY_TO` |
| SMS | `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_PHONE_NUMBER` |
| Payments | `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` |
| Monitoring | `SENTRY_DSN` |
| Security | `JWT_SECRET` |
