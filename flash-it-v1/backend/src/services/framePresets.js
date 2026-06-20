'use strict';

/**
 * Themed frame presets (Sharp, AI-FREE, $0/photo).
 *
 * Produces real, attractive transparent-PNG frames for NATURAL mode, one per
 * occasion category. composeNatural() lays the guest photo across the whole
 * canvas and stacks one of these frames on top, then draws the 3D event message.
 *
 * Design rules:
 *   - 1200×1800 (3:4), the canvas composeNatural() uses.
 *   - The CENTRE stays fully transparent so the guest photo shows through.
 *   - All decoration lives in a band near the edges/corners.
 *   - TEXT-FREE so the same frame works for EN and ES events (the event message
 *     is rendered separately by renderMessage3D at the top).
 *
 * Unlike placeholderArt.generateNaturalFrame() (a crude single border, for
 * testing), these are the real starter catalogue: distinct, branded looks the
 * owner can ship as-is or replace later via the admin uploader.
 */

const sharp = require('sharp');

const W = 1200;
const H = 1800;

/** Aliases so '/api/frames/quinceanera.png', 'XV', etc. all resolve. */
const ALIASES = {
  quince: 'quinceanera',
  xv: 'quinceanera',
  'kids-birthday': 'kids-birthday',
  kids: 'kids-birthday',
  kid: 'kids-birthday',
  'birthday-kids': 'kids-birthday',
};

/** The categories we ship a real frame for. */
const SLUGS = ['fiesta', 'wedding', 'quinceanera', 'birthday', 'kids-birthday', 'corporate', 'holiday'];

/** Human labels (EN) for the seeded catalogue records. */
const LABELS = {
  fiesta: 'Fiesta Frame',
  wedding: 'Wedding Frame',
  quinceanera: 'Quinceañera Frame',
  birthday: 'Birthday Frame',
  'kids-birthday': 'Kids Birthday Frame',
  corporate: 'Corporate Frame',
  holiday: 'Holiday Frame',
};

