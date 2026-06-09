#!/usr/bin/env node
/**
 * ValuConnect Business Card Generator — Creative Edition
 * Brand DNA: Warm · Practical · Bilingual EN/ES · Knowledgeable Neighbor
 * Source of truth: marketing.md
 *
 * Card size: 90mm × 55mm (standard business card)
 * Layout per file: 4 cards per A4 sheet (2 front + 2 back), with cut guides
 *
 * Usage:  node presentations/generate-business-cards.js
 * Output: presentations/output/bizcard-andres.html
 *         presentations/output/bizcard-yolanda.html
 *
 * To print: Chrome → File → Print → Save as PDF
 *   A4 Portrait · Background graphics ON · Margins = None
 */

const fs      = require('fs');
const path    = require('path');
const QRCode  = require('qrcode');
const OUT     = path.join(__dirname, 'output');
if (!fs.existsSync(OUT)) fs.mkdirSync(OUT, { recursive: true });

const CALENDAR_URL = 'https://calendar.app.google/SfotPLRERGRDzEiw5';

// ── Brand data (source: marketing.md) ────────────────────────────────────────
const CO = {
  name:       'ValuConnect Solutions',
  url:        'vcsolutions.us',
  tagline:    'Work Smarter, Not Harder.',
  tagline_es: 'Trabaja Inteligente.',
  bilingual:  'EN · ES',
  mascot:     'Valu',
  products: [
    {
      code:  'VC4',
      full:  'Content Intelligence Engine',
      desc:  'AI-powered bilingual content automation',
      color: '#0F766E',
      light: '#CCFBF1',
      border:'#99F6E4',
    },
    {
      code:  'Flash-It',
      full:  'AI Photo Booth Platform',
      desc:  'iPad kiosk · cloud delivery · guest pipeline',
      color: '#C2410C',
      light: '#FFEDD5',
      border:'#FED7AA',
    },
  ],
};

const PEOPLE = [
  {
    id:       'andres',
    name:     'Andres Ramirez',
    title:    'Founder & Implementation Director',
    initials: 'AR',
    email:    'info@vcsolutions.us',
    quote:    '"Trabajemos con inteligencia, no con esfuerzo."',
  },
  {
    id:       'yolanda',
    name:     'Yolanda Ribeyro',
    title:    'Director of Sales & Marketing LATAM',
    initials: 'YR',
    email:    'yolanda@vcsolutions.us',
    quote:    '"Your success is our success — we grow together."',
  },
];

// ── Design tokens ─────────────────────────────────────────────────────────────
const P = {
  navy:   '#0D1B2A',
  navyM:  '#162233',
  amber:  '#E8961C',
  amberD: '#B45309',
  teal:   '#0F766E',
  orange: '#C2410C',
  white:  '#FFFFFF',
  cream:  '#FAFAF8',
  muted:  '#64748B',
  border: '#E2E8F0',
};

