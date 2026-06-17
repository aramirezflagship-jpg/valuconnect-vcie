# Flash-it — Photo Booth System Build Plan

**Capture device:** iPad Pro 2024 (M4)
**Build environment:** Claude Code
**Languages:** Bilingual (ES / EN)
**Last updated:** 2026

-----

## ⚠️ Read This First — What the iPad Can and Can't Do

The iPad Pro M4 is a great **capture + guest-facing screen**, but iPadOS is sandboxed. It **cannot**:

- Run Stable Diffusion or any local AI model
- Drive a DNP/Mitsubishi dye-sub printer directly (no drivers on iPadOS)
- Run a Node server, n8n, or a folder-watcher script
- Do unattended background processing

So the system is built as **iPad = front end, Cloud = brain, small print box = output**. This is actually the standard pro setup — it keeps the iPad simple and reliable at the event.

### Three architecture options

|Option                                  |How it works                                                                                        |Best for                                          |Monthly cost                |
|----------------------------------------|----------------------------------------------------------------------------------------------------|--------------------------------------------------|----------------------------|
|**A. Cloud-only (recommended to start)**|iPad web app → cloud API does AI → guest gets digital photo (QR/SMS/WhatsApp). No printer.          |Launch fast, lowest cost, corporate/digital events|~$30–80                     |
|**B. Cloud + print laptop**             |iPad captures → cloud AI → a cheap Windows mini-PC near the printer pulls finished photos and prints|Full service with physical prints                 |~$80–150 + one-time hardware|
|**C. Print-station bundle**             |Use commercial booth software (Darkroom/Salsa) on the mini-PC, iPad as remote trigger               |Least custom code, fastest print path             |software license + hardware |

**Recommendation:** Build **Option A** first (you can sell digital-only packages immediately), then add the print laptop for **Option B** once you book a print package.

-----

## 🛒 What You Need to Buy

### Already have

- ✅ iPad Pro 2024 (M4) — capture + guest screen
- ✅ Cellular data plan on the iPad — handles uploads, no separate hotspot needed

### Phase 1 — Cloud-only launch (digital delivery)

|Item                               |Why                                       |Est. price|
|-----------------------------------|------------------------------------------|----------|
|iPad floor stand / tripod mount    |Stable guest-facing setup                 |$40–90    |
|Ring light 18" + stand             |Even, flattering light = better AI results|$60–120   |
|Step-and-repeat backdrop (optional)|Branding / clean capture background       |$120–300  |

**Phase 1 total: ~$100–510** *(hotspot not needed — iPad has its own data plan)*

> ⚠️ **Data plan checks:** (1) Confirm the plan is unlimited or high-cap — a busy event can move a few GB per event (uploads + downloads). A throttled "unlimited" plan that slows after X GB could bottleneck during peak moments. (2) Cellular can still be weak in basements, concrete convention halls, or rural outdoor venues — the **offline queue + retry** (Milestone 6.3) is still required so captures keep working and photos upload when signal recovers.

### Phase 2 — Add physical printing

|Item                                        |Why                              |Est. price |
|--------------------------------------------|---------------------------------|-----------|
|Windows mini-PC (Beelink/Intel NUC, i5/16GB)|Runs the print agent + DNP driver|$350–550   |
|DNP DS-RX1HS or DS620A printer              |Industry-standard dye-sub, fast  |$700–1,400 |
|Print media (rolls, 4x6)                    |~700 prints/roll                 |$40–80/roll|
|Small folding table + cable management      |Print station setup              |$60–120    |

**Phase 2 total: ~$1,200–2,200**

-----

## 🏗️ System Architecture (Option A → B)

```
┌─────────────────┐
│  iPad Pro M4    │  Guest taps theme → camera → preview → approve
│  (web kiosk app)│
└────────┬────────┘
         │ HTTPS (photo upload)
         ▼
┌─────────────────────────────┐
│  Backend API (cloud)        │  Node/Express on Railway or Render
│  - receives photo           │
│  - calls Remove.bg          │
│  - calls AI image API       │
│  - applies branding overlay │
│  - stores result            │
└──────┬───────────┬──────────┘
       │           │
       ▼           ▼
┌────────────┐  ┌──────────────────────┐
│ Delivery   │  │ Print agent (Phase 2)│
│ QR/SMS/WA  │  │ mini-PC polls for     │
│ (Twilio)   │  │ finished prints →DNP  │
└────────────┘  └──────────────────────┘
```

