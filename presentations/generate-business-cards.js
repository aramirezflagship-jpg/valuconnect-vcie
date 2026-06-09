#!/usr/bin/env node
/**
 * ValuConnect Business Card Generator
 * Produces print-ready A4 sheets with front + back business cards.
 * Each person gets their own HTML file — print, cut on the guides.
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

const fs   = require('fs');
const path = require('path');
const OUT  = path.join(__dirname, 'output');
if (!fs.existsSync(OUT)) fs.mkdirSync(OUT, { recursive: true });

// ── Company + Product data ────────────────────────────────────────────────────
// Sources: marketing.md (VCIE, brand), monday.com Flash-It board (Pixel AI workspace)
const CO = {
  name:    'ValuConnect Solutions',
  url:     'valuconnect.com',
  tagline: 'Work Smarter, Not Harder.',
  langs:   'EN · ES',
  products: [
    {
      code:  'VC4',
      full:  'Content Intelligence Engine',
      desc:  'AI-powered bilingual content automation',
    },
    {
      code:  'Flash-It',
      full:  'AI Photo Booth Platform',
      desc:  'iPad kiosk · cloud delivery · guest pipeline',
    },
  ],
};

const PEOPLE = [
  {
    id:       'andres',
    name:     'Andres Ramirez',
    title:    'Founder & Implementation Director',
    initials: 'AR',
    quote:    '"Trabajemos con inteligencia, no con esfuerzo."',
  },
  {
    id:       'yolanda',
    name:     'Yolanda Ribeyro',
    title:    'Director of Sales & Marketing LATAM',
    initials: 'YR',
    quote:    '"Your success is our success — we grow together."',
  },
];

// ── Design tokens ─────────────────────────────────────────────────────────────
const P = {
  ink:    '#111827',   // near-black
  slate:  '#1E293B',   // card dark bg
  white:  '#FFFFFF',
  offwht: '#F8FAFC',
  amber:  '#D97706',   // primary accent
  amberL: '#FEF3C7',   // light amber
  blue:   '#1D4ED8',   // product accent
  blueL:  '#DBEAFE',
  muted:  '#64748B',
  border: '#E2E8F0',
};

// ── CSS ───────────────────────────────────────────────────────────────────────
const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:ital,wght@0,300;0,400;0,500;0,600;0,700;0,800;0,900;1,400&display=swap');

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
    margin-bottom: 2mm;
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

  .cards-wrap {
    display: flex;
    gap: 5mm;
  }

  /* ── Business card base ── */
  .card {
    width: 90mm;
    height: 55mm;
    border-radius: 2.5mm;
    overflow: hidden;
    position: relative;
    flex-shrink: 0;
    /* Cut guide shadow */
    box-shadow: 0 0 0 0.5px #CBD5E0, 0 2px 8px rgba(0,0,0,.12);
  }

  /* ── FRONT card ── */
  .card-front {
    background: ${P.slate};
    display: flex;
    flex-direction: column;
  }

  .front-top {
    flex: 1;
    display: flex;
    padding: 5mm 5.5mm 4mm;
    gap: 4mm;
  }

  /* Left amber stripe */
  .front-stripe {
    width: 4mm;
    background: ${P.amber};
    border-radius: 1mm 0 0 1mm;
    flex-shrink: 0;
    position: relative;
  }

  .front-stripe::after {
    content: '';
    position: absolute;
    bottom: 0; left: 0; right: 0;
    height: 12mm;
    background: linear-gradient(to top, rgba(255,255,255,.15), transparent);
  }

  .front-content {
    flex: 1;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
  }

  .front-logo {
    font-size: 7pt;
    font-weight: 800;
    color: rgba(255,255,255,.55);
    letter-spacing: .5px;
    text-transform: uppercase;
  }
  .front-logo span { color: ${P.amber}; }

  .front-name {
    font-size: 14pt;
    font-weight: 900;
    color: ${P.white};
    line-height: 1.1;
    margin-top: 3mm;
  }

  .front-title {
    font-size: 7pt;
    font-weight: 500;
    color: rgba(255,255,255,.60);
    line-height: 1.4;
    margin-top: 1.5mm;
  }

  .front-url {
    font-size: 7.5pt;
    font-weight: 700;
    color: ${P.amber};
    margin-top: 2mm;
    letter-spacing: .3px;
  }

  /* Product pills row at bottom of front */
  .front-bottom {
    background: rgba(255,255,255,.06);
    border-top: 1px solid rgba(255,255,255,.1);
    padding: 2.5mm 5.5mm;
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  .product-pills {
    display: flex;
    gap: 2.5mm;
  }

  .prod-pill {
    font-size: 6pt;
    font-weight: 800;
    padding: 1.5px 6px;
    border-radius: 10px;
    letter-spacing: .3px;
  }

  .pill-vcie {
    background: rgba(29,78,216,.35);
    color: #93C5FD;
    border: 1px solid rgba(147,197,253,.25);
  }

  .pill-flashit {
    background: rgba(217,119,6,.25);
    color: ${P.amber};
    border: 1px solid rgba(217,119,6,.3);
  }

  .front-lang {
    font-size: 6pt;
    font-weight: 600;
    color: rgba(255,255,255,.3);
  }

  /* ── BACK card ── */
  .card-back {
    background: ${P.white};
    border: 1px solid ${P.border};
    display: flex;
    flex-direction: column;
  }

  /* Top amber band */
  .back-band {
    background: ${P.amber};
    padding: 3.5mm 5mm;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .back-logo {
    font-size: 8.5pt;
    font-weight: 900;
    color: ${P.ink};
    letter-spacing: -.2px;
  }

  .back-tagline {
    font-size: 6pt;
    font-weight: 600;
    color: rgba(17,24,39,.6);
    font-style: italic;
  }

  /* Products section */
  .back-products {
    flex: 1;
    display: flex;
    gap: 0;
    padding: 4mm 5mm;
  }

  .back-product {
    flex: 1;
    display: flex;
    flex-direction: column;
    padding: 3mm 3.5mm;
    border-radius: 2mm;
    gap: 1.5mm;
  }

  .bp-vcie    { background: ${P.blueL}; margin-right: 2mm; }
  .bp-flashit { background: ${P.amberL}; }

  .bp-label {
    font-size: 5.5pt;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 1.5px;
    color: ${P.muted};
    margin-bottom: 1mm;
  }

  .bp-code {
    font-size: 10.5pt;
    font-weight: 900;
    line-height: 1;
    margin-bottom: 1mm;
  }

  .bp-vcie    .bp-code { color: ${P.blue}; }
  .bp-flashit .bp-code { color: ${P.amber}; }

  .bp-full {
    font-size: 7pt;
    font-weight: 700;
    color: ${P.ink};
    line-height: 1.2;
  }

  .bp-desc {
    font-size: 6pt;
    color: ${P.muted};
    line-height: 1.4;
    margin-top: auto;
  }

  /* Bottom strip */
  .back-footer {
    background: ${P.slate};
    padding: 2.5mm 5mm;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .back-url {
    font-size: 7.5pt;
    font-weight: 800;
    color: ${P.white};
    letter-spacing: .2px;
  }

  .back-bilingual {
    font-size: 6pt;
    color: rgba(255,255,255,.45);
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
      <div class="front-top">
        <div class="front-stripe"></div>
        <div class="front-content">
          <div class="front-logo">Valu<span>Connect</span> Solutions</div>
          <div>
            <div class="front-name">${person.name}</div>
            <div class="front-title">${person.title}</div>
            <div class="front-url">${CO.url}</div>
          </div>
        </div>
      </div>
      <div class="front-bottom">
        <div class="product-pills">
          <span class="prod-pill pill-vcie">VC4</span>
          <span class="prod-pill pill-flashit">Flash-It</span>
        </div>
        <div class="front-lang">${CO.langs}</div>
      </div>
    </div>`;
}

function cardBack() {
  const [vcie, flash] = CO.products;
  return `
    <div class="card card-back">
      <div class="back-band">
        <div class="back-logo">ValuConnect Solutions</div>
        <div class="back-tagline">${CO.tagline}</div>
      </div>
      <div class="back-products">
        <div class="back-product bp-vcie">
          <div class="bp-label">Product</div>
          <div class="bp-code">${vcie.code}</div>
          <div class="bp-full">${vcie.full}</div>
          <div class="bp-desc">${vcie.desc}</div>
        </div>
        <div class="back-product bp-flashit">
          <div class="bp-label">Product</div>
          <div class="bp-code">${flash.code}</div>
          <div class="bp-full">${flash.full}</div>
          <div class="bp-desc">${flash.desc}</div>
        </div>
      </div>
      <div class="back-footer">
        <div class="back-url">${CO.url}</div>
        <div class="back-bilingual">Hablamos tu idioma · We speak your language</div>
      </div>
    </div>`;
}

// ── Full page builder ─────────────────────────────────────────────────────────
function buildCardPage(person) {
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

  <!-- FRONT cards (print 2 for double-sided cutting) -->
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

  <!-- BACK cards (flip sheet to print on reverse) -->
  <div class="cut-guide">
    <div class="cut-note">✂ Back of Card — flip sheet and print on reverse side</div>
    <div class="card-row">
      <div class="card-row-label">Back</div>
      <div class="cards-wrap">
        ${cardBack()}
        ${cardBack()}
      </div>
    </div>
  </div>

  <!-- Usage instructions -->
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
for (const person of PEOPLE) {
  const html = buildCardPage(person);
  const file = path.join(OUT, `bizcard-${person.id}.html`);
  fs.writeFileSync(file, html);
  console.log(`✓  bizcard-${person.id}.html  (${person.name} · ${person.title})`);
}

console.log('\n🎉 Business cards ready → presentations/output/bizcard-[name].html');
console.log('\nProducts on card:');
CO.products.forEach(p => console.log(`  · ${p.code} — ${p.full}`));
console.log('\nTo print: Chrome → File → Print → A4 Portrait · Background graphics ON · Margins = None');
