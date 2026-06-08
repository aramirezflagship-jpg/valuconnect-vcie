'use strict';

const axios = require('axios');
const sharp = require('sharp');

// fal.ai base URL for REST access
const FAL_BASE = 'https://fal.run';

/**
 * Transform a cutout (transparent-background PNG) by generating a themed
 * background with fal.ai and compositing the subject onto it.
 *
 * @param {Buffer} cutoutBuffer - PNG with transparent background (subject only)
 * @param {{ id: string, name: string, prompt: string, negativePrompt?: string, style?: string }} theme
 * @param {object} eventConfig - Full event configuration object
 * @returns {Promise<Buffer>} Composited JPEG buffer (subject on AI background)
 */
async function transformWithTheme(cutoutBuffer, theme, eventConfig) {
  const apiKey = process.env.FAL_API_KEY;

  if (apiKey && apiKey !== 'your_fal_ai_api_key_here') {
    try {
      return await _falTransform(cutoutBuffer, theme, apiKey);
    } catch (err) {
      console.warn('[ai-transform] fal.ai call failed, falling back to gradient:', err.message);
    }
  } else {
    console.warn('[ai-transform] No FAL_API_KEY set — using gradient fallback');
  }

  return _gradientFallback(cutoutBuffer, theme);
}

/**
 * Generate a background image via fal.ai FLUX and composite the cutout onto it.
 * @private
 */
async function _falTransform(cutoutBuffer, theme, apiKey) {
  // Get subject dimensions so we can match the background size
  const meta = await sharp(cutoutBuffer).metadata();
  const width = meta.width || 1200;
  const height = meta.height || 1800;

  // ── Step 1: Generate background with fal.ai FLUX/dev ─────────────────────
  const prompt = _buildPrompt(theme);

  const falResponse = await axios.post(
    `${FAL_BASE}/fal-ai/flux/dev`,
    {
      prompt,
      negative_prompt: theme.negativePrompt || 'people, persons, humans, text, watermark, blurry',
      image_size: { width, height },
      num_inference_steps: 28,
      guidance_scale: 3.5,
      num_images: 1,
      enable_safety_checker: true,
    },
    {
      headers: {
        Authorization: `Key ${apiKey}`,
        'Content-Type': 'application/json',
      },
      timeout: 90_000,
    }
  );

  const imageUrl = falResponse.data?.images?.[0]?.url;
  if (!imageUrl) {
    throw new Error('fal.ai did not return an image URL');
  }

  // ── Step 2: Download the generated background ─────────────────────────────
  const bgResponse = await axios.get(imageUrl, {
    responseType: 'arraybuffer',
    timeout: 30_000,
  });
  const backgroundBuffer = Buffer.from(bgResponse.data);

  // ── Step 3: Composite cutout (person) over background ─────────────────────
  return _compositeSubject(backgroundBuffer, cutoutBuffer, width, height);
}

/**
 * Build a detailed prompt from the theme object.
 * @private
 */
function _buildPrompt(theme) {
  const base = theme.prompt || 'beautiful studio backdrop, professional photography';
  const styleHint = theme.style ? `, ${theme.style} style` : '';
  return `${base}${styleHint}, high quality, photorealistic, 8k, dramatic lighting, no people`;
}

/**
 * Composite the cutout subject onto a background image using sharp.
 * Resizes both to the same canvas to ensure alignment.
 * @private
 */
async function _compositeSubject(backgroundBuffer, cutoutBuffer, width, height) {
  const bg = await sharp(backgroundBuffer)
    .resize(width, height, { fit: 'cover', position: 'centre' })
    .png()
    .toBuffer();

  // Scale the subject to fill ~85% of the frame height, centred horizontally
  const subjectHeight = Math.round(height * 0.85);
  const scaledSubject = await sharp(cutoutBuffer)
    .resize({ height: subjectHeight, fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer();

  const subjectMeta = await sharp(scaledSubject).metadata();
  const left = Math.round((width - (subjectMeta.width || 0)) / 2);
  const top = Math.round(height - subjectHeight - height * 0.02); // slight bottom margin

  const composited = await sharp(bg)
    .composite([
      {
        input: scaledSubject,
        left,
        top,
        blend: 'over',
      },
    ])
    .jpeg({ quality: 92, mozjpeg: true })
    .toBuffer();

  return composited;
}

/**
 * Fallback: generate a simple gradient background and composite the cutout.
 * Used in development when no API key is configured.
 * @private
 */
async function _gradientFallback(cutoutBuffer, theme) {
  const meta = await sharp(cutoutBuffer).metadata();
  const width = meta.width || 1200;
  const height = meta.height || 1800;

  // Pick gradient colours based on theme id for variety
  const gradients = [
    { top: '#1a1a2e', bottom: '#16213e' },
    { top: '#0d1b2a', bottom: '#1b263b' },
    { top: '#2d1b69', bottom: '#11047a' },
    { top: '#1a0533', bottom: '#3d0066' },
    { top: '#003049', bottom: '#023e8a' },
  ];
  const palette = gradients[Math.abs(_hashStr(theme.id || 'default')) % gradients.length];

  // Build an SVG gradient background
  const svgGradient = `
    <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="${palette.top}"/>
          <stop offset="100%" stop-color="${palette.bottom}"/>
        </linearGradient>
      </defs>
      <rect width="${width}" height="${height}" fill="url(#g)"/>
    </svg>`;

  const backgroundBuffer = await sharp(Buffer.from(svgGradient)).png().toBuffer();
  return _compositeSubject(backgroundBuffer, cutoutBuffer, width, height);
}

/** Simple deterministic hash for a string → integer. */
function _hashStr(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (Math.imul(31, hash) + str.charCodeAt(i)) | 0;
  }
  return hash;
}

module.exports = { transformWithTheme };