### Tech stack

|Layer             |Tool                                                      |Notes                                           |
|------------------|----------------------------------------------------------|------------------------------------------------|
|iPad front end    |Web app (React) in Safari, "Add to Home Screen" kiosk mode|No App Store needed                             |
|Backend           |Node.js + Express                                         |Build in Claude Code                            |
|Hosting           |Railway or Render                                         |Easy deploy, ~$5–20/mo                          |
|Background removal|Remove.bg API                                             |~$0.20/image, or use AI model's built-in masking|
|AI transform      |fal.ai or Replicate (SDXL + IP-Adapter / face-preserving) |Pay per image                                   |
|Branding overlay  |sharp (Node image lib)                                    |Composite logo + frame at 300 DPI               |
|Delivery          |Twilio (SMS + WhatsApp)                                   |WhatsApp huge for LATAM clients                 |
|Storage/gallery   |Cloudinary or S3                                          |Event galleries                                 |
|Print agent       |Small Node or Python script on mini-PC                    |Polls backend, sends to printer via OS          |

### Face preservation — the key technical piece

The "same face, new background" effect works best with one of:

- **SDXL img2img with low denoise + inpainting the background only** (mask out the person, regenerate only the background)
- **IP-Adapter FaceID** to lock the face identity
- **fal.ai "face-to-many" / background-replace** style endpoints (simplest to call)

Background-replacement (mask person, generate new scene behind them) is more reliable than full restyle and runs faster — start there.

-----

## ✅ Build Tasks & Steps

### Milestone 1 — Backend skeleton ✅ BUILT
- [x] 1.1 Init Node/Express project, set up `/health` route
- [x] 1.2 Add `POST /capture` endpoint that accepts a base64 image
- [x] 1.3 Wire up Remove.bg (or model masking) — return cutout PNG
- [x] 1.4 Wire up fal.ai/Replicate — generate themed background, composite person on top
- [x] 1.5 Add branding overlay step with `sharp` (logo + frame, 300 DPI, 4x6 ratio)
- [x] 1.6 Store result in Cloudinary, return a public URL
- [ ] 1.7 Deploy to Railway, test with a sample image

### Milestone 2 — iPad kiosk app ✅ BUILT
- [x] 2.1 React app: welcome screen with event branding
- [x] 2.2 Theme picker (loads themes per event from config)
- [x] 2.3 Camera capture with 3-sec countdown (`getUserMedia`)
- [x] 2.4 Upload to `/capture`, show loading animation (~10–15s)
- [x] 2.5 Preview screen: Approve / Retake
- [x] 2.6 Delivery screen: QR code + phone-number entry for SMS/WhatsApp
- [ ] 2.7 "Add to Home Screen" + Guided Access lockdown on iPad

### Milestone 3 — Delivery ✅ BUILT
- [x] 3.1 Twilio SMS send with download link
- [x] 3.2 Twilio WhatsApp send (apply for WhatsApp sender)
- [x] 3.3 Auto-generate QR pointing to the photo URL
- [x] 3.4 Per-event gallery page (host gets all photos)

### Milestone 4 — Printing (Phase 2)
- [ ] 4.1 Set up Windows mini-PC, install DNP driver + test print
- [ ] 4.2 Print agent script: poll backend for "to-print" queue
- [ ] 4.3 Auto-send 4x6 to printer on guest approval
- [ ] 4.4 Print-status feedback back to iPad

### Milestone 5 — Multi-event config ✅ BUILT
- [x] 5.1 Simple admin page: create event, set name, logo, themes, delivery channels
- [x] 5.2 Per-event URL/PIN so the right branding loads on the iPad
- [x] 5.3 Usage log (photos taken, per event) for your records

