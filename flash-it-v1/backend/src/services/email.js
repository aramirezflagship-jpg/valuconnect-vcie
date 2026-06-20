'use strict';
// Uses SENDGRID_API_KEY + SENDGRID_FROM_EMAIL env vars
// Falls back gracefully (logs warning) if not configured

const sgMail = require('@sendgrid/mail');
// Only initialize if key exists
if (process.env.SENDGRID_API_KEY) sgMail.setApiKey(process.env.SENDGRID_API_KEY);

/**
 * Send a branded photo delivery email to a guest.
 * @param {string} to - guest email
 * @param {string} photoUrl - R2 public URL of the photo
 * @param {string} eventName - event display name
 * @param {string} [gifUrl] - optional GIF URL
 */
async function sendPhotoEmail(to, photoUrl, eventName, gifUrl = null) {
  if (!process.env.SENDGRID_API_KEY) {
    console.warn('[email] SENDGRID_API_KEY not set — skipping email delivery');
    return { skipped: true };
  }
  const from = process.env.SENDGRID_FROM_EMAIL || 'photos@flash-it.app';
  const mediaUrl = gifUrl || photoUrl;
  const isGif = !!gifUrl;

  const html = `
    <!DOCTYPE html><html><body style="margin:0;padding:0;background:#0d0d1a;font-family:system-ui,sans-serif;color:#f1f5f9;">
    <div style="max-width:560px;margin:0 auto;padding:2rem 1rem;">
      <div style="text-align:center;margin-bottom:1.5rem;">
        <span style="font-size:2rem;font-weight:800;background:linear-gradient(135deg,#7c3aed,#a855f7);-webkit-background-clip:text;-webkit-text-fill-color:transparent;">⚡ Flash-it</span>
      </div>
      <h1 style="font-size:1.4rem;font-weight:700;text-align:center;margin-bottom:.5rem;">Your ${isGif ? 'GIF' : 'photo'} from <em>${eventName}</em> is ready!</h1>
      <p style="text-align:center;color:#94a3b8;margin-bottom:1.5rem;">Tap below to view and download your memory.</p>
      <div style="text-align:center;margin-bottom:1.5rem;">
        <a href="${mediaUrl}" style="background:linear-gradient(135deg,#7c3aed,#a855f7);color:#fff;text-decoration:none;padding:.9rem 2rem;border-radius:12px;font-weight:700;font-size:1rem;display:inline-block;">
          📸 View & Download
        </a>
      </div>
      <img src="${photoUrl}" alt="Your photo" style="width:100%;border-radius:12px;margin-bottom:1rem;" />
      <p style="text-align:center;font-size:.75rem;color:#475569;">Powered by Flash-it by ValuConnect Solutions</p>
    </div></body></html>
  `;

  await sgMail.send({
    to,
    from,
    subject: `Your photo from ${eventName} 📸`,
    html,
  });
  return { sent: true };
}

/**
 * Send a password-reset email with a single-use link.
 * @param {string} to - account email
 * @param {string} resetUrl - full reset link including ?token=...
 * @returns {Promise<{sent:boolean}|{skipped:boolean}>}
 */
async function sendPasswordResetEmail(to, resetUrl) {
  if (!process.env.SENDGRID_API_KEY) {
    console.warn('[email] SENDGRID_API_KEY not set — skipping password-reset email');
    return { skipped: true };
  }
  const from = process.env.SENDGRID_FROM_EMAIL || 'photos@flash-it.app';

  const html = `
    <!DOCTYPE html><html><body style="margin:0;padding:0;background:#0d0d1a;font-family:system-ui,sans-serif;color:#f1f5f9;">
    <div style="max-width:560px;margin:0 auto;padding:2rem 1rem;">
      <div style="text-align:center;margin-bottom:1.5rem;">
        <span style="font-size:2rem;font-weight:800;background:linear-gradient(135deg,#7c3aed,#a855f7);-webkit-background-clip:text;-webkit-text-fill-color:transparent;">⚡ Flash-it</span>
      </div>
      <h1 style="font-size:1.4rem;font-weight:700;text-align:center;margin-bottom:.5rem;">Reset your password</h1>
      <p style="text-align:center;color:#94a3b8;margin-bottom:1.5rem;">We got a request to reset your Flash-it password. This link is good for 15 minutes. If you didn't ask for this, you can safely ignore this email.</p>
      <div style="text-align:center;margin-bottom:1.5rem;">
        <a href="${resetUrl}" style="background:linear-gradient(135deg,#7c3aed,#a855f7);color:#fff;text-decoration:none;padding:.9rem 2rem;border-radius:12px;font-weight:700;font-size:1rem;display:inline-block;">
          🔑 Reset password
        </a>
      </div>
      <p style="text-align:center;font-size:.8rem;color:#64748b;word-break:break-all;">Or paste this link into your browser:<br/>${resetUrl}</p>
      <p style="text-align:center;font-size:.75rem;color:#475569;margin-top:1.5rem;">Powered by Flash-it by ValuConnect Solutions</p>
    </div></body></html>
  `;

  await sgMail.send({
    to,
    from,
    subject: 'Reset your Flash-it password',
    html,
  });
  return { sent: true };
}

/**
 * Bilingual, Andres-voice auto-reply sent to a Full Service LEAD the moment
 * they submit the "Request Full Service" form. This is a transactional
 * acknowledgement (the person just gave us their email expecting contact) — it
 * confirms receipt, sets a 24h expectation, and recaps what they sent so it
 * reads personal. NOT a marketing blast; needs no marketing opt-in.
 *
 * @param {object} lead  { name, email, eventType, eventDate, estimatedGuests, location, lang }
 * @returns {Promise<{sent:boolean}|{skipped:boolean}>}
 */
