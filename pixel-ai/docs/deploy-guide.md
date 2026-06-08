# Pixel AI — Deployment Guide

Step-by-step to go from code to live at an event.

---

## Step 1 — Get your API keys (30 min)

Do these in parallel — all have free tiers:

| Service | Where | What you get |
|---|---|---|
| Remove.bg | remove.bg/api | API key (50 free/mo) |
| fal.ai | fal.ai/dashboard | API key (~$5 free credit) |
| Cloudinary | cloudinary.com | Cloud name + API key + secret |
| Twilio | console.twilio.com | Account SID + Auth token + phone number |

**Twilio WhatsApp setup:**
1. Go to console.twilio.com → Messaging → Try it out → Send a WhatsApp message
2. Note the sandbox number: `whatsapp:+14155238886`
3. For production: apply at twilio.com/whatsapp/request-access (takes 2–5 days)

---

## Step 2 — Deploy the backend to Railway (15 min)

1. Go to **railway.app** → New Project → Deploy from GitHub repo
2. Select `aramirezflagship-jpg/valuconnect-vcie`
3. Set **Root Directory** to `pixel-ai/backend`
4. Railway auto-detects Node.js and runs `npm start`

**Set environment variables** (Settings → Variables):
```
PORT=3000
NODE_ENV=production
ADMIN_SECRET=<generate: openssl rand -hex 32>
FRONTEND_URL=https://your-kiosk.vercel.app
REMOVEBG_API_KEY=<your key>
FAL_API_KEY=<your key>
CLOUDINARY_CLOUD_NAME=<your name>
CLOUDINARY_API_KEY=<your key>
CLOUDINARY_API_SECRET=<your secret>
TWILIO_ACCOUNT_SID=<your SID>
TWILIO_AUTH_TOKEN=<your token>
TWILIO_PHONE_NUMBER=+1XXXXXXXXXX
TWILIO_WHATSAPP_FROM=whatsapp:+14155238886
```

5. Click **Deploy** → wait ~2 min
6. Test: `curl https://your-app.railway.app/health` → should return `{"status":"ok"}`
7. Note your Railway URL: `https://pixel-ai-backend.up.railway.app`

**Admin dashboard:** visit `https://your-app.railway.app/admin`

**Guest gallery:** `https://your-app.railway.app/gallery?event=demo`

---

## Step 3 — Deploy the frontend to Vercel (10 min)

1. Go to **vercel.com** → New Project → Import from GitHub
2. Select `aramirezflagship-jpg/valuconnect-vcie`
3. Set **Root Directory** to `pixel-ai/frontend`
4. Vercel auto-detects Vite

**Set environment variables:**
```
VITE_API_URL=https://your-app.railway.app
```

5. Click **Deploy** → wait ~1 min
6. Note your Vercel URL: `https://pixel-ai-kiosk.vercel.app`

7. Go back to Railway → update `FRONTEND_URL` to your Vercel URL → redeploy

**Test the full flow:**
- Open `https://pixel-ai-kiosk.vercel.app` in a browser
- Should show the welcome screen
- Try the camera → processing → delivery flow

---

## Step 4 — Set up the iPad as a kiosk (10 min)

1. Open Safari on the iPad
2. Navigate to `https://pixel-ai-kiosk.vercel.app?event=demo`
3. Tap the **Share** button (box with arrow) → **Add to Home Screen**
4. Name it "Pixel AI" → Add
5. Open the app from the home screen — it launches fullscreen

**Lock it down with Guided Access:**
1. Settings → Accessibility → Guided Access → toggle ON
2. Set a passcode (different from the iPad unlock passcode)
3. Open the Pixel AI app from the home screen
4. **Triple-click** the side button → Guided Access → Start
5. Guests are now locked to this app. Triple-click to exit (requires passcode)

---

## Step 5 — Create your first real event (5 min)

1. Go to `https://your-app.railway.app/admin`
2. Enter your `ADMIN_SECRET`
3. Click **Create Event**
4. Fill in: name, language, themes, delivery channels
5. Save → note the event **PIN** and **ID**
6. On the iPad, navigate to: `https://pixel-ai-kiosk.vercel.app?event=YOUR_EVENT_ID`

Share the gallery URL with the host: `https://your-app.railway.app/gallery?event=YOUR_EVENT_ID`

---

## Step 6 — Deploy the landing page to Vercel (5 min)

1. Vercel → New Project → same repo
2. Root Directory: `pixel-ai/landing`
3. No environment variables needed
4. Deploy → point your domain (e.g. pixelai.mx) to this Vercel project

**Before deploying:** replace all `521XXXXXXXXXX` in `landing/index.html` with your real WhatsApp number.

---

## Event Day Checklist

**Night before:**
- [ ] Charge iPad to 100%
- [ ] Test full pipeline (capture → AI → WhatsApp) with your own phone
- [ ] Verify Remove.bg, fal.ai, Cloudinary dashboards show no errors

**At the venue:**
- [ ] Set up iPad on stand, ring light on, backdrop positioned
- [ ] Open kiosk URL with correct `?event=ID`
- [ ] Add to Home Screen + enable Guided Access
- [ ] Send test photo to yourself
- [ ] Give host the gallery URL: `https://your-app.railway.app/gallery?event=ID`

**During the event:**
- [ ] Admin dashboard open on your phone for monitoring
- [ ] Watch for "queued photos" banner (offline signal issue)
- [ ] Check Railway logs if anything looks slow

**After the event:**
- [ ] Download gallery from admin dashboard
- [ ] Send gallery link to host
- [ ] Log stats (photos taken, delivery rate) for your records

---

## Costs per event (150 photos)

| Item | Per photo | 150 photos |
|---|---|---|
| Remove.bg | ~$0.20 | ~$30 |
| fal.ai generation | ~$0.05 | ~$7.50 |
| Twilio SMS | ~$0.02 | ~$3 |
| Twilio WhatsApp | ~$0.03 | ~$4.50 |
| Cloudinary storage | ~$0.001 | ~$0.15 |
| Railway hosting | fixed ~$10/mo | — |
| **Total variable** | **~$0.30** | **~$45** |

At $X per event package, your margin is $X – $45.

---

## Troubleshooting

**"CORS error" in browser console:**
→ `FRONTEND_URL` on Railway doesn't match the Vercel URL exactly. Update it and redeploy.

**"Background removal failed" in logs:**
→ Remove.bg API key is wrong or quota exceeded. Check remove.bg dashboard.

**Photo processing takes >30 seconds:**
→ fal.ai cold start. First photo of the day is slow; subsequent photos are fast.

**WhatsApp not sending:**
→ Phone number format must be E.164 (`+521XXXXXXXXXX` for Mexico). Check Twilio logs at console.twilio.com.

**iPad camera shows black screen:**
→ Safari needs camera permission. Settings app → Safari → Camera → Allow.

**"Add to Home Screen" missing from Share sheet:**
→ Must use Safari, not Chrome. The kiosk URL must be HTTPS (Vercel is always HTTPS).