### Milestone 6 — Test event
- [ ] 6.1 Full dry run at home: capture → AI → print → SMS
- [ ] 6.2 Stress test: 30 photos back-to-back, check speed + costs
- [ ] 6.3 Offline fallback plan (weak cellular signal → local queue + auto-retry when connection returns)

-----

## 💸 Per-Photo Cost (watch your margins)

|Item               |Cost           |
|-------------------|---------------|
|Background removal |~$0.10–0.20    |
|AI generation      |~$0.02–0.10    |
|SMS/WhatsApp       |~$0.01–0.03    |
|Print media        |~$0.15–0.20    |
|**Total per photo**|**~$0.30–0.50**|

At 150 photos/event that's ~$45–75 in variable cost — well within your package pricing.

-----

## 📣 Marketing Plan

### Brand

- **Name:** Flash-it (already in your mockups)
- **Tagline (EN):** "Your event, our magic."
- **Tagline (ES):** "Tu evento, nuestra magia."
- **Positioning:** Not a photo booth — an *AI experience*. Same person, infinite worlds.

### Launch funnel

1. **Demo reel** — film one real transformation (before → after), 15–20s vertical. This is your #1 sales asset.
1. **Landing page** — one page: hero video, 3 packages, booking form, WhatsApp button.
1. **Instagram + TikTok** — post transformations; the "wow" is the hook.
1. **Direct outreach** — event planners, wedding venues, corporate event coordinators.

### Content calendar (first 4 weeks)

|Week|Posts                                           |Goal      |
|----|------------------------------------------------|----------|
|1   |3 before/after reels + launch announcement      |Awareness |
|2   |Behind-the-scenes setup, "How it works" carousel|Educate   |
|3   |Theme showcase (wedding/corporate/XV años)      |Show range|
|4   |First-event recap + testimonial + booking CTA   |Convert   |

### Outreach targets

- Wedding planners & venues
- Corporate event / marketing agencies (brand activations)
- Quinceañera / event coordinators (strong LATAM market)
- Hotels & convention centers

### Sales assets to make

- [ ] 15–20s transformation demo reel (vertical)
- [ ] The Spanish pitch deck (✅ already built — `CabinaFotograficaIA.pptx`)
- [ ] One-page landing site + WhatsApp booking
- [ ] Instagram/TikTok bio + linktree
- [ ] DM/email outreach template (EN + ES)

-----

## 🚀 Suggested Order of Attack

1. Build **Milestone 1 + 2 + 3** (cloud digital booth) — you can sell immediately.
1. Film the **demo reel** the moment the AI works — marketing starts now, not after printing.
1. Add **Milestone 4 (printing)** once you book a print package.
1. Add **Milestone 5** when you have 2+ clients.

-----

## 📁 Project Structure

```
flash-it/
├── FLASHITBUILDPLAN.md       ← this file
├── backend/                  ← Node/Express API (deploy to Railway)
│   ├── src/
│   │   ├── index.js
│   │   ├── routes/
│   │   │   ├── capture.js
│   │   │   ├── events.js
│   │   │   └── admin.js
│   │   └── services/
│   │       ├── removebg.js
│   │       ├── ai-transform.js
│   │       ├── branding.js
│   │       ├── storage.js
│   │       └── delivery.js
│   ├── package.json
│   ├── railway.toml
│   └── .env.example
├── frontend/                 ← React kiosk PWA (deploy to Vercel/Netlify)
│   ├── src/
│   │   ├── App.jsx
│   │   ├── components/
│   │   │   ├── Welcome.jsx
│   │   │   ├── ThemePicker.jsx
│   │   │   ├── Camera.jsx
│   │   │   ├── Processing.jsx
│   │   │   ├── Preview.jsx
│   │   │   └── Delivery.jsx
│   │   ├── hooks/
│   │   └── utils/
│   ├── package.json
│   └── vite.config.js
└── config/
    ├── themes.json           ← AI prompt templates per theme
    └── events.json           ← Event config (branding, channels)
```
