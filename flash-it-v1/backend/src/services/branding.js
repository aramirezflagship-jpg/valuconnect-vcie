'use strict';

const sharp = require('sharp');
const axios = require('axios');

// 4×6 inches at 300 DPI = 1200×1800 px (portrait)
const PRINT_WIDTH = 1200;
const PRINT_HEIGHT = 1800;
const DPI = 300;

/**
 * Apply event branding to a composited photo and output a print-ready 4×6 PNG.
 *
 * Processing steps:
 *   1. Resize/crop to exactly 1200×1800 (4×6 @ 300 DPI)
 *   2. Composite a semi-transparent frame overlay (if configured)
 *   3. Composite the event logo in the bottom-right corner
 *   4. Render event name as a text banner at the bottom
 *
 * @param {Buffer} imageBuffer - Composited photo (subject on AI background)
 * @param {{ logoUrl?: string, framePath?: string, brandColor?: string, eventName?: string }} eventConfig
 * @returns {Promise<Buffer>} Final PNG buffer at 300 DPI
 */
async function applyBranding(imageBuffer, eventConfig) {
  const { logoUrl, framePath, brandColor = '#ffffff', eventName = '' } = eventConfig || {};

  // ── Step 1: Resize to 4×6 canvas ─────────────────────────────────────────
  let canvas = await sharp(imageBuffer)
    .resize(PRINT_WIDTH, PRINT_HEIGHT, { fit: 'cover', position: 'centre' })
    .png()
    .toBuffer();

  const layers = [];

  // ── Step 2: Frame overlay ─────────────────────────────────────────────────
  if (framePath) {
    try {
      const frameBuffer = await _loadFrameOverlay(framePath, brandColor);
      if (frameBuffer) {
        layers.push({ input: frameBuffer, top: 0, left: 0, blend: 'over' });
      }
    } catch (err) {
      console.warn('[branding] Frame overlay failed, skipping:', err.message);
    }
  } else {
    // No frame configured — add a minimal branded border band at the bottom
    const band = await _makeBrandBand(PRINT_WIDTH, brandColor, eventName);
    layers.push({ input: band, top: PRINT_HEIGHT - 120, left: 0, blend: 'over' });
  }

  // ── Step 3: Logo overlay ──────────────────────────────────────────────────
  if (logoUrl) {
    try {
      const logoComposite = await _makeLogoComposite(logoUrl, brandColor);
      if (logoComposite) {
        // Bottom-right, 16 px margin from each edge, above the band
        const logoMeta = await sharp(logoComposite).metadata();
        const logoLeft = PRINT_WIDTH - (logoMeta.width || 160) - 32;
        const logoTop = PRINT_HEIGHT - (logoMeta.height || 80) - 136; // above brand band
        layers.push({ input: logoComposite, top: logoTop, left: logoLeft, blend: 'over' });
      }
    } catch (err) {
      console.warn('[branding] Logo overlay failed, skipping:', err.message);
    }
  }

  // ── Apply all layers at once ──────────────────────────────────────────────
  if (layers.length > 0) {
    canvas = await sharp(canvas)
      .composite(layers)
      .png()
      .toBuffer();
  }

  // ── Attach DPI metadata via sharp's withMetadata ─────────────────────────
  const finalBuffer = await sharp(canvas)
    .withMetadata({ density: DPI })
    .png({ compressionLevel: 7 })
    .toBuffer();

  return finalBuffer;
}

/**
 * Download a frame image (URL or local path) and resize it to the print canvas.
 * The frame should be a PNG with transparency in the centre.
 * @private
 */
async function _loadFrameOverlay(framePath, brandColor) {
  let rawBuffer;

  if (framePath.startsWith('http://') || framePath.startsWith('https://')) {
    const response = await axios.get(framePath, {
      responseType: 'arraybuffer',
      timeout: 15_000,
    });
    rawBuffer = Buffer.from(response.data);
  } else {
    const fs = require('fs');
    rawBuffer = fs.readFileSync(framePath);
  }

  return sharp(rawBuffer)
    .resize(PRINT_WIDTH, PRINT_HEIGHT, { fit: 'fill' })
    .png()
    .toBuffer();
}

/**
 * Download and prepare a logo for compositing.
 * Resizes to a max height of 80 px, preserving aspect ratio.
 * Adds a subtle drop-shadow SVG wrapper for readability on any background.
 * @private
 */
async function _makeLogoComposite(logoUrl, _brandColor) {
  let rawBuffer;

  if (logoUrl.startsWith('http://') || logoUrl.startsWith('https://')) {
    const response = await axios.get(logoUrl, {
      responseType: 'arraybuffer',
      timeout: 15_000,
    });
    rawBuffer = Buffer.from(response.data);
  } else {
    const fs = require('fs');
    rawBuffer = fs.readFileSync(logoUrl);
  }

  // Resize logo to fit within 300×80 px
  return sharp(rawBuffer)
    .resize({ height: 80, width: 300, fit: 'inside', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer();
}

/**
 * Create a semi-transparent branding band for the bottom of the image.
 * Used when no frame overlay is configured.
 * @private
 */
async function _makeBrandBand(width, brandColor, eventName) {
  const height = 120;
  const hex = brandColor.replace('#', '');
  const r = parseInt(hex.slice(0, 2), 16) || 0;
  const g = parseInt(hex.slice(2, 4), 16) || 0;
  const b = parseInt(hex.slice(4, 6), 16) || 0;

  // Sanitise event name for SVG: escape XML special chars
  const safeName = (eventName || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .slice(0, 60); // cap length

  const svg = `
    <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <rect width="${width}" height="${height}" fill="rgba(${r},${g},${b},0.82)" rx="0"/>
      <text
        x="${width / 2}"
        y="${height / 2 + 10}"
        font-family="Arial, Helvetica, sans-serif"
        font-size="36"
        font-weight="bold"
        fill="white"
        text-anchor="middle"
        dominant-baseline="middle"
        letter-spacing="2"
      >${safeName}</text>
    </svg>`;

  return sharp(Buffer.from(svg)).png().toBuffer();
}

module.exports = { applyBranding };
