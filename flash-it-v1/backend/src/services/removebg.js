'use strict';

const axios = require('axios');
const sharp = require('sharp');

const FAL_BASE = 'https://fal.run';
const FAL_STORAGE = 'https://storage.fal.ai/upload';

/**
 * Remove the background from an image using fal.ai birefnet model.
 * Falls back to a no-op PNG conversion when FAL_API_KEY is absent.
 *
 * @param {Buffer} imageBuffer - Raw image bytes (JPEG, PNG, WebP, etc.)
 * @returns {Promise<Buffer>} PNG buffer with transparent background
 */
async function removeBackground(imageBuffer) {
  const apiKey = process.env.FAL_API_KEY;

  if (apiKey) {
    try {
      return await _falBirefnet(imageBuffer, apiKey);
    } catch (err) {
      console.warn('[removebg] fal.ai birefnet failed, using local fallback:', err.message);
    }
  } else {
    console.warn('[removebg] No FAL_API_KEY set — using local fallback (no real background removal)');
  }

  return _localFallback(imageBuffer);
}

/**
 * Upload image to fal.ai storage, then run birefnet for background removal.
 * @private
 */
async function _falBirefnet(imageBuffer, apiKey) {
  const headers = { Authorization: `Key ${apiKey}` };

  // Step 1 — upload buffer to fal.ai temp storage to get a URL
  const uploadRes = await axios.post(FAL_STORAGE, imageBuffer, {
    headers: {
      ...headers,
      'Content-Type': 'image/jpeg',
    },
    timeout: 30_000,
    maxContentLength: 20 * 1024 * 1024,
  });

  const imageUrl = uploadRes.data?.url;
  if (!imageUrl) throw new Error('fal.ai upload returned no URL');

  // Step 2 — run birefnet background removal
  const result = await axios.post(
    `${FAL_BASE}/fal-ai/birefnet`,
    { image_url: imageUrl, model: 'General Use (Light)', output_format: 'png' },
    { headers: { ...headers, 'Content-Type': 'application/json' }, timeout: 60_000 }
  );

  const outputUrl = result.data?.image?.url;
  if (!outputUrl) throw new Error('fal.ai birefnet returned no output URL');

  // Step 3 — download the transparent PNG result
  const download = await axios.get(outputUrl, { responseType: 'arraybuffer', timeout: 30_000 });
  return Buffer.from(download.data);
}

/**
 * Fallback: convert to PNG without background removal.
 * @private
 */
async function _localFallback(imageBuffer) {
  return sharp(imageBuffer).png().toBuffer();
}

module.exports = { removeBackground };