// ── CSS ───────────────────────────────────────────────────────────────────────
const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap');

  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  body {
    font-family: 'Inter', system-ui, sans-serif;
    background: #94A3B8;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }

  /* ── Print sheet ── */
  .sheet {
    width: 210mm;
    min-height: 297mm;
    background: white;
    margin: 8mm auto;
    padding: 15mm;
    box-shadow: 0 4px 30px rgba(0,0,0,.2);
    display: flex;
    flex-direction: column;
    gap: 10mm;
  }

  .sheet-title {
    font-size: 8pt;
    font-weight: 700;
    color: ${P.muted};
    text-transform: uppercase;
    letter-spacing: 1.5px;
    padding-bottom: 3mm;
    border-bottom: 1px solid ${P.border};
  }

  /* ── Card row ── */
  .card-row {
    display: flex;
    gap: 8mm;
    align-items: flex-start;
  }

  .card-row-label {
    font-size: 6.5pt;
    font-weight: 700;
    color: ${P.muted};
    text-transform: uppercase;
    letter-spacing: 1px;
    writing-mode: vertical-rl;
    transform: rotate(180deg);
    align-self: center;
    flex-shrink: 0;
  }

  .cards-wrap { display: flex; gap: 5mm; }

  /* ── Business card base ── */
  .card {
    width: 90mm;
    height: 55mm;
    border-radius: 3mm;
    overflow: hidden;
    position: relative;
    flex-shrink: 0;
    box-shadow: 0 0 0 0.5px #CBD5E0, 0 4px 16px rgba(0,0,0,.2);
  }

  /* ═══════════════════════════════
     FRONT CARD
  ═══════════════════════════════ */
  .card-front {
    background: ${P.navy};
    display: flex;
    flex-direction: column;
  }

  /* SVG bg sits behind everything */
  .front-svg-bg {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    pointer-events: none;
  }

  .front-inner {
    position: relative;
    z-index: 1;
    display: flex;
    flex-direction: column;
    height: 100%;
  }

  /* Top amber identity bar */
  .front-bar {
    background: ${P.amber};
    padding: 1.8mm 4.5mm;
    display: flex;
    align-items: center;
    justify-content: space-between;
    flex-shrink: 0;
  }

  .front-brand {
    font-size: 7pt;
    font-weight: 900;
    color: ${P.navy};
    letter-spacing: -.2px;
    text-transform: uppercase;
  }

  .front-brand-dim {
    font-weight: 500;
    opacity: .65;
  }

  .front-bilingual-badge {
    font-size: 5.5pt;
    font-weight: 700;
    color: ${P.navy};
    opacity: .6;
    letter-spacing: 1.2px;
    border: 1px solid rgba(13,27,42,.25);
    padding: 0.5px 4px;
    border-radius: 6px;
  }

  /* Body: avatar + info side by side */
  .front-body {
    flex: 1;
    display: flex;
    align-items: center;
    padding: 3mm 4.5mm;
    gap: 4mm;
  }

  /* Initials circle */
  .front-avatar {
    width: 14mm;
    height: 14mm;
    border-radius: 50%;
    background: ${P.amber};
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    box-shadow:
      0 0 0 2px rgba(232,150,28,.3),
      0 0 0 4px rgba(232,150,28,.1);
  }

  .front-avatar-text {
    font-size: 7pt;
    font-weight: 900;
    color: ${P.navy};
    letter-spacing: -.3px;
  }

  /* Text info */
  .front-info {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: .8mm;
  }

  .front-name {
    font-size: 13pt;
    font-weight: 900;
    color: ${P.white};
    line-height: 1.05;
    letter-spacing: -.4px;
  }

  .front-title {
    font-size: 6pt;
    font-weight: 500;
    color: rgba(255,255,255,.5);
    line-height: 1.35;
    text-transform: uppercase;
    letter-spacing: .5px;
    margin-top: .5mm;
  }

  .front-url {
    font-size: 7pt;
    font-weight: 700;
    color: ${P.amber};
    margin-top: 1.5mm;
  }

  .front-email {
    font-size: 6pt;
    font-weight: 400;
    color: rgba(255,255,255,.45);
    margin-top: .5mm;
  }

  /* Bottom strip */
  .front-bottom {
    padding: 1.8mm 4.5mm;
    display: flex;
    align-items: center;
    justify-content: space-between;
    background: rgba(0,0,0,.28);
    border-top: 1px solid rgba(255,255,255,.07);
    flex-shrink: 0;
  }

  .front-pills { display: flex; gap: 2mm; }

  .pill {
    font-size: 5.5pt;
    font-weight: 800;
    padding: 1.5px 6px;
    border-radius: 10px;
    letter-spacing: .4px;
    text-transform: uppercase;
  }

  .pill-vc4 {
    background: rgba(15,118,110,.4);
    color: #5EEAD4;
    border: 1px solid rgba(94,234,212,.2);
  }

  .pill-flash {
    background: rgba(194,65,12,.35);
    color: #FDBA74;
    border: 1px solid rgba(253,186,116,.22);
  }

  .front-mascot {
    font-size: 5.5pt;
    font-weight: 700;
    color: rgba(255,255,255,.18);
    letter-spacing: 1.5px;
    text-transform: uppercase;
  }

  /* ═══════════════════════════════
     BACK CARD
  ═══════════════════════════════ */
  .card-back {
    background: ${P.cream};
    display: flex;
    flex-direction: column;
    border: 1px solid ${P.border};
  }

  /* Dark navy header — company name + products underneath */
  .back-band {
    background: ${P.navy};
    padding: 2.5mm 4.5mm 3mm;
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    flex-shrink: 0;
  }

  .back-band-left {
    display: flex;
    flex-direction: column;
    gap: 2mm;
  }

  .back-logo {
    font-size: 8.5pt;
    font-weight: 900;
    color: ${P.white};
    letter-spacing: -.2px;
  }
  .back-logo-accent { color: ${P.amber}; }

  /* Product pills sit right under the logo */
  .back-products {
    display: flex;
    gap: 2mm;
  }

  .bp {
    display: flex;
    flex-direction: column;
    gap: .4mm;
  }

  .bp-code {
    font-size: 7pt;
    font-weight: 900;
    line-height: 1;
  }
  .bp-vc4   .bp-code { color: #5EEAD4; }
  .bp-flash .bp-code { color: #FDBA74; }

  .bp-name {
    font-size: 5pt;
    font-weight: 500;
    color: rgba(255,255,255,.45);
    line-height: 1.2;
  }

  .back-tagline-col {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: .5mm;
    padding-top: .5mm;
  }

  .back-tag-en {
    font-size: 5.5pt;
    font-weight: 600;
    color: rgba(255,255,255,.55);
    font-style: italic;
  }

  .back-tag-es {
    font-size: 5pt;
    font-weight: 500;
    color: ${P.amber};
    font-style: italic;
    opacity: .75;
  }

  /* QR code — centered in the white body area */
  .back-qr-area {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 2mm;
    padding: 3mm;
  }

  .qr-wrap {
    width: 20mm;
    height: 20mm;
    border-radius: 2mm;
    overflow: hidden;
  }

  .qr-wrap svg {
    display: block;
    width: 100%;
    height: 100%;
  }

  .qr-label {
    font-size: 5pt;
    font-weight: 700;
    color: ${P.muted};
    text-align: center;
    text-transform: uppercase;
    letter-spacing: 1.2px;
  }

  /* Amber footer — inverted from back navy header */
  .back-footer {
    padding: 2mm 4.5mm;
    display: flex;
    justify-content: space-between;
    align-items: center;
    background: ${P.amber};
    flex-shrink: 0;
  }

  .back-url {
    font-size: 7.5pt;
    font-weight: 900;
    color: ${P.navy};
    letter-spacing: .2px;
  }

  .back-bilingual {
    font-size: 5.5pt;
    font-weight: 600;
    color: rgba(13,27,42,.55);
    font-style: italic;
  }

  /* ── Cut guide ── */
  .cut-guide {
    border: 1px dashed #CBD5E0;
    border-radius: 3mm;
    padding: 4mm;
    margin-top: 2mm;
  }

  .cut-note {
    font-size: 6pt;
    color: #CBD5E0;
    text-align: center;
    margin-bottom: 3mm;
    text-transform: uppercase;
    letter-spacing: 1px;
  }

  /* ── Print ── */
  @media print {
    body { background: white; }
    .sheet { margin: 0; box-shadow: none; padding: 12mm; }
    @page { size: A4 portrait; margin: 0; }
  }
`;

// ── Card builders ─────────────────────────────────────────────────────────────

function cardFront(person) {
  return `
    <div class="card card-front">

      <!-- SVG background: V watermark + diagonal amber swoosh -->
      <svg class="front-svg-bg" viewBox="0 0 270 165" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid slice">
        <!-- Mascot "V" watermark -->
        <text x="162" y="152" font-size="160" font-family="Inter,Arial,sans-serif" font-weight="900"
              fill="rgba(255,255,255,0.04)" text-anchor="middle">V</text>
        <!-- Diagonal amber swoosh — bottom right -->
        <polygon points="168,165 270,72 270,165" fill="#E8961C" opacity="0.14"/>
        <polygon points="210,165 270,112 270,165" fill="#E8961C" opacity="0.18"/>
        <!-- Dot accents in the swoosh -->
        <circle cx="237" cy="128" r="2.8" fill="#E8961C" opacity="0.18"/>
        <circle cx="252" cy="114" r="1.8" fill="#E8961C" opacity="0.14"/>
        <circle cx="261" cy="104" r="1.2" fill="#E8961C" opacity="0.1"/>
      </svg>

      <div class="front-inner">
        <!-- Amber identity bar -->
        <div class="front-bar">
          <div class="front-brand">
            VALU<span class="front-brand-dim">CONNECT</span>
          </div>
          <div class="front-bilingual-badge">EN · ES</div>
        </div>

        <!-- Body: avatar + info -->
        <div class="front-body">
          <div class="front-avatar">
            <span class="front-avatar-text">${person.initials}</span>
          </div>
          <div class="front-info">
            <div class="front-name">${person.name}</div>
            <div class="front-title">${person.title}</div>
            <div class="front-url">${CO.url}</div>
            <div class="front-email">${person.email}</div>
          </div>
        </div>

        <!-- Bottom: product pills + mascot mark -->
        <div class="front-bottom">
          <div class="front-pills">
            <span class="pill pill-vc4">VC4</span>
            <span class="pill pill-flash">Flash-It</span>
          </div>
          <div class="front-mascot">VALU ◆</div>
        </div>
      </div>

    </div>`;
}

function cardBack(qrSvg) {
  const [vcie, flash] = CO.products;
  return `
    <div class="card card-back">

      <!-- Navy header: company name + products underneath -->
      <div class="back-band">
        <div class="back-band-left">
          <div class="back-logo">
            Valu<span class="back-logo-accent">Connect</span> Solutions
          </div>
          <div class="back-products">
            <div class="bp bp-vc4">
              <div class="bp-code">${vcie.code}</div>
              <div class="bp-name">${vcie.full}</div>
            </div>
            <div class="bp bp-flash">
              <div class="bp-code">${flash.code}</div>
              <div class="bp-name">${flash.full}</div>
            </div>
          </div>
        </div>
        <div class="back-tagline-col">
          <div class="back-tag-en">${CO.tagline}</div>
          <div class="back-tag-es">${CO.tagline_es}</div>
        </div>
      </div>

      <!-- QR code centered in white body -->
      <div class="back-qr-area">
        <div class="qr-wrap">${qrSvg}</div>
        <div class="qr-label">Scan to book a meeting</div>
      </div>

      <!-- Amber footer -->
      <div class="back-footer">
        <div class="back-url">vcsolutions.us</div>
        <div class="back-bilingual">Hablamos tu idioma · We speak your language</div>
      </div>

    </div>`;
}

// ── Full page builder ─────────────────────────────────────────────────────────
function buildCardPage(person, qrSvg) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>ValuConnect Business Card — ${person.name}</title>
  <style>${CSS}</style>
</head>
<body>
<div class="sheet">

  <div class="sheet-title">
    ValuConnect Solutions · Business Card · ${person.name} · Print &amp; Cut
  </div>

  <!-- FRONT cards -->
  <div class="cut-guide">
    <div class="cut-note">✂ Front of Card — print 2 copies or use as-is</div>
    <div class="card-row">
      <div class="card-row-label">Front</div>
      <div class="cards-wrap">
        ${cardFront(person)}
        ${cardFront(person)}
      </div>
    </div>
  </div>

  <!-- BACK cards -->
  <div class="cut-guide">
    <div class="cut-note">✂ Back of Card — flip sheet and print on reverse side</div>
    <div class="card-row">
      <div class="card-row-label">Back</div>
      <div class="cards-wrap">
        ${cardBack(qrSvg)}
        ${cardBack(qrSvg)}
      </div>
    </div>
  </div>

  <!-- Print instructions -->
  <div style="font-size:7pt;color:#94A3B8;line-height:1.6;border-top:1px solid #E2E8F0;padding-top:4mm;">
    <strong style="color:#64748B;">Print instructions:</strong>
    Print page 1 → flip sheet → print page 1 again (duplex) → cut along dashed guides.
    Card size: 90mm × 55mm. Recommended: 350gsm card stock, matte or gloss finish.
  </div>

</div>
</body>
</html>`;
}

// ── Run ───────────────────────────────────────────────────────────────────────
(async () => {
  // Generate QR SVG once — same calendar link for all cards
  const rawSvg = await QRCode.toString(CALENDAR_URL, {
    type: 'svg',
    margin: 1,
    errorCorrectionLevel: 'M',
    color: { dark: '#0D1B2A', light: '#FAFAF8' },
  });
  // Strip fixed width/height so CSS controls the print size
  const qrSvg = rawSvg
    .replace(/width="\d+"/, 'width="100%"')
    .replace(/height="\d+"/, 'height="100%"');

  for (const person of PEOPLE) {
    const html = buildCardPage(person, qrSvg);
    const file = path.join(OUT, `bizcard-${person.id}.html`);
    fs.writeFileSync(file, html);
    console.log(`✓  bizcard-${person.id}.html  (${person.name} · ${person.title})`);
  }

  console.log('\n🎉 Business cards ready → presentations/output/bizcard-[name].html');
  console.log('\nDesign: Brand V watermark · Amber diagonal · Avatar initials · QR calendar booking');
  console.log('\nProducts on card:');
  CO.products.forEach(p => console.log(`  · ${p.code} — ${p.full}`));
  console.log(`\nCalendar QR: ${CALENDAR_URL}`);
  console.log('\nTo print: Chrome → File → Print → A4 Portrait · Background graphics ON · Margins = None');
})();
