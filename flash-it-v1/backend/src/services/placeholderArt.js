'use strict';

/**
 * Placeholder artwork generator (Sharp, AI-FREE).
 *
 * Produces simple, real PNG assets so both capture modes can be exercised
 * end-to-end before the owner uploads real artwork:
 *   - generateCharacterArtwork() → a colored "scene" PNG with a TRANSPARENT
 *     oval face hole at a known faceSlot. The character/scene is painted, then
 *     the hole is punched out so the guest face shows through when composited
 *     underneath.
 *   - generateNaturalFrame() → a transparent-PNG frame/overlay (border + corners)
 *     that sits on top of a real photo.
 *
 * These are intentionally crude — they exist purely for testing. Replace with
 * real artwork via POST /api/backgrounds.
 */

const sharp = require('sharp');

/**
 * Build a character artwork PNG with a transparent oval face hole.
 *
 * @param {object} [opts]
 * @param {number} [opts.width=1200]
 * @param {number} [opts.height=1800]
 * @param {object} [opts.faceSlot]  - {x,y,width,height,shape}. Defaults to a
 *                                    centered-upper oval sized for a head.
 * @param {string} [opts.body='#7c3aed']  - "body/scene" colour.
 * @param {string} [opts.accent='#fbbf24']
 * @param {string} [opts.label='CHARACTER']
 * @returns {Promise<{ buffer: Buffer, faceSlot: object, width:number, height:number }>}
 */
async function generateCharacterArtwork(opts = {}) {
  const width = opts.width || 1200;
  const height = opts.height || 1800;
  const body = opts.body || '#7c3aed';
  const accent = opts.accent || '#fbbf24';
  const label = opts.label || 'CHARACTER';

  // Default face hole: upper-centre oval, head-sized.
  const slot =
    opts.faceSlot || {
      x: Math.round(width * 0.30),
      y: Math.round(height * 0.12),
      width: Math.round(width * 0.40),
      height: Math.round(width * 0.40 * 1.25),
      shape: 'oval',
    };

  const fcx = slot.x + slot.width / 2;
  const fcy = slot.y + slot.height / 2;
  const rx = slot.width / 2;
  const ry = slot.height / 2;

  // 1. Paint the scene + a cartoon "body" beneath where the head will be.
  const sceneSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
    <defs>
      <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="${accent}"/>
        <stop offset="100%" stop-color="${body}"/>
      </linearGradient>
    </defs>
    <rect width="${width}" height="${height}" fill="url(#bg)"/>
    <!-- shoulders/torso so the face hole reads as a head on a body -->
    <rect x="${width * 0.22}" y="${fcy + ry * 0.6}" width="${width * 0.56}" height="${height * 0.55}" rx="60" fill="${body}"/>
    <rect x="${width * 0.30}" y="${fcy + ry * 0.4}" width="${width * 0.40}" height="${ry * 0.9}" rx="40" fill="${body}"/>
    <text x="${width / 2}" y="${height * 0.92}" font-family="sans-serif" font-size="60" font-weight="700" fill="#ffffff" text-anchor="middle" opacity="0.85">${label}</text>
    <text x="${width / 2}" y="${height * 0.96}" font-family="sans-serif" font-size="34" fill="#ffffff" text-anchor="middle" opacity="0.7">placeholder — replace with real art</text>
  </svg>`;

  const scene = await sharp(Buffer.from(sceneSvg)).png().toBuffer();

  // 2. Punch a transparent hole where the face goes (dest-out with a white shape).
  const holeShape =
    slot.shape === 'rect'
      ? `<rect x="${slot.x}" y="${slot.y}" width="${slot.width}" height="${slot.height}" rx="20" fill="#fff"/>`
      : `<ellipse cx="${fcx}" cy="${fcy}" rx="${rx}" ry="${ry}" fill="#fff"/>`;

  const holeSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">${holeShape}</svg>`;
  const hole = await sharp(Buffer.from(holeSvg)).png().toBuffer();

  // 3. Add a ring around the hole so the cutout edge is visible, THEN punch.
  const ringSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
    <ellipse cx="${fcx}" cy="${fcy}" rx="${rx + 8}" ry="${ry + 8}" fill="none" stroke="#ffffff" stroke-width="10" opacity="0.9"/>
  </svg>`;
  const ring = await sharp(Buffer.from(ringSvg)).png().toBuffer();

  const buffer = await sharp(scene)
    .composite([
      { input: ring, blend: 'over' },
      { input: hole, blend: 'dest-out' },
    ])
    .png()
    .toBuffer();

  return { buffer, faceSlot: slot, width, height };
}

/**
 * Build a transparent-PNG frame/overlay for natural mode (border + corners).
 *
 * @param {object} [opts]
 * @param {number} [opts.width=1200]
 * @param {number} [opts.height=1800]
 * @param {string} [opts.color='#ffffff']
 * @returns {Promise<{ buffer: Buffer, width:number, height:number }>}
 */
async function generateNaturalFrame(opts = {}) {
  const width = opts.width || 1200;
  const height = opts.height || 1800;
  const color = opts.color || '#ffffff';
  const m = Math.round(width * 0.03);
  const stroke = Math.round(width * 0.02);

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
    <rect x="${m}" y="${m}" width="${width - 2 * m}" height="${height - 2 * m}"
          fill="none" stroke="${color}" stroke-width="${stroke}" rx="24" opacity="0.95"/>
    <rect x="${m * 1.8}" y="${m * 1.8}" width="${width - 3.6 * m}" height="${height - 3.6 * m}"
          fill="none" stroke="${color}" stroke-width="${Math.round(stroke / 3)}" rx="18" opacity="0.6"/>
  </svg>`;

  const buffer = await sharp(Buffer.from(svg)).png().toBuffer();
  return { buffer, width, height };
}

module.exports = { generateCharacterArtwork, generateNaturalFrame };
