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
  formData.append('themeId', themeId);
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
export async function sendDelivery(channel, phone, photoUrl, eventId) {
  const { data } = await api.post('/api/deliver', { channel, phone, photoUrl, eventId });
  return data;
}

export default api;
