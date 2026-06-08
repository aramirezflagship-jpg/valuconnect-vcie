import { base64ToBlob } from '../hooks/useOfflineQueue.js';

const MAX_RETRIES = 4;
// Exponential backoff delays in ms: 2s, 4s, 8s, 16s
const BACKOFF_DELAYS = [2000, 4000, 8000, 16000];

/**
 * Wait for a given number of milliseconds.
 * @param {number} ms
 * @returns {Promise<void>}
 */
function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Determine if an error is a network-level failure worth retrying.
 * @param {unknown} err
 * @returns {boolean}
 */
function isNetworkError(err) {
  if (!err) return false;
  // axios: no response means network error / timeout
  if (err.code === 'ECONNABORTED') return true;       // axios timeout
  if (err.code === 'ERR_NETWORK') return true;        // axios network error
  if (err.response == null && err.request != null) return true; // no response received
  return false;
}

/**
 * Process the offline queue by attempting to upload each item.
 *
 * @param {Array}    queue      - current queue items from useOfflineQueue
 * @param {Function} uploadFn   - async (item: QueueItem) => any — called with each item
 *                                Should accept the same args as uploadCapture but from a queue item.
 * @param {Function} onSuccess  - (item) => void  — called after a successful upload
 * @param {Function} onFailure  - (item) => void  — called when an item exhausts all retries
 * @returns {Promise<{ processed: number, failed: number }>}
 */
export async function processQueue(queue, uploadFn, onSuccess, onFailure) {
  let processed = 0;
  let failed = 0;

  // Only attempt items that haven't permanently failed
  const pending = queue.filter((item) => item.status !== 'failed');

  for (const item of pending) {
    let attempt = item.retries ?? 0;
    let succeeded = false;

    while (attempt < MAX_RETRIES) {
      // Apply backoff before every retry (not before the first attempt)
      if (attempt > 0) {
        await delay(BACKOFF_DELAYS[attempt - 1] ?? BACKOFF_DELAYS[BACKOFF_DELAYS.length - 1]);
      }

      try {
        // Reconstruct blob from base64 for upload
        const blob = base64ToBlob(item.blob, 'image/jpeg');
        const uploadItem = { ...item, blob };
        await uploadFn(uploadItem);
        succeeded = true;
        break;
      } catch (err) {
        attempt += 1;
        console.warn(`[retry] Item ${item.id} failed (attempt ${attempt}/${MAX_RETRIES}):`, err);

        if (!isNetworkError(err)) {
          // Non-network error (e.g. 4xx): no point retrying — mark failed immediately
          attempt = MAX_RETRIES;
          break;
        }
      }
    }

    if (succeeded) {
      processed += 1;
      if (typeof onSuccess === 'function') onSuccess(item);
    } else {
      failed += 1;
      // Mark item as permanently failed but leave it in the queue so the user can see it
      if (typeof onFailure === 'function') onFailure({ ...item, retries: attempt, status: 'failed' });
    }
  }

  return { processed, failed };
}
