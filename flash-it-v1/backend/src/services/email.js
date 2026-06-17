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

module.exports = { sendPhotoEmail, sendPasswordResetEmail };
