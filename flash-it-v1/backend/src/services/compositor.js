'use strict';

const sharp = require('sharp');

/**
 * Parse a CSS hex color string into an RGBA object sharp understands.
 * @param {string} hex  e.g. "#0d0d1a"
 * @returns {{ r, g, b, alpha }}
 */
function _hexToRgba(hex) {
  const clean = hex.replace('#', '');
  const full = clean.length === 3
    ? clean.split('').map((c) => c + c).join('')
    : clean;
  return {
    r: parseInt(full.slice(0, 2), 16),
    g: parseInt(full.slice(2, 4), 16),
    b: parseInt(full.slice(4, 6), 16),
    alpha: 1,
  };
}

/**
 * Build an SVG text overlay for the event name footer.
 *
 * @param {string} text
 * @param {{ x, y, maxWidth, fontSize, color }} textSlot
 * @param {number} canvasWidth
 * @param {number} canvasHeight
 * @returns {Buffer}
 */
function _buildTextSvg(text, textSlot, canvasWidth, canvasHeight) {
  const safeText = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

  const color = textSlot.color || '#ffffff';
  const fontSize = textSlot.fontSize || 28;

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${canvasWidth}" height="${canvasHeight}">
    <text
      x="${textSlot.x}"
      y="${textSlot.y + fontSize}"
      font-family="Arial, Helvetica, sans-serif"
      font-size="${fontSize}"
      font-weight="600"
      fill="${color}"
      text-anchor="start"
    >${safeText}</text>
  </svg>`;

  return Buffer.from(svg);
}

/**
 * Compose multiple photo buffers onto a single print-resolution canvas
 * according to a template definition.
 *
 * @param {Buffer[]} photos       - AI-transformed photo buffers, in slot order
 * @param {object}   template     - Template object from templates.js
 * @param {object}   [options]
 * @param {Buffer}   [options.eventLogoBuffer]  - Optional logo PNG buffer
 * @param {string}   [options.eventName]        - Text to render in footer
 * @param {string}   [options.textColor]        - Override footer text color
 * @param {string}   [options.backgroundColor] - Override canvas background color
 * @returns {Promise<Buffer>} PNG buffer
 */
async function compose(photos, template, options = {}) {
  const {
    eventLogoBuffer,
    eventName,
    textColor,
    backgroundColor,
  } = options;

  const bgColor = backgroundColor || template.background || '#0d0d1a';
  const { printWidth: width, printHeight: height } = template;

  console.log(`[compositor] composing template="${template.id}" size=${width}x${height} photos=${photos.length}`);

  // ── 1. Resize each photo buffer to fit its slot ───────────────────────────
  const compositeInputs = [];

  for (let i = 0; i < template.photoSlots.length; i++) {
    const slot = template.photoSlots[i];
    const photo = photos[i];

    if (!photo) {
      console.warn(`[compositor] no photo provided for slot index=${i}, skipping`);
      continue;
    }

    const resized = await sharp(photo)
      .resize(slot.width, slot.height, { fit: 'cover', position: 'centre' })
      .toBuffer();

    compositeInputs.push({ input: resized, left: slot.x, top: slot.y });
  }

  // ── 2. Overlay event logo if provided ────────────────────────────────────
  if (eventLogoBuffer && template.logoSlot) {
    const ls = template.logoSlot;
    try {
      const resizedLogo = await sharp(eventLogoBuffer)
        .resize(ls.width, ls.height, { fit: 'inside', withoutEnlargement: true })
        .toBuffer();
      compositeInputs.push({ input: resizedLogo, left: ls.x, top: ls.y });
    } catch (logoErr) {
      console.warn('[compositor] logo overlay failed, skipping:', logoErr.message);
    }
  }

  // ── 3. Overlay event name text ────────────────────────────────────────────
  if (eventName && template.textSlot) {
    const textSlotWithColor = textColor
      ? { ...template.textSlot, color: textColor }
      : template.textSlot;
    const svgBuf = _buildTextSvg(eventName, textSlotWithColor, width, height);
    compositeInputs.push({ input: svgBuf, top: 0, left: 0 });
  }

  // ── 4. Create canvas and composite everything ─────────────────────────────
  const bgRgba = _hexToRgba(bgColor);

  const result = await sharp({
    create: {
      width,
      height,
      channels: 4,
      background: bgRgba,
    },
  })
    .composite(compositeInputs)
    .png()
    .toBuffer();

  console.log(`[compositor] compose done, output=${result.length} bytes`);
  return result;
}

/**
 * For strip templates: duplicates the composed strip side-by-side (1200×1800)
 * so it prints twice on one sheet and can be cut in half.
 *
 * Only meaningful when template.type === 'strip'.
 *
 * @param {Buffer[]} photos
 * @param {object}   template
 * @param {object}   [options]
 * @returns {Promise<Buffer>} PNG buffer at 1200×(template.printHeight)
 */
async function composeStrip(photos, template, options = {}) {
  if (template.type !== 'strip') {
    return compose(photos, template, options);
  }

  // Compose the single strip first
  const singleStrip = await compose(photos, template, options);

  const { printWidth: sw, printHeight: sh } = template;
  const doubleWidth = sw * 2; // 1200

  console.log(`[compositor] composeStrip doubling strip to ${doubleWidth}x${sh}`);

  const doubled = await sharp({
    create: {
      width: doubleWidth,
      height: sh,
      channels: 4,
      background: _hexToRgba(options.backgroundColor || template.background || '#0d0d1a'),
    },
  })
    .composite([
      { input: singleStrip, left: 0, top: 0 },
      { input: singleStrip, left: sw, top: 0 },
    ])
    .png()
    .toBuffer();

  console.log(`[compositor] composeStrip done, output=${doubled.length} bytes`);
  return doubled;
}

module.exports = { compose, composeStrip };
