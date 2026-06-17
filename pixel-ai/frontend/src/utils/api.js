import axios from 'axios';

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 60_000, // generous — AI processing can take a while
});

// ── Demo mode ─────────────────────────────────────────────────────────────────
// Active when VITE_DEMO_MODE=true OR when the backend health check fails within
// 4 seconds (e.g. GitHub Pages deploy without a live backend).
let _demoMode = import.meta.env.VITE_DEMO_MODE === 'true';
let _healthChecked = false;

async function checkBackendReachable() {
  if (_healthChecked) return;
  _healthChecked = true;
  try {
    await axios.get(`${BASE_URL}/health`, { timeout: 4000 });
  } catch {
    console.warn('[api] Backend unreachable — switching to demo mode');
    _demoMode = true;
  }
}

// Kick off the health check immediately so it resolves before the first capture.
checkBackendReachable();

/**
 * Fetch event configuration from the backend.
 * @param {string} eventId
 * @returns {Promise<Object>} event config object
 */
export async function getEventConfig(eventId) {
  await checkBackendReachable();
  if (_demoMode) return null; // caller falls back to default config
  const { data } = await api.get(`/api/events/${encodeURIComponent(eventId)}`);
  return data;
}

/**
 * Upload a captured photo for AI processing.
 *
 * @param {Blob}   imageBlob  - JPEG/PNG blob from canvas capture
 * @param {string} eventId    - event identifier
 * @param {string} themeId    - selected theme id
 * @param {string} [phone]    - optional phone number for delivery
 * @param {Function} [onProgress] - optional upload progress callback (0-100)
 * @returns {Promise<{ jobId: string, resultUrl?: string }>}
 */
export async function uploadCapture(imageBlob, eventId, themeId, phone = '', onProgress) {
  await checkBackendReachable();

  // Demo mode: skip the backend and return the original capture as the result.
  if (_demoMode) {
    if (onProgress) onProgress(100);
    await new Promise((r) => setTimeout(r, 1800)); // simulate brief processing
    const resultUrl = URL.createObjectURL(imageBlob);
    return { resultUrl, demo: true };
  }

  const formData = new FormData();
  formData.append('image', imageBlob, 'capture.jpg');
  formData.append('eventId', eventId);
  // Backend accepts either `backgroundId` or its legacy alias `themeId`; we send
  // both so a selected themed background is composited regardless of field name.
  if (themeId) {
    formData.append('backgroundId', themeId);
    formData.append('themeId', themeId);
  }
  if (phone) formData.append('phone', phone);

  const { data } = await api.post('/api/capture', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    onUploadProgress: (evt) => {
      if (onProgress && evt.total) {
        onProgress(Math.round((evt.loaded * 100) / evt.total));
      }
    },
  });

  return data; // { jobId, resultUrl?, statusUrl? }
}

/**
 * Poll a job status URL until complete or error.
 * @param {string} statusUrl
 * @param {{ intervalMs?: number, timeoutMs?: number }} [opts]
 * @returns {Promise<{ resultUrl: string }>}
 */
export async function pollJobStatus(statusUrl, { intervalMs = 2000, timeoutMs = 120_000 } = {}) {
  const deadline = Date.now() + timeoutMs;

  return new Promise((resolve, reject) => {
    const check = async () => {
      if (Date.now() > deadline) {
        reject(new Error('Polling timed out'));
        return;
      }
      try {
        const { data } = await api.get(statusUrl);
        if (data.status === 'done') {
          resolve(data);
        } else if (data.status === 'error') {
          reject(new Error(data.message || 'Processing failed'));
        } else {
          setTimeout(check, intervalMs);
        }
      } catch (err) {
        reject(err);
      }
    };
    check();
  });
}

/**
 * Send the photo link via SMS or WhatsApp.
 * @param {'sms'|'whatsapp'} channel
 * @param {string} phone
 * @param {string} photoUrl
 * @param {string} eventId
 */
export async function sendDelivery(method, to, photoUrl, eventId, eventName, gifUrl) {
  const { data } = await api.post('/api/deliver', { method, to, photoUrl, eventId, eventName, gifUrl });
  return data;
}

/**
 * Fetch all photos for an event gallery.
 * @param {string} eventId
 * @returns {Promise<{ photos: Array }>}
 */
export async function getEventGallery(eventId) {
  await checkBackendReachable();
  if (_demoMode) {
    // Return empty gallery in demo mode
    return { photos: [] };
  }
  const { data } = await api.get(`/api/events/${encodeURIComponent(eventId)}/gallery`);
  return data;
}

