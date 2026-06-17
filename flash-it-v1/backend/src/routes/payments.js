'use strict';

const express = require('express');
const QRCode = require('qrcode');
const db = require('../services/db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

// ── Stripe init (graceful degradation if key not set) ─────────────────────────
let stripe = null;
if (process.env.STRIPE_SECRET_KEY) {
  stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
} else {
  console.warn('[payments] STRIPE_SECRET_KEY not set — Stripe features disabled.');
}

// ── SendGrid init (graceful degradation if key not set) ──────────────────────
let sgMail = null;
if (process.env.SENDGRID_API_KEY) {
  sgMail = require('@sendgrid/mail');
  sgMail.setApiKey(process.env.SENDGRID_API_KEY);
} else {
  console.warn('[payments] SENDGRID_API_KEY not set — emails will be logged to console.');
}

// ── web-push init ─────────────────────────────────────────────────────────────
let webpush = null;
if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
  webpush = require('web-push');
  webpush.setVapidDetails(
    'mailto:' + (process.env.SENDGRID_FROM_EMAIL || 'noreply@flash-it.app'),
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  );
} else {
  console.warn('[payments] VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY not set — push notifications disabled.');
}

// ── Plan catalogue ────────────────────────────────────────────────────────────
const PLANS = {
  starter: {
    price: 39,
    max_guests: 30,
    sms_credits_limit: 30,
    themes: ['galaxy'],
    expires_days: 7,
    label: 'Starter',
  },
  party: {
    price: 79,
    max_guests: 100,
    sms_credits_limit: 100,
    themes: ['galaxy', 'jungle', 'sunset'],
    expires_days: 30,
    label: 'Party',
  },
  celebration: {
    price: 149,
    max_guests: null,
    sms_credits_limit: 200,
    themes: null, // all themes
    expires_days: 90,
    label: 'Celebration',
  },
  brand: {
    price: 299,
    max_guests: null,
    sms_credits_limit: 500,
    themes: null, // all themes
    expires_days: 365,
    label: 'Brand',
  },
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function _buildThemes(allowedIds) {
  if (!allowedIds) return null;

  const ALL_THEMES = [
    {
      id: 'galaxy',
      name: 'Galaxy Dream',
      prompt: 'nebula galaxy space background, stars, cosmic purple and blue hues, ultra detailed',
      negativePrompt: 'people, text, watermark, blurry',
      style: 'photorealistic',
    },
    {
      id: 'jungle',
      name: 'Jungle Adventure',
      prompt: 'lush tropical jungle, exotic plants, golden light rays through canopy',
      negativePrompt: 'people, text, watermark',
      style: 'photorealistic',
    },
    {
      id: 'sunset',
      name: 'Golden Sunset',
      prompt: 'dramatic ocean sunset, golden and orange sky, silhouette horizon',
      negativePrompt: 'people, text, watermark',
      style: 'photorealistic',
    },
  ];

  const filtered = ALL_THEMES.filter((t) => allowedIds.includes(t.id));
  return filtered.length > 0 ? filtered : null;
}

function _generateInvoicePdf({ invoiceNumber, date, customerEmail, plan, eventName, eventDate, amount }) {
  return new Promise((resolve, reject) => {
    const PDFDocument = require('pdfkit');
    const chunks = [];

    const doc = new PDFDocument({ margin: 50, size: 'LETTER' });

    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    doc
      .fontSize(28)
      .fillColor('#7c3aed')
      .text('Flash-it', 50, 50)
      .fontSize(12)
      .fillColor('#6b7280')
      .text('Photo Booth · AI-Powered Experiences', 50, 85);

    doc.moveTo(50, 110).lineTo(562, 110).strokeColor('#e5e7eb').lineWidth(1).stroke();

    doc.fontSize(20).fillColor('#111827').text('INVOICE', 50, 130);
    doc.fontSize(11).fillColor('#374151');

    const leftCol = 50;
    const rightCol = 380;
    let y = 175;

    doc.font('Helvetica-Bold').text('Bill To:', leftCol, y);
    doc.font('Helvetica').text(customerEmail, leftCol, y + 16);

    doc.font('Helvetica-Bold').text('Invoice #:', rightCol, y);
    doc.font('Helvetica').text(invoiceNumber, rightCol + 80, y);

    doc.font('Helvetica-Bold').text('Date:', rightCol, y + 18);
    doc.font('Helvetica').text(date, rightCol + 80, y + 18);

    doc.font('Helvetica-Bold').text('Status:', rightCol, y + 36);
    doc.font('Helvetica').fillColor('#16a34a').text('PAID', rightCol + 80, y + 36);
    doc.fillColor('#374151');

    y += 80;

    doc.moveTo(50, y).lineTo(562, y).strokeColor('#e5e7eb').stroke();
    y += 10;

    doc
      .font('Helvetica-Bold').fontSize(10).fillColor('#6b7280')
      .text('DESCRIPTION', leftCol, y)
      .text('DETAILS', 220, y)
      .text('AMOUNT', 490, y, { align: 'right', width: 72 });

    y += 20;
    doc.moveTo(50, y).lineTo(562, y).strokeColor('#e5e7eb').stroke();
    y += 14;

    doc.font('Helvetica-Bold').fontSize(11).fillColor('#111827');
    doc.text(`Flash-it ${plan.label} Package`, leftCol, y);
    doc.font('Helvetica').text(`${plan.max_guests ?? 'Unlimited'} guests · ${plan.sms_credits_limit} SMS credits`, 220, y);
    doc.text(`$${amount}.00`, 490, y, { align: 'right', width: 72 });

    y += 20;

    doc.font('Helvetica').fillColor('#6b7280').fontSize(10);
    doc.text('Event Name', leftCol, y);
    doc.text(eventName, 220, y);
    y += 16;

    doc.text('Event Date', leftCol, y);
    doc.text(eventDate || 'TBD', 220, y);
    y += 16;

    doc.text('Valid For', leftCol, y);
    doc.text(`${plan.expires_days} days from activation`, 220, y);
    y += 30;

    doc.moveTo(50, y).lineTo(562, y).strokeColor('#e5e7eb').stroke();
    y += 14;

    doc
      .font('Helvetica-Bold').fontSize(13).fillColor('#111827')
      .text('Total', 380, y)
      .text(`$${amount}.00`, 490, y, { align: 'right', width: 72 });

    y += 16;
    doc.font('Helvetica').fontSize(10).fillColor('#16a34a').text('Payment received — thank you!', 380, y);

    doc
      .fontSize(9).fillColor('#9ca3af')
      .text('flash-it.app · support@flash-it.app', 50, 700, { align: 'center', width: 512 })
      .text('Thank you for choosing Flash-it for your event!', 50, 713, { align: 'center', width: 512 });

    doc.end();
  });
}

async function _sendConfirmationEmail({ customerEmail, eventName, eventCode, plan, invoicePdfBuffer }) {
  const frontendUrl = (process.env.FRONTEND_URL || 'http://localhost:3001').split(',')[0].trim();
  const eventUrl = `${frontendUrl}?event=${eventCode}`;
  const guestLabel = plan.max_guests != null ? `Up to ${plan.max_guests} guests` : 'Unlimited guests';

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #f9fafb; margin: 0; padding: 0; }
    .wrapper { max-width: 600px; margin: 40px auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,.08); }
    .header { background: linear-gradient(135deg, #7c3aed 0%, #a855f7 100%); padding: 36px 40px; }
    .header h1 { color: #fff; margin: 0; font-size: 28px; }
    .header p { color: rgba(255,255,255,.85); margin: 6px 0 0; font-size: 14px; }
    .body { padding: 36px 40px; }
    .highlight { background: #f5f3ff; border-left: 4px solid #7c3aed; border-radius: 6px; padding: 20px 24px; margin: 24px 0; }
    .highlight ul { margin: 0; padding: 0 0 0 18px; }
    .highlight li { color: #374151; font-size: 14px; line-height: 1.8; }
    .cta-btn { display: inline-block; background: #7c3aed; color: #fff !important; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 16px; margin: 20px 0; }
    .steps { margin: 28px 0; }
    .step { display: flex; gap: 14px; margin-bottom: 16px; align-items: flex-start; }
    .step-num { background: #7c3aed; color: #fff; border-radius: 50%; width: 28px; height: 28px; min-width: 28px; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 13px; }
    .step-text { font-size: 14px; color: #374151; padding-top: 4px; }
    .footer { background: #f3f4f6; padding: 20px 40px; text-align: center; font-size: 12px; color: #9ca3af; }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="header">
      <h1>Flash-it</h1>
      <p>Your event is ready to go!</p>
    </div>
    <div class="body">
      <p style="color:#111827;font-size:16px;">Hi there,</p>
      <p style="color:#374151;font-size:14px;">
        <strong>${eventName}</strong> is all set. Here's a quick look at what's included with your
        <strong>${plan.label}</strong> plan:
      </p>
      <div class="highlight">
        <ul>
          <li>Your event is <strong>live</strong> and ready to accept guests</li>
          <li><strong>${guestLabel}</strong></li>
          <li><strong>${plan.sms_credits_limit} SMS credits</strong> ready to send</li>
          <li>Photos processed in <strong>under 25 seconds</strong></li>
        </ul>
      </div>
      <p style="color:#374151;font-size:14px;">Share this link with guests or print the QR code poster:</p>
      <a href="${eventUrl}" class="cta-btn">Open Your Event Booth</a>
      <p style="font-size:11px;color:#9ca3af;">${eventUrl}</p>
      <div class="steps">
        <p style="font-weight:600;color:#111827;font-size:15px;">How it works</p>
        <div class="step">
          <div class="step-num">1</div>
          <div class="step-text">Print the QR code poster attached to this email and display it at your event.</div>
        </div>
        <div class="step">
          <div class="step-num">2</div>
          <div class="step-text">Guests scan the code or visit the event link on any device.</div>
        </div>
        <div class="step">
          <div class="step-num">3</div>
          <div class="step-text">Snap a photo — our AI removes the background, applies your chosen theme, and delivers the result by SMS in seconds.</div>
        </div>
      </div>
      <p style="color:#6b7280;font-size:13px;">Your invoice is attached to this email. If you have any questions, reply here or email <a href="mailto:support@flash-it.app">support@flash-it.app</a>.</p>
    </div>
    <div class="footer">flash-it.app · © 2026 Flash-it · All rights reserved</div>
  </div>
</body>
</html>`;

  const msg = {
    to: customerEmail,
    from: process.env.SENDGRID_FROM_EMAIL || 'noreply@flash-it.app',
    subject: `Your Flash-it event is ready! · ${eventName}`,
    html,
    attachments: [
      {
        content: invoicePdfBuffer.toString('base64'),
        filename: `invoice-${eventCode}.pdf`,
        type: 'application/pdf',
        disposition: 'attachment',
      },
    ],
  };

  if (sgMail) {
    await sgMail.send(msg);
    console.log(`[payments] Confirmation email sent to ${customerEmail}`);
  } else {
    console.log('[payments] Email not sent (no SendGrid key). Would have sent:');
    console.log(`  To: ${msg.to}`);
    console.log(`  Subject: ${msg.subject}`);
    console.log(`  Event URL: ${eventUrl}`);
  }
}

/**
 * Look up or create a user account for a customer email.
 * Uses Supabase when configured, local auth JSON store otherwise.
 * Returns accountId (uuid).
 */
async function _ensureAccount(customerEmail) {
  const supabase = require('../services/supabase');

  // Local auth fallback — create or find in users.json
  if (!supabase) {
    const localAuth = require('../services/localAuth');
    let existing = await localAuth.getUserByEmail(customerEmail);
    if (existing) return existing.id;
    // Create account with a random temp password; customer can reset later
    const { v4: uuidv4 } = require('uuid');
    const tempPw = uuidv4() + uuidv4();
    const newUser = await localAuth.createUser(customerEmail, tempPw, customerEmail.split('@')[0]);
    console.log(`[payments] Created local account for ${customerEmail} (id: ${newUser.id})`);
    return newUser.id;
  }

  // Check if account already exists by email
  const { data: existing } = await supabase
    .from('accounts')
    .select('id')
    .eq('email', customerEmail)
    .maybeSingle();

  if (existing) return existing.id;

  // Create Supabase auth user with a random temporary password
  const { v4: uuidv4 } = require('uuid');
  const tempPassword = uuidv4() + uuidv4(); // 72 random hex chars — user will reset

  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email: customerEmail,
    password: tempPassword,
    email_confirm: true,
  });

  if (authError) {
    console.error('[payments] Failed to create Supabase auth user:', authError.message);
    return null;
  }

  const userId = authData.user.id;
  const account = await db.createAccount(userId, customerEmail, customerEmail.split('@')[0]);
  return account ? account.id : null;
}

/**
 * Send a push notification to all subscriptions of an account.
 * Fails silently if VAPID keys are not set.
 */
async function _sendPushToAccount(accountId, title, body) {
  if (!webpush || !accountId) return;

  try {
    const subscriptions = await db.getPushSubscriptions(accountId);
    await Promise.all(
      subscriptions.map((sub) =>
        webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth_key } },
          JSON.stringify({ title, body })
        ).catch((err) => console.warn('[payments] Push send failed:', err.message))
      )
    );
  } catch (err) {
    console.warn('[payments] _sendPushToAccount error:', err.message);
  }
}

// ── Routes ────────────────────────────────────────────────────────────────────

/**
 * POST /api/payments/checkout
 * Body: { plan, customerEmail, eventName, eventDate }
 * Returns: { url }
 */
router.post('/checkout', async (req, res, next) => {
  try {
    if (!stripe) {
      return res.status(503).json({ error: 'Payment processing is not configured.' });
    }

    const { plan, customerEmail, eventName, eventDate } = req.body;

    if (!plan || !PLANS[plan]) {
      return res.status(400).json({
        error: `Invalid plan. Must be one of: ${Object.keys(PLANS).join(', ')}.`,
      });
    }
    if (!customerEmail) {
      return res.status(400).json({ error: 'customerEmail is required.' });
    }
    if (!eventName) {
      return res.status(400).json({ error: 'eventName is required.' });
    }

    const planConfig = PLANS[plan];
    const frontendUrl = (process.env.FRONTEND_URL || 'http://localhost:3001').split(',')[0].trim();

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'payment',
      customer_email: customerEmail,
      line_items: [
        {
          price_data: {
            currency: 'usd',
            unit_amount: planConfig.price * 100,
            product_data: {
              name: `Flash-it ${planConfig.label} Package`,
              description: `${planConfig.max_guests ?? 'Unlimited'} guests · ${planConfig.sms_credits_limit} SMS credits · ${planConfig.expires_days}-day event`,
            },
          },
          quantity: 1,
        },
      ],
      success_url: `${frontendUrl}/dashboard?session={CHECKOUT_SESSION_ID}`,
      cancel_url: `${frontendUrl}/pricing.html`,
      metadata: {
        plan,
        customerEmail,
        eventName,
        eventDate: eventDate || '',
      },
    });

    return res.json({ url: session.url });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/payments/webhook
 * Raw body — express.raw() applied per-route.
 * Stripe sends checkout.session.completed → create event + account + send email.
 */
router.post(
  '/webhook',
  express.raw({ type: 'application/json' }),
  async (req, res, next) => {
    if (!stripe) {
      console.warn('[payments/webhook] Stripe not configured — ignoring webhook.');
      return res.sendStatus(200);
    }

    const sig = req.headers['stripe-signature'];
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    if (!webhookSecret) {
      console.warn('[payments/webhook] STRIPE_WEBHOOK_SECRET not set — skipping signature verification.');
    }

    let event;
    try {
      if (webhookSecret) {
        event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
      } else {
        event = JSON.parse(req.body.toString());
      }
    } catch (err) {
      console.error('[payments/webhook] Signature verification failed:', err.message);
      return res.status(400).json({ error: `Webhook Error: ${err.message}` });
    }

    if (event.type !== 'checkout.session.completed') {
      return res.sendStatus(200);
    }

    try {
      const session = event.data.object;
      const { plan, customerEmail, eventName, eventDate } = session.metadata || {};

      if (!plan || !PLANS[plan]) {
        console.error('[payments/webhook] Unknown plan in session metadata:', plan);
        return res.sendStatus(200);
      }

      const planConfig = PLANS[plan];

      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + planConfig.expires_days);

      const themes = _buildThemes(planConfig.themes);

      // ── Create event record ────────────────────────────────────────────────
      const newEvent = await db.createEvent({
        name: eventName,
        date: eventDate || null,
        plan_tier: plan,
        max_guests: planConfig.max_guests,
        sms_credits_limit: planConfig.sms_credits_limit,
        expires_at: expiresAt.toISOString(),
        status: 'active',
        stripe_session_id: session.id,
        ...(themes ? { themes } : {}),
      });

      console.log(`[payments/webhook] Event created: ${newEvent.id} (plan=${plan})`);

      // ── Ensure account exists for the customer ─────────────────────────────
      const accountId = await _ensureAccount(customerEmail);

      if (accountId) {
        // Update stripe_customer_id on account if Stripe gave us one
        if (session.customer) {
          await db.updateAccount(accountId, { stripe_customer_id: session.customer }).catch(() => {});
        }

        // Link event to account
        await db.updateEvent(newEvent.id, { account_id: accountId }).catch(() => {});

        // Create payment record
        await db.createPaymentRecord({
          account_id: accountId,
          stripe_session_id: session.id,
          amount_cents: session.amount_total,
          plan_tier: plan,
          event_id: newEvent.id,
          status: 'completed',
          customer_email: customerEmail,
          event_name: eventName,
        });

        // Save in-app notification
        await db.saveNotification(
          accountId,
          'payment_confirmed',
          'Payment confirmed!',
          `Your Flash-it event "${eventName}" is ready.`
        );

        // Send push notification
        await _sendPushToAccount(
          accountId,
          'Payment confirmed!',
          `Your Flash-it event "${eventName}" is ready.`
        );
      }

      // ── Invoice PDF + email ────────────────────────────────────────────────
      const invoiceNumber = `FI-2026-${session.id.slice(-5).toUpperCase()}`;
      const invoiceDate = new Date().toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });

      const invoicePdfBuffer = await _generateInvoicePdf({
        invoiceNumber,
        date: invoiceDate,
        customerEmail,
        plan: { ...planConfig, label: planConfig.label },
        eventName,
        eventDate: eventDate || 'TBD',
        amount: planConfig.price,
      });

      await _sendConfirmationEmail({
        customerEmail,
        eventName,
        eventCode: newEvent.id,
        plan: planConfig,
        invoicePdfBuffer,
      });

      return res.sendStatus(200);
    } catch (err) {
      console.error('[payments/webhook] Handler error:', err);
      return res.sendStatus(200);
    }
  }
);

/**
 * POST /api/payments/portal
 * Requires auth. Creates a Stripe Customer Portal session for the logged-in user.
 * Returns: { url }
 */
router.post('/portal', requireAuth, async (req, res, next) => {
  try {
    if (!stripe) {
      return res.status(503).json({ error: 'Payment processing is not configured.' });
    }

    const account = await db.getAccount(req.userId);
    if (!account || !account.stripe_customer_id) {
      return res.status(404).json({ error: 'No billing account found. Complete a purchase first.' });
    }

    const frontendUrl = (process.env.FRONTEND_URL || 'http://localhost:3001').split(',')[0].trim();

    const portalSession = await stripe.billingPortal.sessions.create({
      customer: account.stripe_customer_id,
      return_url: `${frontendUrl}/dashboard`,
    });

    return res.json({ url: portalSession.url });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/payments/history
 * Requires auth. Returns all payment records for the logged-in account.
 */
router.get('/history', requireAuth, async (req, res, next) => {
  try {
    const payments = await db.getPaymentHistory(req.userId);
    return res.json({ payments, count: payments.length });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
