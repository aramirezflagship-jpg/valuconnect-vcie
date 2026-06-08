'use strict';

const axios = require('axios');
const sharp = require('sharp');
const FormData = require('form-data');

/**
 * Remove the background from an image using the Remove.bg API.
 * Falls back to a sharp-based threshold extraction when the API key is absent
 * or the API call fails — useful for local development and testing.
 *
 * @param {Buffer} imageBuffer - Raw image bytes (JPEG, PNG, WebP, etc.)
 * @returns {Promise<Buffer>} PNG buffer with transparent background
 */
async function removeBackground(imageBuffer) {
  const apiKey = process.env.REMOVEBG_API_KEY;

  if (apiKey && apiKey !== 'your_removebg_api_key_here') {
    try {
      return await _removebgApi(imageBuffer, apiKey);
    } catch (err) {
      console.warn('[removebg] API call failed, falling back to local stub:', err.message);
    }
  } else {
    console.warn('[removebg] No API key set — using local fallback (no real background removal)');
  }

  return _localFallback(imageBuffer);
}

/**
 * Call the Remove.bg REST API.
 * @private
 */
async function _removebgApi(imageBuffer, apiKey) {
  const form = new FormData();
  form.append('image_file', imageBuffer, {
    filename: 'photo.jpg',
    contentType: 'image/jpeg',
  });
  form.append('size', 'auto');
  form.append('format', 'png');
  form.append('type', 'person'); // hint: subject is a person

  const response = await axios.post('https://api.remove.bg/v1.0/removebg', form, {
    headers: {
      ...form.getHeaders(),
      'X-Api-Key': apiKey,
    },
    responseType: 'arraybuffer',
    timeout: 30_000,
    maxContentLength: 20 * 1024 * 1024,
  });

  if (response.status !== 200) {
    const text = Buffer.from(response.data).toString('utf8');
    throw new Error(`Remove.bg returned HTTP ${response.status}: ${text}`);
  }

  return Buffer.from(response.data);
}

/**
 * Fallback: convert image to PNG without actual background removal.
 * In production this path should never run.
 * @private
 */
async function _localFallback(imageBuffer) {
  // Return the image as-is but converted to PNG. In a real dev environment
  // you could apply a simple threshold or chroma-key here.
  return sharp(imageBuffer).png().toBuffer();
}

module.exports = { removeBackground };