/**
 * Fetch event stats (config + usage counts).
 * @param {string} eventId
 * @returns {Promise<Object>} event object with guest_count, sms_credits_used, etc.
 */
export async function getEventStats(eventId) {
  await checkBackendReachable();
  if (_demoMode) {
    // Return mock stats in demo mode
    return {
      eventId,
      name: 'Demo Event',
      status: 'active',
      guest_count: 0,
      max_guests: null,
      sms_credits_used: 0,
      sms_credits_limit: 30,
      expiresAt: null,
    };
  }
  const { data } = await api.get(`/api/events/${encodeURIComponent(eventId)}`);
  return data;
}

// ── Auth helpers ──────────────────────────────────────────────────────────────

/**
 * Build Authorization header object from a token.
 * @param {string|null} token
 * @returns {Object}
 */
export function authHeaders(token) {
  return token ? { Authorization: `Bearer ${token}` } : {};
}

// ── Authenticated API calls ───────────────────────────────────────────────────

/**
 * Fetch payment history for the authenticated account.
 * @param {string} token
 * @returns {Promise<Array>}
 */
export async function getPaymentHistory(token) {
  const { data } = await api.get('/api/payments/history', {
    headers: authHeaders(token),
  });
  return data;
}

/**
 * Open the Stripe customer portal — returns the portal URL.
 * @param {string} token
 * @returns {Promise<{ url: string }>}
 */
export async function openCustomerPortal(token) {
  const { data } = await api.post('/api/payments/portal', {}, {
    headers: authHeaders(token),
  });
  return data;
}

/**
 * Fetch notifications for the authenticated account.
 * @param {string} token
 * @returns {Promise<Array>}
 */
export async function getNotifications(token) {
  const { data } = await api.get('/api/notifications', {
    headers: authHeaders(token),
  });
  return data;
}

/**
 * Mark a specific notification as read.
 * @param {string|number} id
 * @param {string} token
 * @returns {Promise<Object>}
 */
export async function markNotificationRead(id, token) {
  const { data } = await api.patch(`/api/notifications/${encodeURIComponent(id)}/read`, {}, {
    headers: authHeaders(token),
  });
  return data;
}

/**
 * Send a push subscription to the backend for storage.
 * @param {PushSubscription} subscription
 * @param {string} token
 * @returns {Promise<Object>}
 */
export async function subscribeToPush(subscription, token) {
  const { data } = await api.post('/api/push/subscribe', subscription, {
    headers: authHeaders(token),
  });
  return data;
}

/**
 * Initiate a Stripe checkout for an event add-on.
 * @param {string} eventId
 * @param {string} addon  add-on identifier
 * @param {string} token
 * @returns {Promise<{ url: string }>}
 */
export async function purchaseAddon(eventId, addon, token) {
  const { data } = await api.post(
    `/api/events/${encodeURIComponent(eventId)}/add-on`,
    { addon },
    { headers: authHeaders(token) }
  );
  return data;
}

// ── Host events (self-serve) ──────────────────────────────────────────────────

/**
 * Create an event owned by the logged-in host.
 * @param {Object} payload { name, date?, venue?, deliveryChannels?, backgroundIds?, defaultBackgroundId? }
 * @param {string} token
 * @returns {Promise<Object>} created event { id, code, pin, name, ... }
 */
export async function createMyEvent(payload, token) {
  const { data } = await api.post('/api/events/mine', payload, {
    headers: authHeaders(token),
  });
  return data;
}

/**
 * List events owned by the logged-in host.
 * @param {string} token
 * @returns {Promise<{ events: Array, count: number }>}
 */
export async function getMyEvents(token) {
  const { data } = await api.get('/api/events/mine', {
    headers: authHeaders(token),
  });
  return data;
}

// ── Backgrounds (themed art per occasion) ─────────────────────────────────────

/**
 * List themed backgrounds/templates, optionally filtered by category and mode.
 *
 * @param {string} [category]  one of wedding, quinceanera, corporate, birthday, holiday, fiesta
 * @param {'natural'|'character'} [mode]  template mode filter
 * @returns {Promise<{ backgrounds: Array<{ id, category, mode, name, url, thumbnailUrl, faceSlot? }>, count: number }>}
 */
