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

/**
 * Composite guest photo(s) into a template's slots ON TOP of a themed
 * background image (R2-hosted JPEG/PNG). This replaces the old AI
 * background-removal + generation flow: no cutout, no external AI.
 *
 * The background image is resized to the template's print canvas (cover), then
 * each guest photo is resized to its slot and composited over it. Optional
 * logo + event-name text are drawn exactly like compose().
 *
 * @param {Buffer[]} photos             - Guest photo buffers, in slot order
 * @param {Buffer}   backgroundBuffer   - Themed background image buffer
 * @param {object}   template           - Template object from templates.js
 * @param {object}   [options]          - Same options as compose()
 * @returns {Promise<Buffer>} PNG buffer
 */
async function composeOnBackground(photos, backgroundBuffer, template, options = {}) {
  const { eventLogoBuffer, eventName, textColor } = options;
  const { printWidth: width, printHeight: height } = template;

  console.log(`[compositor] composeOnBackground template="${template.id}" size=${width}x${height} photos=${photos.length}`);

  // ── 1. Themed background as the base canvas ───────────────────────────────
  const base = await sharp(backgroundBuffer)
    .resize(width, height, { fit: 'cover', position: 'centre' })
    .toBuffer();

  const compositeInputs = [];

  // ── 2. Resize each guest photo to fit its slot ────────────────────────────
  for (let i = 0; i < template.photoSlots.length; i++) {
    const slot = template.photoSlots[i];
    const photo = photos[i];
    if (!photo) continue;

    const resized = await sharp(photo)
      .resize(slot.width, slot.height, { fit: 'cover', position: 'centre' })
      .toBuffer();

    compositeInputs.push({ input: resized, left: slot.x, top: slot.y });
  }

  // ── 3. Optional logo overlay ──────────────────────────────────────────────
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

  // ── 4. Optional event-name text ───────────────────────────────────────────
  if (eventName && template.textSlot) {
    const textSlotWithColor = textColor
      ? { ...template.textSlot, color: textColor }
      : template.textSlot;
    const svgBuf = _buildTextSvg(eventName, textSlotWithColor, width, height);
    compositeInputs.push({ input: svgBuf, top: 0, left: 0 });
  }

  const result = await sharp(base)
    .composite(compositeInputs)
    .png()
    .toBuffer();

  console.log(`[compositor] composeOnBackground done, output=${result.length} bytes`);
  return result;
}

// ─────────────────────────────────────────────────────────────────────────────
// Two-mode photo system: 3D theme-aware message + face-in-the-hole compositing
// ─────────────────────────────────────────────────────────────────────────────