async function sendLeadAutoReply(lead) {
  if (!process.env.SENDGRID_API_KEY) {
    console.warn('[email] SENDGRID_API_KEY not set — skipping lead auto-reply');
    return { skipped: true };
  }
  if (!lead || !lead.email) return { skipped: true };

  const from = process.env.SENDGRID_FROM_EMAIL || 'photos@flash-it.app';
  const replyTo = process.env.LEAD_REPLY_TO || 'info@vcsolutions.us';
  const es = String(lead.lang || '').toLowerCase().startsWith('es');
  const firstName = String(lead.name || '').trim().split(/\s+/)[0] || (es ? 'Hola' : 'there');

  // Recap rows (only the fields they actually provided).
  const recap = [
    lead.eventType ? [es ? 'Evento' : 'Event', lead.eventType] : null,
    lead.eventDate ? [es ? 'Fecha' : 'Date', lead.eventDate] : null,
    lead.estimatedGuests != null ? [es ? 'Invitados' : 'Guests', String(lead.estimatedGuests)] : null,
    lead.location ? [es ? 'Lugar' : 'Location', lead.location] : null,
  ].filter(Boolean);
  const recapHtml = recap.length
    ? `<table style="margin:0 auto 1.25rem;border-collapse:collapse;font-size:.9rem;color:#cbd5e1;">${recap
        .map(([k, v]) => `<tr><td style="padding:.2rem .75rem .2rem 0;color:#94a3b8;">${k}:</td><td style="padding:.2rem 0;font-weight:600;">${v}</td></tr>`)
        .join('')}</table>`
    : '';

  const copy = es
    ? {
        subject: `¡Gracias ${firstName}! Recibí tu solicitud de Flash-it 🎉`,
        h1: `¡Gracias por escribirme, ${firstName}!`,
        p1: 'Soy Andres, de Flash-it (ValuConnect Solutions). Recibí tu solicitud y la reviso personalmente.',
        p2: 'Te contactaré dentro de las próximas <b>24 horas</b> con los siguientes pasos para tu evento. Si es urgente, simplemente responde a este correo.',
        recapTitle: 'Esto fue lo que me enviaste:',
        signoff: '¡Hablamos pronto!<br/>— Andres, Flash-it',
      }
    : {
        subject: `Thanks ${firstName} — I got your Flash-it request 🎉`,
        h1: `Thanks for reaching out, ${firstName}!`,
        p1: "I'm Andres, from Flash-it (ValuConnect Solutions). Your request came through and I review every one personally.",
        p2: "I'll get back to you within the next <b>24 hours</b> with the next steps for your event. If it's urgent, just reply to this email.",
        recapTitle: "Here's what you sent me:",
        signoff: 'Talk soon!<br/>— Andres, Flash-it',
      };

  const html = `
    <!DOCTYPE html><html><body style="margin:0;padding:0;background:#0d0d1a;font-family:system-ui,sans-serif;color:#f1f5f9;">
    <div style="max-width:560px;margin:0 auto;padding:2rem 1rem;">
      <div style="text-align:center;margin-bottom:1.5rem;">
        <span style="font-size:2rem;font-weight:800;background:linear-gradient(135deg,#7c3aed,#a855f7);-webkit-background-clip:text;-webkit-text-fill-color:transparent;">⚡ Flash-it</span>
      </div>
      <h1 style="font-size:1.4rem;font-weight:700;text-align:center;margin-bottom:.75rem;">${copy.h1}</h1>
      <p style="text-align:center;color:#cbd5e1;margin-bottom:1rem;line-height:1.6;">${copy.p1}</p>
      <p style="text-align:center;color:#cbd5e1;margin-bottom:1.5rem;line-height:1.6;">${copy.p2}</p>
      ${recapHtml ? `<p style="text-align:center;color:#94a3b8;font-size:.85rem;margin-bottom:.4rem;">${copy.recapTitle}</p>${recapHtml}` : ''}
      <p style="text-align:center;color:#f1f5f9;margin-top:1rem;line-height:1.6;">${copy.signoff}</p>
      <p style="text-align:center;font-size:.75rem;color:#475569;margin-top:1.5rem;">Flash-it by ValuConnect Solutions</p>
    </div></body></html>
  `;

  await sgMail.send({ to: lead.email, from, replyTo, subject: copy.subject, html });
  return { sent: true };
}

/**
 * Send a generic email (used by the admin message-template sender). Caller
 * supplies the full subject + HTML (already brand-wrapped if desired).
 * @param {{to:string, subject:string, html:string, replyTo?:string}} msg
 * @returns {Promise<{sent:boolean}|{skipped:boolean}>}
 */
async function sendEmail({ to, subject, html, replyTo }) {
  if (!process.env.SENDGRID_API_KEY) {
    console.warn('[email] SENDGRID_API_KEY not set — skipping sendEmail');
    return { skipped: true };
  }
  if (!to) return { skipped: true };
  const from = process.env.SENDGRID_FROM_EMAIL || 'photos@flash-it.app';
  await sgMail.send({ to, from, replyTo: replyTo || process.env.LEAD_REPLY_TO || 'info@vcsolutions.us', subject: subject || '', html: html || '' });
  return { sent: true };
}

module.exports = { sendPhotoEmail, sendPasswordResetEmail, sendLeadAutoReply, sendEmail };