export async function getBackgrounds(category, mode) {
  const params = {};
  if (category) params.category = category;
  if (mode) params.mode = mode;
  const { data } = await api.get('/api/backgrounds', {
    params: Object.keys(params).length ? params : undefined,
  });
  return data;
}

/**
 * Upload a new themed background / template.
 *
 * multipart fields: image (file) + category + mode + name [+ faceSlot JSON].
 *  - natural: transparent frame PNG (image optional)
 *  - character: artwork PNG with transparent face hole (image required) AND
 *    faceSlot is REQUIRED — an object { x, y, width, height, shape } in absolute
 *    pixels on the artwork's own canvas (top-left origin).
 *
 * @param {Object}  opts
 * @param {File}    [opts.image]      artwork / frame PNG
 * @param {string}  opts.category
 * @param {'natural'|'character'} opts.mode
 * @param {string}  opts.name
 * @param {Object}  [opts.faceSlot]   { x, y, width, height, shape } — required for character
 * @param {string}  token             Bearer JWT
 * @returns {Promise<Object>} background record { id, category, mode, name, url, thumbnailUrl, faceSlot? }
 */
export async function uploadBackground({ image, category, mode, name, faceSlot }, token) {
  const formData = new FormData();
  if (image) formData.append('image', image);
  formData.append('category', category);
  if (mode) formData.append('mode', mode);
  formData.append('name', name);
  if (faceSlot) formData.append('faceSlot', JSON.stringify(faceSlot));
  const { data } = await api.post('/api/backgrounds', formData, {
    headers: { ...authHeaders(token), 'Content-Type': 'multipart/form-data' },
  });
  return data;
}

// ── Two-mode capture (natural frame · character face-in-hole) ─────────────────

/**
 * Capture in NATURAL mode — the full on-the-spot photo, composited with a themed
 * frame/overlay + 3D event message. Sends the photo as `imageBase64`.
 *
 * @param {Object} opts
 * @param {string} opts.eventId
 * @param {string} opts.imageBase64     data-URI of the full photo
 * @param {string} [opts.backgroundId]  chosen natural template id (optional)
 * @param {string} [opts.message]
 * @param {string} [opts.category]
 * @param {string} [opts.guestPhone]    E.164 → SMS
 * @returns {Promise<{ resultUrl, photoUrl, thumbnailUrl, qrCode, mode, eventId, backgroundId }>}
 */
export async function captureNatural({ eventId, imageBase64, backgroundId, message, category, guestPhone }) {
  const { data } = await api.post('/api/capture', {
    eventId,
    mode: 'natural',
    imageBase64,
    ...(backgroundId ? { backgroundId } : {}),
    ...(message ? { message } : {}),
    ...(category ? { category } : {}),
    ...(guestPhone ? { guestPhone } : {}),
  });
  return data;
}

/**
 * Capture in CHARACTER mode — the client-cropped guest face is dropped into a
 * pre-made character/scene template. Sends the cropped face as `faceImageBase64`.
 * `backgroundId` MUST reference a `character` template.
 *
 * @param {Object} opts
 * @param {string} opts.eventId
 * @param {string} opts.faceImageBase64  data-URI of the client-cropped face
 * @param {string} opts.backgroundId     chosen character template id (required)
 * @param {string} [opts.message]
 * @param {string} [opts.category]
 * @param {string} [opts.guestPhone]     E.164 → SMS
 * @returns {Promise<{ resultUrl, photoUrl, thumbnailUrl, qrCode, mode, eventId, backgroundId }>}
 */
export async function captureCharacter({ eventId, faceImageBase64, backgroundId, message, category, guestPhone }) {
  const { data } = await api.post('/api/capture', {
    eventId,
    mode: 'character',
    faceImageBase64,
    backgroundId,
    ...(message ? { message } : {}),
    ...(category ? { category } : {}),
    ...(guestPhone ? { guestPhone } : {}),
  });
  return data;
}

// ── Password reset ────────────────────────────────────────────────────────────

/**
 * Request a password-reset email. Always resolves (no user enumeration).
 * @param {string} email
 * @returns {Promise<{ ok: true }>}
 */
export async function requestPasswordReset(email) {
  const { data } = await api.post('/api/accounts/forgot-password', { email });
  return data;
}

/**
 * Complete a password reset with the emailed token.
 * @param {string} token
 * @param {string} newPassword
 * @returns {Promise<{ ok: true }>}
 */
export async function resetPassword(token, newPassword) {
  const { data } = await api.post('/api/accounts/reset-password', { token, newPassword });
  return data;
}

export default api;