/** XML-escape text for safe embedding in SVG. */
function _escapeXml(text) {
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * Per-category font + colour styling for the 3D event message.
 *
 * NOTE on fonts: Sharp renders SVG text via librsvg/fontconfig using whatever
 * fonts are installed on the host. We can't guarantee specific named webfonts
 * are present on Render, so we lead each stack with a GENERIC CSS family
 * (serif / sans-serif / cursive / fantasy) which fontconfig always resolves to
 * an installed face. Named fonts are listed first as a best-effort upgrade if
 * they happen to be installed. Fonts are kept thin/elegant per the brief — NOT
 * thick — by using normal/400-500 weights and letter-spacing rather than heavy
 * bold faces.
 */
const _CATEGORY_STYLE = {
  // elegant script
  wedding:     { fontFamily: "'Snell Roundhand','Apple Chancery','URW Chancery L',cursive", weight: 400, italic: true,  faceTop: '#fff7ec', faceBottom: '#e7c98f', depth: '#7a5a25', spacing: 1 },
  // glam script
  quinceanera: { fontFamily: "'Pinyon Script','Brush Script MT',cursive",                   weight: 400, italic: true,  faceTop: '#fff0fb', faceBottom: '#f3b6e0', depth: '#8a2f6e', spacing: 1 },
  // clean sans
  corporate:   { fontFamily: "'Helvetica Neue',Helvetica,Arial,sans-serif",                 weight: 500, italic: false, faceTop: '#ffffff', faceBottom: '#cfd6e4', depth: '#2c3142', spacing: 2 },
  // playful
  birthday:    { fontFamily: "'Comic Sans MS','Chalkboard SE',cursive,sans-serif",          weight: 500, italic: false, faceTop: '#fffbe6', faceBottom: '#ffd24d', depth: '#b5651d', spacing: 1 },
  // festive serif
  holiday:     { fontFamily: "'Playfair Display','Times New Roman',Georgia,serif",           weight: 500, italic: false, faceTop: '#fff6f6', faceBottom: '#e9b3b3', depth: '#7a1f1f', spacing: 1 },
  // bold festive
  fiesta:      { fontFamily: "'Trebuchet MS','Gill Sans',sans-serif",                        weight: 600, italic: false, faceTop: '#fff3d6', faceBottom: '#ff9d3c', depth: '#9c3d00', spacing: 1.5 },
};

function _styleFor(category) {
  const key = String(category || '').toLowerCase();
  return _CATEGORY_STYLE[key] || _CATEGORY_STYLE.fiesta;
}

/**
 * Render the event message as a 3D-extruded, theme-aware PNG overlay sized to
 * the given canvas width. The look is built with layered SVG text: several
 * offset darker→lighter copies create depth, a gradient/metallic face sits on
 * top, plus a soft drop shadow. Font is chosen by category (thin/elegant).
 *
 * @param {string} text                 - The event message.
 * @param {object} opts
 * @param {string} [opts.category]       - wedding|quinceanera|corporate|birthday|holiday|fiesta
 * @param {number} opts.width            - Target canvas width in px.
 * @param {number} [opts.fontSize]       - Override font size (auto from width otherwise).
 * @returns {Promise<{buffer: Buffer, width: number, height: number}>} PNG overlay
 */
async function renderMessage3D(text, opts = {}) {
  const width = opts.width || 1200;
  const style = _styleFor(opts.category);
  const safe = _escapeXml(text || '');

  // Auto-size: fit by width, capped so a long message still reads.
  const approxCharW = 0.55; // rough em width for the thin faces we use
  const maxByWidth = Math.floor((width * 0.9) / (Math.max(safe.length, 1) * approxCharW));
  const fontSize = opts.fontSize || Math.max(40, Math.min(120, maxByWidth));

  // Depth: a stack of offset copies stepping down-right, darkening into the
  // base. The number of layers scales gently with font size.
  const depthSteps = Math.max(4, Math.round(fontSize / 12));
  const cx = width / 2;
  const baseY = Math.round(fontSize * 1.15);
  const height = Math.round(fontSize * 1.9);

  const fontAttrs =
    `font-family="${style.fontFamily}" font-size="${fontSize}" ` +
    `font-weight="${style.weight}" font-style="${style.italic ? 'italic' : 'normal'}" ` +
    `letter-spacing="${style.spacing}" text-anchor="middle"`;

  // Build the extrusion layers (back to front).
  let layers = '';
  for (let i = depthSteps; i >= 1; i--) {
    const t = i / depthSteps; // 1 = farthest/darkest
    const dx = i * 0.6;
    const dy = i * 0.9;
    // Darken the depth colour as it recedes.
    layers +=
      `<text x="${cx + dx}" y="${baseY + dy}" ${fontAttrs} fill="${style.depth}" fill-opacity="${0.55 + 0.45 * (1 - t)}">${safe}</text>`;
  }

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
    <defs>
      <linearGradient id="face" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="${style.faceTop}"/>
        <stop offset="100%" stop-color="${style.faceBottom}"/>
      </linearGradient>
      <filter id="ds" x="-20%" y="-20%" width="140%" height="140%">
        <feDropShadow dx="0" dy="${Math.round(fontSize * 0.06)}" stdDeviation="${Math.round(fontSize * 0.05)}" flood-color="#000000" flood-opacity="0.45"/>
      </filter>
    </defs>
    <g filter="url(#ds)">
      ${layers}
      <text x="${cx}" y="${baseY}" ${fontAttrs} fill="url(#face)" stroke="${style.depth}" stroke-width="${Math.max(1, fontSize * 0.012)}" paint-order="stroke">${safe}</text>
    </g>
  </svg>`;

  const buffer = await sharp(Buffer.from(svg)).png().toBuffer();
  return { buffer, width, height };
}

/**
 * Mode A — "natural": real guest photo fills the canvas, an optional themed
 * transparent-PNG frame/overlay is composited on top, then the 3D event message
 * is drawn at the TOP.
 *
 * @param {Buffer}  photoBuffer        - Full guest photo (as-is, no removal).
 * @param {object}  opts
 * @param {number}  [opts.width=1200]
 * @param {number}  [opts.height=1800]
 * @param {Buffer}  [opts.frameBuffer] - Transparent PNG frame/overlay (optional).
 * @param {string}  [opts.message]     - Event message (rendered 3D at top).
 * @param {string}  [opts.category]    - For message font selection.
 * @returns {Promise<Buffer>} PNG buffer
 */
async function composeNatural(photoBuffer, opts = {}) {
  const width = opts.width || 1200;
  const height = opts.height || 1800;

  // 1. Guest photo fills the whole canvas (cover).
  const base = await sharp(photoBuffer)
    .resize(width, height, { fit: 'cover', position: 'centre' })
    .toBuffer();

  const composites = [];

  // 2. Themed frame/overlay on top (stretched to canvas).
  if (opts.frameBuffer) {
    try {
      const frame = await sharp(opts.frameBuffer)
        .resize(width, height, { fit: 'fill' })
        .toBuffer();
      composites.push({ input: frame, left: 0, top: 0, blend: 'over' });
    } catch (err) {
      console.warn('[compositor] natural frame composite failed, skipping:', err.message);
    }
  }

  // 3. 3D event message at the TOP.
  if (opts.message) {
    const msg = await renderMessage3D(opts.message, { category: opts.category, width });
    const top = Math.round(height * 0.03);
    const left = Math.round((width - msg.width) / 2);
    composites.push({ input: msg.buffer, left, top, blend: 'over' });
  }

  return sharp(base).composite(composites).png().toBuffer();
}

/**
 * Build an alpha mask matching the faceSlot shape so the cropped face is clipped
 * to an oval (or rect) before it's placed under the artwork hole.
 * @private
 */
async function _shapeFace(faceBuffer, slot) {
  const w = slot.width;
  const h = slot.height;
  const resized = await sharp(faceBuffer)
    .resize(w, h, { fit: 'cover', position: 'centre' })
    .ensureAlpha()
    .toBuffer();

  if (slot.shape === 'rect') return resized;

  // Oval mask: white ellipse on black → use as alpha.
  const maskSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}">
    <ellipse cx="${w / 2}" cy="${h / 2}" rx="${w / 2}" ry="${h / 2}" fill="#fff"/>
  </svg>`;
  const mask = await sharp(Buffer.from(maskSvg)).png().toBuffer();

  return sharp(resized)
    .composite([{ input: mask, blend: 'dest-in' }])
    .png()
    .toBuffer();
}

/**
 * Mode B — "character": face-in-the-hole. The cropped guest face is placed at
 * the artwork's faceSlot, then the character+scene artwork (transparent face
 * hole) is composited ON TOP so the face shows through the hole. The 3D event
 * message is drawn at the TOP.
 *
 * The artwork's intrinsic pixel dimensions define the output canvas, so faceSlot
 * coordinates are interpreted 1:1 against the artwork.
 *
 * @param {Buffer} faceBuffer       - Client-cropped guest face image.
 * @param {Buffer} artworkBuffer    - Character artwork PNG (transparent face hole).
 * @param {object} faceSlot         - {x,y,width,height,shape} absolute px on artwork.
 * @param {object} [opts]
 * @param {string} [opts.message]   - Event message (rendered 3D at top).
 * @param {string} [opts.category]  - For message font selection.
 * @returns {Promise<Buffer>} PNG buffer
 */
async function composeCharacter(faceBuffer, artworkBuffer, faceSlot, opts = {}) {
  const meta = await sharp(artworkBuffer).metadata();
  const width = meta.width || 1200;
  const height = meta.height || 1800;

  // 1. Shape + size the face to the slot.
  const face = await _shapeFace(faceBuffer, faceSlot);

  const composites = [
    // 2. Face goes UNDER the artwork at the slot position.
    { input: face, left: faceSlot.x, top: faceSlot.y, blend: 'over' },
    // 3. Artwork ON TOP — the transparent hole reveals the face beneath.
    { input: await sharp(artworkBuffer).ensureAlpha().png().toBuffer(), left: 0, top: 0, blend: 'over' },
  ];

  // 4. 3D event message at the TOP.
  if (opts.message) {
    const msg = await renderMessage3D(opts.message, { category: opts.category, width });
    const top = Math.round(height * 0.03);
    const left = Math.round((width - msg.width) / 2);
    composites.push({ input: msg.buffer, left, top, blend: 'over' });
  }

  // Transparent base canvas at artwork size, then composite the stack.
  return sharp({
    create: { width, height, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } },
  })
    .composite(composites)
    .png()
    .toBuffer();
}

module.exports = {
  compose,
  composeStrip,
  composeOnBackground,
  renderMessage3D,
  composeNatural,
  composeCharacter,
};
