import { useState, useEffect, useCallback } from 'react';

const STORAGE_KEY = 'pixel-ai-queue';

/**
 * Convert a Blob to a base64 data URL string.
 * @param {Blob} blob
 * @returns {Promise<string>}
 */
export function fileToBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result); // "data:<mime>;base64,<data>"
    reader.onerror = () => reject(new Error('FileReader failed'));
    reader.readAsDataURL(blob);
  });
}

/**
 * Convert a base64 data URL back to a Blob.
 * @param {string} b64       - "data:<mime>;base64,<data>" or raw base64 string
 * @param {string} mimeType
 * @returns {Blob}
 */
export function base64ToBlob(b64, mimeType = 'image/jpeg') {
  const base64Data = b64.includes(',') ? b64.split(',')[1] : b64;
  const byteChars = atob(base64Data);
  const byteNums = new Array(byteChars.length);
  for (let i = 0; i < byteChars.length; i++) {
    byteNums[i] = byteChars.charCodeAt(i);
  }
  return new Blob([new Uint8Array(byteNums)], { type: mimeType });
}

function readFromStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function writeToStorage(queue) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(queue));
  } catch (err) {
    console.warn('[useOfflineQueue] Could not persist queue to localStorage:', err);
  }
}

/**
 * Hook that manages a persistent offline upload queue.
 *
 * Queue item shape:
 *   { id, blob (base64 data URL), eventId, themeId, phone, timestamp, retries }
 *
 * @returns {{ queue, addToQueue, removeFromQueue, updateInQueue, queueSize }}
 */
export default function useOfflineQueue() {
  const [queue, setQueue] = useState(() => readFromStorage());

  // Keep localStorage in sync whenever queue changes
  useEffect(() => {
    writeToStorage(queue);
  }, [queue]);

  /**
   * Add a failed upload to the queue.
   * Accepts a raw Blob and converts it to base64 for persistent storage.
   *
   * @param {Blob}   blob
   * @param {string} eventId
   * @param {string} themeId
   * @param {string} [phone]
   * @returns {Promise<string>} the new item's id
   */
  const addToQueue = useCallback(async (blob, eventId, themeId, phone = '') => {
    const b64 = await fileToBase64(blob);
    const item = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      blob: b64,
      eventId,
      themeId,
      phone,
      timestamp: Date.now(),
      retries: 0,
    };
    setQueue((prev) => {
      const next = [...prev, item];
      writeToStorage(next);
      return next;
    });
    return item.id;
  }, []);

  /**
   * Remove an item from the queue by id.
   * @param {string} id
   */
  const removeFromQueue = useCallback((id) => {
    setQueue((prev) => {
      const next = prev.filter((item) => item.id !== id);
      writeToStorage(next);
      return next;
    });
  }, []);

  /**
   * Update a queue item in-place (e.g. increment retries or mark failed).
   * @param {string} id
   * @param {Object} patch
   */
  const updateInQueue = useCallback((id, patch) => {
    setQueue((prev) => {
      const next = prev.map((item) => (item.id === id ? { ...item, ...patch } : item));
      writeToStorage(next);
      return next;
    });
  }, []);

  return {
    queue,
    addToQueue,
    removeFromQueue,
    updateInQueue,
    // Count only items that haven't permanently failed
    queueSize: queue.filter((i) => i.status !== 'failed').length,
  };
}