function _norm(category) {
  const slug = String(category || '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return ALIASES[slug] || slug;
}

// ── SVG building blocks ───────────────────────────────────────────────────────

/** Rounded double-border scaffold shared by every theme. */
function _border(outer, inner, { outerW = 30, innerW = 6, rx = 46, gap = 26, opacity = 1 } = {}) {
  const m = 40;
  return `
    <rect x="${m}" y="${m}" width="${W - 2 * m}" height="${H - 2 * m}" rx="${rx}"
          fill="none" stroke="${outer}" stroke-width="${outerW}" opacity="${opacity}"/>
    <rect x="${m + gap}" y="${m + gap}" width="${W - 2 * (m + gap)}" height="${H - 2 * (m + gap)}" rx="${rx - 10}"
          fill="none" stroke="${inner}" stroke-width="${innerW}" opacity="${opacity}"/>`;
}

/** A 5-point star polygon centred at (cx,cy). */
function _star(cx, cy, r, fill, rot = -90, opacity = 1) {
  const pts = [];
  for (let i = 0; i < 5; i++) {
    const outer = ((rot + i * 72) * Math.PI) / 180;
    const inner = ((rot + i * 72 + 36) * Math.PI) / 180;
    pts.push(`${(cx + r * Math.cos(outer)).toFixed(1)},${(cy + r * Math.sin(outer)).toFixed(1)}`);
    pts.push(`${(cx + r * 0.42 * Math.cos(inner)).toFixed(1)},${(cy + r * 0.42 * Math.sin(inner)).toFixed(1)}`);
  }
  return `<polygon points="${pts.join(' ')}" fill="${fill}" opacity="${opacity}"/>`;
}

/** A hanging bunting row of triangles. dir=1 hangs down (top), dir=-1 points up (bottom). */
function _bunting(y, dir, colors, n = 11, size = 70) {
  const step = W / n;
  let out = `<line x1="40" y1="${y}" x2="${W - 40}" y2="${y}" stroke="#ffffff" stroke-width="3" opacity="0.5"/>`;
  for (let i = 0; i < n; i++) {
    const cx = step * (i + 0.5);
    const c = colors[i % colors.length];
    const top = y;
    const tip = y + dir * size;
    out += `<polygon points="${cx - step * 0.42},${top} ${cx + step * 0.42},${top} ${cx},${tip}" fill="${c}" opacity="0.95"/>`;
    out += `<circle cx="${cx}" cy="${top}" r="5" fill="#ffffff" opacity="0.8"/>`;
  }
  return out;
}

/** Scatter small confetti shapes around the perimeter band (centre kept clear). */
function _confetti(colors, density = 46) {
  // Deterministic pseudo-random so frames are reproducible.
  let seed = 1337;
  const rnd = () => {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    return seed / 0x7fffffff;
  };
  const band = 150; // px from edge that confetti may occupy
  let out = '';
  for (let i = 0; i < density; i++) {
    // pick a point in the perimeter band
    let x;
    let y;
    if (rnd() < 0.5) {
      x = rnd() * W;
      y = rnd() < 0.5 ? rnd() * band : H - rnd() * band;
    } else {
      y = rnd() * H;
      x = rnd() < 0.5 ? rnd() * band : W - rnd() * band;
    }
    const c = colors[i % colors.length];
    const s = 10 + rnd() * 16;
    const rot = Math.round(rnd() * 360);
    const kind = Math.floor(rnd() * 3);
    if (kind === 0) {
      out += `<rect x="${(x - s / 2).toFixed(1)}" y="${(y - s / 4).toFixed(1)}" width="${s.toFixed(1)}" height="${(s / 2).toFixed(1)}" rx="2" fill="${c}" transform="rotate(${rot} ${x.toFixed(1)} ${y.toFixed(1)})" opacity="0.92"/>`;
    } else if (kind === 1) {
      out += `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${(s / 2.4).toFixed(1)}" fill="${c}" opacity="0.92"/>`;
    } else {
      out += _star(x, y, s * 0.7, c, rot, 0.92);
    }
  }
  return out;
}

/** Elegant corner filigree (top-left geometry), mirrored to all four corners. */
function _filigreeCorners(color, accent) {
  // A tasteful scroll built from arcs; sits inside the corner.
  const path = `
    <g stroke="${color}" stroke-width="5" fill="none" stroke-linecap="round" opacity="0.95">
      <path d="M 70 200 C 70 110 110 70 200 70"/>
      <path d="M 95 230 C 95 150 150 95 230 95"/>
      <path d="M 70 200 C 120 200 150 170 150 120"/>
    </g>
    <circle cx="150" cy="120" r="9" fill="${accent}"/>
    <circle cx="200" cy="70" r="7" fill="${accent}"/>`;
  return `
    <g>${path}</g>
    <g transform="translate(${W},0) scale(-1,1)">${path}</g>
    <g transform="translate(0,${H}) scale(1,-1)">${path}</g>
    <g transform="translate(${W},${H}) scale(-1,-1)">${path}</g>`;
}

/** A small crown centred at (cx,cy). */
function _quinceCrown(cx, cy, fill, gem, w = 64) {
  const h = w * 0.62;
  const x = cx - w / 2;
  const y = cy - h / 2;
  return `
    <g opacity="0.95">
      <polygon points="${x},${y + h} ${x},${y + h * 0.45} ${x + w * 0.2},${y + h * 0.7} ${x + w * 0.5},${y} ${x + w * 0.8},${y + h * 0.7} ${x + w},${y + h * 0.45} ${x + w},${y + h}" fill="${fill}"/>
      <rect x="${x}" y="${y + h}" width="${w}" height="${h * 0.22}" rx="3" fill="${fill}"/>
      <circle cx="${x + w * 0.2}" cy="${y + h * 0.62}" r="${w * 0.07}" fill="${gem}"/>
      <circle cx="${x + w * 0.5}" cy="${y + h * 0.04}" r="${w * 0.08}" fill="${gem}"/>
      <circle cx="${x + w * 0.8}" cy="${y + h * 0.62}" r="${w * 0.07}" fill="${gem}"/>
    </g>`;
}

/** A small balloon (string + body) at (x,y). */
function _balloon(x, y, color, size = 60) {
  return `
    <ellipse cx="${x}" cy="${y}" rx="${size * 0.42}" ry="${size * 0.52}" fill="${color}" opacity="0.95"/>
    <polygon points="${x - 6},${y + size * 0.5} ${x + 6},${y + size * 0.5} ${x},${y + size * 0.62}" fill="${color}" opacity="0.95"/>
    <path d="M ${x} ${y + size * 0.62} q 14 40 -4 ${size}" stroke="#ffffff" stroke-width="3" fill="none" opacity="0.7"/>
    <ellipse cx="${x - size * 0.14}" cy="${y - size * 0.18}" rx="${size * 0.1}" ry="${size * 0.16}" fill="#ffffff" opacity="0.45"/>`;
}

// ── Per-theme frame SVGs ──────────────────────────────────────────────────────

function _svgFiesta() {
  const colors = ['#e63946', '#ff7b00', '#ffd000', '#2ec4b6', '#ff5da2', '#8a4fff'];
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
    <defs>
      <linearGradient id="fb" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="#ff7b00"/><stop offset="50%" stop-color="#e63946"/><stop offset="100%" stop-color="#8a4fff"/>
      </linearGradient>
    </defs>
    ${_border('url(#fb)', '#ffd000', { outerW: 34, innerW: 6 })}
    ${_bunting(96, 1, colors, 11, 72)}
    ${_bunting(H - 96, -1, colors, 11, 72)}
    ${_star(120, H / 2 - 120, 26, '#ffd000')}
    ${_star(W - 120, H / 2 - 120, 26, '#ffd000')}
    ${_star(120, H / 2 + 120, 22, '#2ec4b6')}
    ${_star(W - 120, H / 2 + 120, 22, '#2ec4b6')}
  </svg>`;
}

function _svgWedding() {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
    <defs>
      <linearGradient id="wg" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#e7cd8f"/><stop offset="50%" stop-color="#c9a24b"/><stop offset="100%" stop-color="#b78a36"/>
      </linearGradient>
    </defs>
    ${_border('url(#wg)', '#f3e6c8', { outerW: 16, innerW: 3, rx: 30, gap: 18, opacity: 0.95 })}
    ${_filigreeCorners('#c9a24b', '#f3e6c8')}
  </svg>`;
}

function _svgQuince() {
  const colors = ['#f7a8d8', '#e0218a', '#ff5da2', '#e6b800'];
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
    <defs>
      <linearGradient id="qg" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="#f7a8d8"/><stop offset="55%" stop-color="#e0218a"/><stop offset="100%" stop-color="#a3146a"/>
      </linearGradient>
    </defs>
    ${_border('url(#qg)', '#e6b800', { outerW: 30, innerW: 5 })}
    ${_filigreeCorners('#ffd9f0', '#e6b800')}
    <!-- small crowns on the SIDES (clear of the top-centre message band) -->
    ${_quinceCrown(120, H / 2 - 30, '#e6b800', '#ffd9f0')}
    ${_quinceCrown(W - 120, H / 2 - 30, '#e6b800', '#ffd9f0')}
    ${_star(120, H / 2 + 150, 20, '#ffd9f0')}
    ${_star(W - 120, H / 2 + 150, 20, '#ffd9f0')}
  </svg>`;
}

function _svgBirthday() {
  const colors = ['#ff6b6b', '#ffd93d', '#4ecdc4', '#a06cd5', '#ff9f1c'];
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
    <defs>
      <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="#4ecdc4"/><stop offset="50%" stop-color="#a06cd5"/><stop offset="100%" stop-color="#ff6b6b"/>
      </linearGradient>
    </defs>
    ${_border('url(#bg)', '#ffd93d', { outerW: 30, innerW: 6 })}
    ${_confetti(colors, 50)}
    ${_balloon(150, 250, '#ff6b6b', 96)}
    ${_balloon(W - 150, 250, '#4ecdc4', 96)}
  </svg>`;
}

function _svgKids() {
  const colors = ['#ff5252', '#ffb300', '#4caf50', '#2196f3', '#9c27b0', '#ff4081'];
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
    <defs>
      <linearGradient id="kg" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0%" stop-color="#2196f3"/><stop offset="25%" stop-color="#4caf50"/><stop offset="50%" stop-color="#ffb300"/><stop offset="75%" stop-color="#ff5252"/><stop offset="100%" stop-color="#9c27b0"/>
      </linearGradient>
    </defs>
    ${_border('url(#kg)', '#ffffff', { outerW: 44, innerW: 8, rx: 60, gap: 34 })}
    ${_confetti(colors, 40)}
    ${_star(W / 2, 130, 40, '#ffb300')}
    ${_balloon(150, 280, '#ff5252', 110)}
    ${_balloon(W - 150, 280, '#2196f3', 110)}
    ${_star(130, H - 200, 30, '#4caf50')}
    ${_star(W - 130, H - 200, 30, '#ff4081')}
  </svg>`;
}

/** Mirror a top-left corner group to all four corners. */
function _fourCorners(inner) {
  return (
    `<g>${inner}</g>` +
    `<g transform="translate(${W},0) scale(-1,1)">${inner}</g>` +
    `<g transform="translate(0,${H}) scale(1,-1)">${inner}</g>` +
    `<g transform="translate(${W},${H}) scale(-1,-1)">${inner}</g>`
  );
}

/** A simple 6-spoke snowflake at (cx,cy). */
function _snowflake(cx, cy, r, color, width = 4) {
  let spokes = '';
  for (let i = 0; i < 6; i++) {
    const a = (i * 60 * Math.PI) / 180;
    const x2 = cx + r * Math.cos(a);
    const y2 = cy + r * Math.sin(a);
    spokes += `<line x1="${cx}" y1="${cy}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}" stroke="${color}" stroke-width="${width}" stroke-linecap="round"/>`;
    // little side ticks
    const mx = cx + r * 0.6 * Math.cos(a);
    const my = cy + r * 0.6 * Math.sin(a);
    spokes += `<line x1="${mx.toFixed(1)}" y1="${my.toFixed(1)}" x2="${(mx + r * 0.22 * Math.cos(a + 0.9)).toFixed(1)}" y2="${(my + r * 0.22 * Math.sin(a + 0.9)).toFixed(1)}" stroke="${color}" stroke-width="${width * 0.7}" stroke-linecap="round"/>`;
    spokes += `<line x1="${mx.toFixed(1)}" y1="${my.toFixed(1)}" x2="${(mx + r * 0.22 * Math.cos(a - 0.9)).toFixed(1)}" y2="${(my + r * 0.22 * Math.sin(a - 0.9)).toFixed(1)}" stroke="${color}" stroke-width="${width * 0.7}" stroke-linecap="round"/>`;
  }
  return `<g opacity="0.9">${spokes}</g>`;
}

function _svgCorporate() {
  // Clean, professional: thin silver double border + minimal corner brackets.
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
    <defs>
      <linearGradient id="cg" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="#dfe6ef"/><stop offset="50%" stop-color="#9fb0c4"/><stop offset="100%" stop-color="#5d7a9a"/>
      </linearGradient>
    </defs>
    ${_border('url(#cg)', '#c7d0db', { outerW: 14, innerW: 3, rx: 16, gap: 16, opacity: 0.95 })}
    ${_fourCorners(`<path d="M 80 200 L 80 80 L 200 80" stroke="#c7d0db" stroke-width="7" fill="none" stroke-linecap="square"/><rect x="92" y="92" width="14" height="14" fill="#9fb0c4"/>`)}
  </svg>`;
}

function _svgHoliday() {
  // Festive gold border with red/green/gold stars + snowflakes in the corners.
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
    <defs>
      <linearGradient id="hg" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="#e6b800"/><stop offset="50%" stop-color="#b3122b"/><stop offset="100%" stop-color="#0f7a3d"/>
      </linearGradient>
    </defs>
    ${_border('url(#hg)', '#f3e6c8', { outerW: 30, innerW: 5 })}
    ${_fourCorners(_snowflake(150, 150, 60, '#f3e6c8', 5) + _star(250, 120, 18, '#e6b800') + _star(120, 250, 16, '#b3122b'))}
    ${_star(W / 2, 120, 22, '#e6b800')}
    ${_star(W / 2 - 90, 140, 13, '#0f7a3d')}
    ${_star(W / 2 + 90, 140, 13, '#b3122b')}
  </svg>`;
}

const _BUILDERS = {
  fiesta: _svgFiesta,
  wedding: _svgWedding,
  quinceanera: _svgQuince,
  birthday: _svgBirthday,
  'kids-birthday': _svgKids,
  corporate: _svgCorporate,
  holiday: _svgHoliday,
};

const _cache = new Map();

/**
 * Render a themed frame as a transparent PNG buffer (cached per category/size).
 * Unknown categories fall back to the fiesta frame so the flow never breaks.
 * @param {string} category
 * @param {{width?:number,height?:number}} [opts]
 * @returns {Promise<Buffer>}
 */
async function renderFrame(category, opts = {}) {
  const cat = _norm(category);
  const builder = _BUILDERS[cat] || _BUILDERS.fiesta;
  const width = opts.width || W;
  const height = opts.height || H;
  const key = `${cat}:${width}x${height}`;
  if (_cache.has(key)) return _cache.get(key);

  let buf = await sharp(Buffer.from(builder())).png().toBuffer();
  if (width !== W || height !== H) {
    buf = await sharp(buf).resize(width, height, { fit: 'fill' }).png().toBuffer();
  }
  _cache.set(key, buf);
  return buf;
}

/**
 * If a background url points at one of our preset frame routes
 * (e.g. "/api/frames/fiesta.png" or an absolute variant), return the category
 * slug so the caller can render it locally instead of fetching over HTTP.
 * @param {string} url
 * @returns {string|null}
 */
function matchPresetUrl(url) {
  if (!url) return null;
  const m = String(url).match(/\/api\/frames\/([a-z0-9-]+)\.png(?:\?.*)?$/i);
  if (!m) return null;
  const cat = _norm(m[1]);
  return _BUILDERS[cat] ? cat : null;
}

/** The relative URL a seeded frame background should carry. */
function frameUrl(category) {
  return `/api/frames/${_norm(category)}.png`;
}

module.exports = { SLUGS, LABELS, renderFrame, matchPresetUrl, frameUrl, _norm };
