#!/usr/bin/env node
/**
 * ValuConnect Presentation Generator
 * Outputs one print-ready HTML file per industry + one master overview deck.
 * Print to PDF from any browser: File → Print → Save as PDF → A4/Letter, margins: minimum.
 *
 * Usage:  node presentations/generate-presentations.js
 * Output: presentations/output/overview.html
 *         presentations/output/[industry-slug].html  (8 files)
 */

const fs = require('fs');
const path = require('path');

const brand = JSON.parse(fs.readFileSync(path.join(__dirname, '../config/brand.json'), 'utf8'));
const { industries } = JSON.parse(fs.readFileSync(path.join(__dirname, '../config/industries.json'), 'utf8'));

const OUT = path.join(__dirname, 'output');
if (!fs.existsSync(OUT)) fs.mkdirSync(OUT, { recursive: true });

// ── Brand tokens ──────────────────────────────────────────────────────────────
const C = {
  navy:      '#0d1f44',
  navyLight: '#1a3060',
  gold:      '#d4920a',
  goldLight: '#f0ab12',
  teal:      '#1a9080',
  tealLight: '#22b09d',
  white:     '#ffffff',
  grayBg:    '#f4f6fa',
  grayText:  '#5a6a85',
};

// ── Shared CSS injected into every page ───────────────────────────────────────
const sharedCSS = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');

  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  :root {
    --navy: ${C.navy};
    --navy-light: ${C.navyLight};
    --gold: ${C.gold};
    --gold-light: ${C.goldLight};
    --teal: ${C.teal};
    --teal-light: ${C.tealLight};
    --white: ${C.white};
    --gray-bg: ${C.grayBg};
    --gray-text: ${C.grayText};
  }

  body {
    font-family: 'Inter', 'Segoe UI', system-ui, sans-serif;
    color: var(--navy);
    background: #e8ebf0;
    line-height: 1.5;
  }

  /* ── Slide container ── */
  .slide {
    width: 210mm;
    min-height: 148mm;
    background: var(--white);
    margin: 12mm auto;
    padding: 0;
    overflow: hidden;
    box-shadow: 0 4px 24px rgba(0,0,0,.18);
    page-break-after: always;
    position: relative;
  }

  .slide:last-of-type { page-break-after: auto; }

  /* ── Cover slide ── */
  .slide-cover {
    background: linear-gradient(145deg, var(--navy) 0%, var(--navy-light) 60%, #1e3a6e 100%);
    color: var(--white);
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: flex-start;
    padding: 14mm 18mm;
    min-height: 148mm;
  }

  .slide-cover .eyebrow {
    font-size: 8pt;
    font-weight: 700;
    letter-spacing: 3px;
    text-transform: uppercase;
    color: var(--gold);
    margin-bottom: 6mm;
  }

  .slide-cover h1 {
    font-size: 32pt;
    font-weight: 900;
    line-height: 1.1;
    margin-bottom: 5mm;
    max-width: 140mm;
  }

  .slide-cover h1 span { color: var(--gold); }

  .slide-cover .subtitle {
    font-size: 12pt;
    color: rgba(255,255,255,.80);
    max-width: 130mm;
    line-height: 1.6;
    margin-bottom: 9mm;
  }

  .slide-cover .tag-row {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    margin-bottom: 10mm;
  }

  .tag {
    background: rgba(255,255,255,.12);
    border: 1px solid rgba(255,255,255,.25);
    color: #fff;
    font-size: 8pt;
    font-weight: 600;
    padding: 3px 9px;
    border-radius: 20px;
  }

  .slide-cover .cta-pill {
    background: var(--gold);
    color: var(--navy);
    font-size: 9pt;
    font-weight: 800;
    padding: 5px 14px;
    border-radius: 20px;
    letter-spacing: .5px;
  }

  .cover-accent {
    position: absolute;
    right: 0; top: 0; bottom: 0;
    width: 50mm;
    background: linear-gradient(180deg, var(--teal) 0%, var(--teal-light) 100%);
    opacity: .15;
    clip-path: polygon(30% 0, 100% 0, 100% 100%, 0% 100%);
  }

  .cover-dot-grid {
    position: absolute;
    right: 6mm; top: 6mm;
    width: 40mm; height: 40mm;
    opacity: .12;
    background-image: radial-gradient(circle, #fff 1px, transparent 1px);
    background-size: 6mm 6mm;
  }

  /* ── Section slide ── */
  .slide-body {
    display: flex;
    flex-direction: column;
    padding: 10mm 14mm 10mm;
    min-height: 148mm;
  }

  .slide-header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    margin-bottom: 7mm;
    padding-bottom: 5mm;
    border-bottom: 2px solid var(--gold);
  }

  .slide-header .slide-title {
    font-size: 16pt;
    font-weight: 900;
    color: var(--navy);
    line-height: 1.2;
    max-width: 130mm;
  }

  .slide-header .slide-title span { color: var(--teal); }

  .slide-logo {
    font-size: 9pt;
    font-weight: 800;
    color: var(--navy);
    white-space: nowrap;
    opacity: .55;
  }

  .slide-logo span { color: var(--gold); }

  /* ── Cards ── */
  .card-grid { display: grid; gap: 5mm; flex: 1; }
  .card-grid-2 { grid-template-columns: 1fr 1fr; }
  .card-grid-3 { grid-template-columns: 1fr 1fr 1fr; }
  .card-grid-4 { grid-template-columns: 1fr 1fr 1fr 1fr; }

  .card {
    background: var(--gray-bg);
    border-radius: 5px;
    padding: 6mm;
    border-left: 3px solid var(--teal);
  }

  .card.gold-accent { border-left-color: var(--gold); }
  .card.navy-card { background: var(--navy); border-left-color: var(--gold); }

  .card-icon {
    font-size: 18pt;
    margin-bottom: 3mm;
    display: block;
  }

  .card-label {
    font-size: 7pt;
    font-weight: 700;
    letter-spacing: 1.5px;
    text-transform: uppercase;
    color: var(--teal);
    margin-bottom: 2mm;
  }

  .card.navy-card .card-label { color: var(--gold); }

  .card-title {
    font-size: 10pt;
    font-weight: 700;
    color: var(--navy);
    margin-bottom: 2mm;
    line-height: 1.3;
  }

  .card.navy-card .card-title { color: var(--white); }

  .card-text {
    font-size: 8.5pt;
    color: var(--gray-text);
    line-height: 1.55;
  }

  .card.navy-card .card-text { color: rgba(255,255,255,.75); }

  /* ── Pain / solution rows ── */
  .compare-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 5mm;
    flex: 1;
  }

  .compare-col-header {
    font-size: 9pt;
    font-weight: 800;
    letter-spacing: 1px;
    text-transform: uppercase;
    margin-bottom: 4mm;
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .col-before { color: #c0392b; }
  .col-after  { color: var(--teal); }

  .compare-list { list-style: none; }

  .compare-list li {
    display: flex;
    align-items: flex-start;
    gap: 6px;
    font-size: 9pt;
    color: var(--navy);
    line-height: 1.45;
    margin-bottom: 4mm;
    background: var(--gray-bg);
    border-radius: 4px;
    padding: 4px 7px;
  }

  .compare-list li .bullet {
    flex-shrink: 0;
    width: 16px;
    height: 16px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 8pt;
    font-weight: 900;
    margin-top: 1px;
  }

  .bullet-x { background: #fde8e8; color: #c0392b; }
  .bullet-check { background: #e0f5f1; color: var(--teal); }

  /* ── Result chips ── */
  .result-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 5mm;
    flex: 1;
  }

  .result-chip {
    background: linear-gradient(135deg, var(--navy) 0%, var(--navyLight) 100%);
    border-radius: 6px;
    padding: 7mm;
    text-align: center;
    color: var(--white);
  }

  .result-chip .metric {
    font-size: 22pt;
    font-weight: 900;
    color: var(--gold);
    line-height: 1;
    margin-bottom: 2mm;
  }

  .result-chip .metric-label {
    font-size: 8.5pt;
    color: rgba(255,255,255,.82);
    line-height: 1.4;
  }

  /* ── Quote slide ── */
  .quote-slide {
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    text-align: center;
    padding: 12mm 18mm;
    background: linear-gradient(135deg, var(--navy) 0%, var(--navyLight) 100%);
    min-height: 148mm;
  }

  .quote-mark {
    font-size: 48pt;
    font-weight: 900;
    color: var(--gold);
    line-height: .7;
    margin-bottom: 5mm;
    opacity: .6;
  }

  .quote-text {
    font-size: 14pt;
    font-weight: 600;
    color: var(--white);
    line-height: 1.6;
    max-width: 150mm;
    margin-bottom: 7mm;
    font-style: italic;
  }

  .quote-attr {
    font-size: 9pt;
    font-weight: 700;
    color: var(--gold);
    letter-spacing: .5px;
    margin-bottom: 10mm;
  }

  .quote-cta-box {
    background: var(--gold);
    color: var(--navy);
    border-radius: 8px;
    padding: 6mm 14mm;
    text-align: center;
    max-width: 120mm;
  }

  .quote-cta-box .cta-heading {
    font-size: 13pt;
    font-weight: 900;
    margin-bottom: 2mm;
  }

  .quote-cta-box .cta-sub {
    font-size: 9pt;
    font-weight: 600;
    opacity: .8;
  }

  /* ── Industry grid (overview only) ── */
  .industry-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 4mm;
    flex: 1;
  }

  .industry-card {
    background: var(--gray-bg);
    border-radius: 5px;
    padding: 5mm;
    border-top: 3px solid var(--teal);
    display: flex;
    flex-direction: column;
  }

  .industry-card .ind-icon { font-size: 14pt; margin-bottom: 2mm; }

  .industry-card .ind-name {
    font-size: 8.5pt;
    font-weight: 800;
    color: var(--navy);
    margin-bottom: 2mm;
    line-height: 1.3;
  }

  .industry-card .ind-pain {
    font-size: 7.5pt;
    color: var(--gray-text);
    line-height: 1.4;
    flex: 1;
  }

  .industry-card .ind-result {
    font-size: 7.5pt;
    font-weight: 700;
    color: var(--teal);
    margin-top: 3mm;
  }

  /* ── Process steps ── */
  .process-steps {
    display: flex;
    gap: 4mm;
    flex: 1;
    align-items: stretch;
  }

  .process-step {
    flex: 1;
    background: var(--gray-bg);
    border-radius: 6px;
    padding: 6mm;
    text-align: center;
    position: relative;
  }

  .step-num {
    width: 10mm;
    height: 10mm;
    border-radius: 50%;
    background: var(--navy);
    color: var(--gold);
    font-size: 10pt;
    font-weight: 900;
    display: flex;
    align-items: center;
    justify-content: center;
    margin: 0 auto 4mm;
  }

  .step-icon { font-size: 16pt; margin-bottom: 3mm; }

  .step-title {
    font-size: 9pt;
    font-weight: 800;
    color: var(--navy);
    margin-bottom: 2mm;
  }

  .step-text {
    font-size: 8pt;
    color: var(--gray-text);
    line-height: 1.5;
  }

  .step-arrow {
    position: absolute;
    right: -4mm;
    top: 50%;
    transform: translateY(-50%);
    color: var(--gold);
    font-size: 12pt;
    font-weight: 900;
    z-index: 2;
  }

  /* ── Services list ── */
  .services-grid {
    display: grid;
    grid-template-columns: 1fr 1fr 1fr;
    gap: 5mm;
    flex: 1;
  }

  .service-item {
    display: flex;
    align-items: flex-start;
    gap: 4mm;
    background: var(--gray-bg);
    border-radius: 5px;
    padding: 5mm;
  }

  .service-icon {
    font-size: 16pt;
    flex-shrink: 0;
  }

  .service-title {
    font-size: 9.5pt;
    font-weight: 800;
    color: var(--navy);
    margin-bottom: 1.5mm;
  }

  .service-text {
    font-size: 8pt;
    color: var(--gray-text);
    line-height: 1.5;
  }

  /* ── Differentiators (2-col) ── */
  .diff-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 5mm;
    flex: 1;
    align-content: start;
  }

  .diff-item {
    display: flex;
    align-items: flex-start;
    gap: 5mm;
    padding: 5mm;
    background: var(--gray-bg);
    border-radius: 5px;
  }

  .diff-icon {
    font-size: 16pt;
    flex-shrink: 0;
  }

  .diff-title {
    font-size: 9.5pt;
    font-weight: 800;
    color: var(--navy);
    margin-bottom: 1.5mm;
  }

  .diff-text {
    font-size: 8pt;
    color: var(--gray-text);
    line-height: 1.5;
  }

  /* ── Slide footer bar ── */
  .slide-footer {
    position: absolute;
    bottom: 0; left: 0; right: 0;
    height: 6mm;
    background: linear-gradient(90deg, var(--navy) 0%, var(--teal) 100%);
    display: flex;
    align-items: center;
    padding: 0 8mm;
  }

  .slide-footer span {
    font-size: 6pt;
    color: rgba(255,255,255,.6);
    font-weight: 500;
  }

  /* ── Company intro slide ── */
  .intro-layout {
    display: grid;
    grid-template-columns: 3fr 2fr;
    gap: 8mm;
    flex: 1;
    align-items: start;
  }
  .intro-tagline {
    font-size: 15pt;
    font-weight: 800;
    color: var(--navy);
    line-height: 1.3;
    margin-bottom: 4mm;
  }
  .intro-body {
    font-size: 9pt;
    color: var(--gray-text);
    line-height: 1.65;
    margin-bottom: 5mm;
  }
  .founder-card {
    background: var(--navy);
    border-radius: 6px;
    border-left: 3px solid var(--gold);
    padding: 4mm 6mm;
    display: flex;
    align-items: center;
    gap: 5mm;
    margin-bottom: 4mm;
  }
  .founder-avatar {
    width: 12mm;
    height: 12mm;
    border-radius: 50%;
    background: var(--gold);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 14pt;
    flex-shrink: 0;
  }
  .founder-name { font-size: 10pt; font-weight: 800; color: #fff; line-height: 1.2; }
  .founder-sub  { font-size: 7.5pt; color: rgba(255,255,255,.65); }
  .trust-badges { display: flex; gap: 5px; flex-wrap: wrap; }
  .trust-badge {
    background: var(--teal);
    color: #fff;
    font-size: 7pt;
    font-weight: 700;
    padding: 2px 8px;
    border-radius: 12px;
    letter-spacing: .3px;
  }
  .services-mini-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 3mm; }
  .service-mini {
    background: var(--gray-bg);
    border-radius: 5px;
    padding: 4mm;
    border-top: 2px solid var(--teal);
  }
  .service-mini-icon  { font-size: 13pt; margin-bottom: 1.5mm; display: block; }
  .service-mini-title { font-size: 7.5pt; font-weight: 800; color: var(--navy); margin-bottom: 1mm; line-height: 1.2; }
  .service-mini-text  { font-size: 6.5pt; color: var(--gray-text); line-height: 1.45; }

  /* ── Challenge cards ── */
  .challenge-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 5mm; flex: 1; }
  .challenge-card {
    background: var(--gray-bg);
    border-radius: 6px;
    padding: 6mm;
    border-left: 3px solid #e8534a;
    display: flex;
    flex-direction: column;
    gap: 2mm;
  }
  .challenge-icon  { font-size: 18pt; }
  .challenge-title { font-size: 10pt; font-weight: 800; color: var(--navy); line-height: 1.3; }
  .challenge-consequence {
    font-size: 8pt;
    color: #c0392b;
    font-style: italic;
    line-height: 1.45;
    margin-top: auto;
    padding-top: 2mm;
    border-top: 1px solid rgba(192,57,43,.15);
  }

  /* ── Chart slide ── */
  .chart-layout {
    display: grid;
    grid-template-columns: 3fr 2fr;
    gap: 6mm;
    flex: 1;
    align-items: center;
  }
  .chart-block {
    background: var(--gray-bg);
    border-radius: 6px;
    padding: 6mm;
    display: flex;
    flex-direction: column;
    align-items: center;
    height: 100%;
    justify-content: center;
  }
  .chart-caption {
    font-size: 7.5pt;
    color: var(--gray-text);
    text-align: center;
    margin-top: 3mm;
    line-height: 1.45;
  }
  .chart-highlight {
    background: var(--navy);
    color: var(--gold);
    font-size: 8pt;
    font-weight: 800;
    padding: 3px 10px;
    border-radius: 12px;
    text-align: center;
    margin-top: 4mm;
    display: inline-block;
  }

  /* ── Before/After column tint ── */
  .compare-col-before-wrap { background: rgba(192,57,43,.03); border-radius: 5px; padding: 4mm; }
  .compare-col-after-wrap  { background: rgba(26,144,128,.04); border-radius: 5px; padding: 4mm; }

  /* ── Print media ── */
  @media print {
    body { background: white; }

    .slide {
      margin: 0;
      box-shadow: none;
      width: 210mm;
      min-height: 148mm;
    }

    @page {
      size: A4 landscape;
      margin: 0;
    }
  }
`;

// ── Industry icons map ────────────────────────────────────────────────────────
const icons = {
  'restaurants':           '🍽️',
  'retail':                '🛍️',
  'construction':          '🏗️',
  'health-wellness':       '🏥',
  'real-estate':           '🏠',
  'professional-services': '💼',
  'salons-beauty':         '✂️',
  'logistics':             '🚚',
};

// ── Helpers ───────────────────────────────────────────────────────────────────
function logo() {
  return `<span class="slide-logo">Valu<span>Connect</span></span>`;
}

function footer(text = 'ValuConnect Solutions · valuconnect.com · Free 30-min Workflow Assessment') {
  return `<div class="slide-footer"><span>${text}</span></div>`;
}

function slideHeader(title) {
  return `
    <div class="slide-header">
      <div class="slide-title">${title}</div>
      ${logo()}
    </div>`;
}

// ── Overview deck builder ─────────────────────────────────────────────────────
function buildOverview() {
  const slides = [];

  // Slide 1 — Cover
  slides.push(`
    <div class="slide">
      <div class="slide-cover">
        <div class="cover-accent"></div>
        <div class="cover-dot-grid"></div>
        <div class="eyebrow">Confidential · Customer Presentation</div>
        <h1>Work Smarter,<br>Not <span>Harder.</span></h1>
        <p class="subtitle">
          ${brand.company} helps small businesses leave paper chaos behind —
          replacing manual workflows with digital systems that save time, cut errors,
          and grow with your business.
        </p>
        <div class="tag-row">
          <span class="tag">8 Industries Served</span>
          <span class="tag">Bilingual EN/ES</span>
          <span class="tag">Paper → Digital</span>
          <span class="tag">Workflow Automation</span>
        </div>
        <div class="cta-pill">Free 30-Minute Workflow Assessment</div>
      </div>
      ${footer()}
    </div>`);

  // Slide 2 — The Problem
  slides.push(`
    <div class="slide">
      <div class="slide-body" style="padding-bottom: 10mm;">
        ${slideHeader('Sound Familiar? <span>The Cost of Staying Manual</span>')}
        <div class="card-grid card-grid-2" style="gap: 5mm;">
          <div class="card gold-accent">
            <span class="card-icon">📂</span>
            <div class="card-label">Lost Time</div>
            <div class="card-title">Hours spent searching for documents</div>
            <div class="card-text">Paper files, email threads, sticky notes — your team wastes 30–60 minutes every day on things that should take seconds.</div>
          </div>
          <div class="card gold-accent">
            <span class="card-icon">❌</span>
            <div class="card-label">Costly Errors</div>
            <div class="card-title">Mistakes that slip through the cracks</div>
            <div class="card-text">Missed deadlines, duplicate invoices, double-bookings — manual systems invite human error that costs you money and clients.</div>
          </div>
          <div class="card gold-accent">
            <span class="card-icon">📈</span>
            <div class="card-label">Blocked Growth</div>
            <div class="card-title">Can't scale without more staff</div>
            <div class="card-text">Every new customer means more paper, more chaos. Manual operations create a ceiling — you can't grow without drowning.</div>
          </div>
          <div class="card gold-accent">
            <span class="card-icon">😰</span>
            <div class="card-label">Owner Burnout</div>
            <div class="card-title">You're the system — and that's exhausting</div>
            <div class="card-text">When everything lives in your head or on paper, you can't step away, delegate, or truly run your business — it runs you.</div>
          </div>
        </div>
      </div>
      ${footer()}
    </div>`);

  // Slide 3 — Our Services
  const serviceList = [
    { icon: '📄', title: 'Paper-to-Digital Conversion', text: 'We digitize your physical documents — invoices, contracts, records — and build a searchable archive accessible from any device.' },
    { icon: '🗂️', title: 'Document Scanning & Filing', text: 'Professional scanning + organized digital folder structure with consistent naming so nothing is ever lost again.' },
    { icon: '⚙️', title: 'Workflow Automation', text: 'Repetitive tasks — reminders, approvals, follow-ups — run automatically. Your staff focuses on work that matters.' },
    { icon: '📊', title: 'Project & Task Tracking', text: 'Real-time dashboards showing who is responsible for what, by when — so nothing falls through the cracks.' },
    { icon: '🤖', title: 'AI Communication', text: 'Smart email templates, automated client updates, and AI-assisted responses that save hours every week.' },
    { icon: '🌐', title: 'Digital Systems Training', text: 'We don\'t just build the system — we train your team and stay available as your business grows.' },
  ];

  slides.push(`
    <div class="slide">
      <div class="slide-body" style="padding-bottom: 10mm;">
        ${slideHeader('What <span>ValuConnect</span> Does for Your Business')}
        <div class="services-grid">
          ${serviceList.map(s => `
            <div class="service-item">
              <span class="service-icon">${s.icon}</span>
              <div>
                <div class="service-title">${s.title}</div>
                <div class="service-text">${s.text}</div>
              </div>
            </div>`).join('')}
        </div>
      </div>
      ${footer()}
    </div>`);

  // Slide 4 — Industries we serve
  slides.push(`
    <div class="slide">
      <div class="slide-body" style="padding-bottom: 10mm;">
        ${slideHeader('We Speak <span>Your Industry\'s Language</span>')}
        <div class="industry-grid">
          ${industries.map(ind => `
            <div class="industry-card">
              <span class="ind-icon">${icons[ind.id] || '🏢'}</span>
              <div class="ind-name">${ind.name}</div>
              <div class="ind-pain">${ind.pain_points[0]}</div>
              <div class="ind-result">✓ ${ind.results[0]}</div>
            </div>`).join('')}
        </div>
      </div>
      ${footer()}
    </div>`);

  // Slide 5 — How it works (3 steps)
  const steps = [
    { icon: '📞', title: 'Free Assessment', text: '30-minute call with Andres to map your current workflow pain points and identify your biggest wins.' },
    { icon: '🗺️', title: 'Custom Roadmap', text: 'We build your digital system blueprint — prioritized by impact, timed for your business rhythm, zero disruption.' },
    { icon: '🚀', title: 'Go Live + Support', text: 'We implement, train your team, and stay available as your system evolves. You\'re never alone.' },
  ];

  slides.push(`
    <div class="slide">
      <div class="slide-body" style="padding-bottom: 10mm;">
        ${slideHeader('How It Works — <span>Simple as 1-2-3</span>')}
        <div class="process-steps">
          ${steps.map((s, i) => `
            <div class="process-step" style="${i < steps.length - 1 ? 'position: relative;' : ''}">
              <div class="step-num">${i + 1}</div>
              <div class="step-icon">${s.icon}</div>
              <div class="step-title">${s.title}</div>
              <div class="step-text">${s.text}</div>
              ${i < steps.length - 1 ? '<div class="step-arrow">›</div>' : ''}
            </div>`).join('')}
        </div>
        <div style="margin-top: 6mm; background: var(--gray-bg); border-radius: 6px; padding: 5mm; border-left: 3px solid var(--gold);">
          <div style="font-size: 9pt; font-weight: 700; color: var(--navy); margin-bottom: 1.5mm;">Why ValuConnect?</div>
          <div style="font-size: 8.5pt; color: var(--gray-text); line-height: 1.55;">${brand.core_promise} · Bilingual support (EN/ES) · Small business specialists · Personalized, hands-on implementation — not a one-size-fits-all platform.</div>
        </div>
      </div>
      ${footer()}
    </div>`);

  // Slide 6 — Results across industries
  const topResults = [
    { metric: '6 hrs', label: 'Saved per week\n(avg. per client)' },
    { metric: '80%', label: 'Reduction in\nstock-outs & errors' },
    { metric: '60%', label: 'Fewer no-shows\n(salons & clinics)' },
    { metric: '3x', label: 'Faster billing\ncycles' },
  ];

  slides.push(`
    <div class="slide">
      <div class="slide-body" style="padding-bottom: 10mm;">
        ${slideHeader('Real Results — <span>Real Small Businesses</span>')}
        <div class="result-grid" style="margin-bottom: 5mm;">
          ${topResults.map(r => `
            <div class="result-chip">
              <div class="metric">${r.metric}</div>
              <div class="metric-label">${r.label.replace(/\n/g, '<br>')}</div>
            </div>`).join('')}
        </div>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 4mm;">
          <div style="background: var(--gray-bg); border-radius: 5px; padding: 5mm; border-left: 3px solid var(--teal);">
            <div style="font-size: 8pt; font-style: italic; color: var(--navy); line-height: 1.5; margin-bottom: 2mm;">"I used to dread inspection week. Now everything is one click away."</div>
            <div style="font-size: 7.5pt; font-weight: 700; color: var(--teal);">Maria G. — Restaurant owner, Miami</div>
          </div>
          <div style="background: var(--gray-bg); border-radius: 5px; padding: 5mm; border-left: 3px solid var(--teal);">
            <div style="font-size: 8pt; font-style: italic; color: var(--navy); line-height: 1.5; margin-bottom: 2mm;">"We grew from 20 to 40 units without hiring extra staff. The system does the tracking for us."</div>
            <div style="font-size: 7.5pt; font-weight: 700; color: var(--teal);">Luis T. — Property manager, Dallas</div>
          </div>
        </div>
      </div>
      ${footer()}
    </div>`);

  // Slide 7 — CTA
  slides.push(`
    <div class="slide">
      <div class="quote-slide">
        <div class="quote-mark">"</div>
        <div class="quote-text">
          The best time to fix your workflow was a year ago.<br>
          The second best time is today.
        </div>
        <div class="quote-attr">— Andres Ramirez, Founder · ValuConnect Solutions</div>
        <div class="quote-cta-box">
          <div class="cta-heading">Book Your Free 30-Minute Workflow Assessment</div>
          <div class="cta-sub">No commitment · No jargon · Just clarity on where to start</div>
          <div style="margin-top: 4mm; font-size: 9pt; font-weight: 800; color: var(--navy);">valuconnect.com</div>
        </div>
        <div style="margin-top: 7mm; display: flex; gap: 8mm; justify-content: center;">
          <div style="text-align: center;">
            <div style="font-size: 7.5pt; font-weight: 700; color: rgba(255,255,255,.5); text-transform: uppercase; letter-spacing: 1px; margin-bottom: 1mm;">Founder</div>
            <div style="font-size: 9pt; font-weight: 700; color: #fff;">Andres Ramirez</div>
          </div>
          <div style="width: 1px; background: rgba(255,255,255,.2);"></div>
          <div style="text-align: center;">
            <div style="font-size: 7.5pt; font-weight: 700; color: rgba(255,255,255,.5); text-transform: uppercase; letter-spacing: 1px; margin-bottom: 1mm;">Bilingual</div>
            <div style="font-size: 9pt; font-weight: 700; color: #fff;">English · Español</div>
          </div>
          <div style="width: 1px; background: rgba(255,255,255,.2);"></div>
          <div style="text-align: center;">
            <div style="font-size: 7.5pt; font-weight: 700; color: rgba(255,255,255,.5); text-transform: uppercase; letter-spacing: 1px; margin-bottom: 1mm;">Industries</div>
            <div style="font-size: 9pt; font-weight: 700; color: #fff;">8 Specializations</div>
          </div>
        </div>
      </div>
      ${footer()}
    </div>`);

  return wrapHtml('ValuConnect Solutions — Customer Presentation', slides.join('\n'));
}

// ── Slide 2: Who is ValuConnect? ─────────────────────────────────────────────
function buildCompanyIntroSlide() {
  const services = [
    { icon: '📄', title: 'Paper-to-Digital', text: 'Invoices, contracts, records — searchable in seconds' },
    { icon: '🗂️', title: 'Document Filing', text: 'Organized digital folders — nothing ever lost' },
    { icon: '⚙️', title: 'Workflow Automation', text: 'Reminders, approvals, follow-ups run themselves' },
    { icon: '📊', title: 'Project Tracking', text: 'Real-time dashboards — who owns what, by when' },
    { icon: '🤖', title: 'AI Communication', text: 'Smart templates that save hours every week' },
    { icon: '🎓', title: 'Team Training', text: 'We build it, train your team, stay by your side' },
  ];
  return `
    <div class="slide">
      <div class="slide-body" style="padding-bottom: 10mm;">
        ${slideHeader('Who Is <span>ValuConnect Solutions?</span>')}
        <div class="intro-layout">
          <div>
            <div class="intro-tagline">"Your neighbor who happens to know digital systems."</div>
            <div class="intro-body">
              ValuConnect helps small business owners — especially Latino and Hispanic entrepreneurs —
              replace paper chaos with digital systems that run without stress. We're not a platform.
              We're a personalized, bilingual partner who builds the system, trains your team, and
              stays by your side as you grow.
            </div>
            <div class="founder-card">
              <div class="founder-avatar">👤</div>
              <div>
                <div class="founder-name">Andres Ramirez · Founder</div>
                <div class="founder-sub">ValuConnect Solutions · Bilingual EN/ES · Mascot: Valu</div>
              </div>
            </div>
            <div class="trust-badges">
              <span class="trust-badge">✓ Bilingual EN/ES</span>
              <span class="trust-badge">✓ Small Business Focused</span>
              <span class="trust-badge">✓ Hands-On Partner</span>
              <span class="trust-badge">✓ 8 Industries Served</span>
            </div>
          </div>
          <div class="services-mini-grid">
            ${services.map(s => `
              <div class="service-mini">
                <span class="service-mini-icon">${s.icon}</span>
                <div class="service-mini-title">${s.title}</div>
                <div class="service-mini-text">${s.text}</div>
              </div>`).join('')}
          </div>
        </div>
      </div>
      ${footer()}
    </div>`;
}

// ── Slide 4: Industry challenges with consequences ────────────────────────────
const challengeData = {
  restaurants: [
    { icon: '🧾', pain: 'Lost paper invoices',          consequence: 'One missing invoice can cause a $400 overpayment you never catch.' },
    { icon: '📅', pain: 'Scheduling conflicts',          consequence: 'Last-minute call-outs lead to overtime costs and poor customer experience.' },
    { icon: '📦', pain: 'No food cost visibility',       consequence: "You're pricing dishes on guesses — margins leak silently every month." },
    { icon: '🏥', pain: 'Health inspection dread',       consequence: 'Every inspection becomes a 2-day scramble — and all that stress lands on you.' },
  ],
  retail: [
    { icon: '📋', pain: 'Paper inventory cards',         consequence: 'Stock-outs cost you sales and send customers straight to your competitor.' },
    { icon: '📞', pain: 'Supplier orders by phone',      consequence: 'No paper trail means disputes, wrong shipments, and lost money.' },
    { icon: '🗄️', pain: 'Receipts in binders',          consequence: "Finding one customer's record takes 10+ minutes — if you find it at all." },
    { icon: '↩️', pain: 'No return tracking system',    consequence: 'Untracked returns breed fraud and erode your margins invisibly.' },
  ],
  construction: [
    { icon: '📝', pain: 'Handwritten work orders',       consequence: 'Illegible or lost orders cause rework — and the client holds you responsible.' },
    { icon: '📷', pain: 'Timesheets via text photos',   consequence: 'Late or disputed pay every Friday damages crew trust and retention.' },
    { icon: '🧾', pain: 'Missing subcontractor invoices',consequence: 'Duplicate payments and disputes can cost thousands on a single job.' },
    { icon: '📈', pain: 'Cost overruns found late',      consequence: 'Discovering overruns after the job ends destroys the margin you planned for.' },
  ],
  'health-wellness': [
    { icon: '🗂️', pain: 'Patient files in folders',     consequence: 'Slow retrieval frustrates patients and creates liability during audits.' },
    { icon: '📅', pain: 'Double-bookings on paper',      consequence: 'One scheduling error can cost you a patient relationship permanently.' },
    { icon: '📌', pain: 'Auth requests on sticky notes', consequence: 'Missed pre-authorizations mean denied claims and delayed revenue.' },
    { icon: '⚖️', pain: 'HIPAA compliance gaps',         consequence: 'A failed audit can trigger fines up to $50,000 — per violation.' },
  ],
  'real-estate': [
    { icon: '📁', pain: 'Leases in physical folders',   consequence: 'One flood or fire and your entire lease archive is gone — no backup.' },
    { icon: '📱', pain: 'Maintenance by text message',  consequence: 'Requests get buried in threads — issues fester and tenants get frustrated.' },
    { icon: '📊', pain: 'Conflicting rent spreadsheets',consequence: 'Version confusion leads to disputes, late fees you miss, and tenant friction.' },
    { icon: '⏰', pain: 'Missed lease renewals',         consequence: 'Month-to-month tenants cost you 2–3 months of lost locked-in revenue.' },
  ],
  'professional-services': [
    { icon: '📂', pain: 'Documents in folders & email', consequence: 'Staff waste hours hunting for files — billing time you can\'t recover.' },
    { icon: '❓', pain: 'No document tracking system',  consequence: 'You don\'t know what you\'re missing until a deadline has already passed.' },
    { icon: '😕', pain: 'Staff confusion on ownership', consequence: 'When no one knows who owns a task, it falls through the cracks.' },
    { icon: '🗓️', pain: 'Whiteboard deadline calendar', consequence: 'A single erased date can trigger a missed filing and a damaged client relationship.' },
  ],
  'salons-beauty': [
    { icon: '📖', pain: 'Paper appointment book',        consequence: 'One eraser and the whole day\'s schedule is a mystery — and clients are livid.' },
    { icon: '🎨', pain: 'No client formula records',    consequence: 'When a stylist leaves, every color formula walks out with them.' },
    { icon: '😶', pain: 'No-shows tracked on stickies', consequence: 'Without follow-up, every no-show is permanent lost revenue with no recovery.' },
    { icon: '🧴', pain: 'Inventory counted by eye',     consequence: 'Running out of a top seller mid-week costs retail sales and client trust.' },
  ],
  logistics: [
    { icon: '📞', pain: 'Dispatch by phone only',        consequence: 'No written record means he-said/she-said disputes on every job.' },
    { icon: '📋', pain: 'Paper delivery manifest',       consequence: 'A lost manifest with 30 deliveries on it is a full-day catastrophe.' },
    { icon: '💬', pain: 'Proof of delivery in group chat',consequence: 'Buried in 300+ messages — finding one delivery confirmation takes 20 minutes.' },
    { icon: '🕐', pain: 'Driver hours by verbal report', consequence: 'Pay disputes without records cost you in court and destroy driver trust.' },
  ],
};

function buildChallengesSlide(ind) {
  const cards = challengeData[ind.id] || ind.pain_points.map((p, i) => ({
    icon: ['⚠️','📋','❌','⏰'][i] || '⚠️',
    pain: p,
    consequence: 'This creates friction, cost, and stress that compounds over time.',
  }));
  return `
    <div class="slide">
      <div class="slide-body" style="padding-bottom: 10mm;">
        ${slideHeader('Does This Sound <span>Familiar?</span>')}
        <div class="challenge-grid">
          ${cards.map(c => `
            <div class="challenge-card">
              <span class="challenge-icon">${c.icon}</span>
              <div class="challenge-title">${c.pain}</div>
              <div class="challenge-consequence">💸 ${c.consequence}</div>
            </div>`).join('')}
        </div>
      </div>
      ${footer()}
    </div>`;
}

// ── Chart data per industry ───────────────────────────────────────────────────
const chartData = {
  restaurants: {
    title: 'Weekly Admin Time (Hours)',
    rows: [
      { label: 'Invoices',   before: 3,    after: 0.25, beforeLabel: '3 hrs',  afterLabel: '15 min' },
      { label: 'Scheduling', before: 2,    after: 0.5,  beforeLabel: '2 hrs',  afterLabel: '30 min' },
      { label: 'Compliance', before: 4,    after: 0.08, beforeLabel: '4 hrs',  afterLabel: '5 min'  },
    ],
    maxHrs: 4,
    savingsLabel: 'Total savings: ~6 hours saved every week',
    donut: { pct: 87, label: 'admin time\nreduced', before: '9 hrs/wk', after: '1.2 hrs/wk' },
  },
};

// Fallback chart data derived from results text for industries without custom data
function getFallbackChartData(ind) {
  return {
    title: 'Key Improvements After ValuConnect',
    rows: [
      { label: ind.results[0].split(' ').slice(-2).join(' '), before: 100, after: 20, beforeLabel: 'Before', afterLabel: ind.results[0] },
      { label: ind.results[1].split(' ').slice(-2).join(' '), before: 100, after: 30, beforeLabel: 'Before', afterLabel: ind.results[1] },
    ],
    maxHrs: 100,
    savingsLabel: ind.results[0],
    donut: { pct: 80, label: 'avg improvement\nacross metrics', before: 'Manual', after: 'Automated' },
  };
}

function buildChartSlide(ind) {
  const data = chartData[ind.id] || getFallbackChartData(ind);

  // Bar chart SVG — paired horizontal bars, before=red / after=teal
  // ViewBox: 330 wide, rows calculated dynamically
  const BAR_START = 95;  // x where bars begin
  const BAR_MAX   = 205; // max bar width in px (scale = BAR_MAX / data.maxHrs)
  const ROW_H     = 25;  // height allocated per metric row (2 bars + gap)
  const BAR_H     = 10;  // height of each bar
  const TOP       = 38;  // y start of first row
  const scale     = BAR_MAX / data.maxHrs;

  const rowsSVG = data.rows.map((row, i) => {
    const y0    = TOP + i * ROW_H;       // before bar top
    const y1    = y0 + BAR_H + 3;        // after bar top
    const labelY = y0 + BAR_H;           // label between bars
    const bW    = Math.max(2, Math.round(row.before * scale));
    const aW    = Math.max(2, Math.round(row.after  * scale));
    return `
      <text x="91" y="${labelY}" font-family="Inter,sans-serif" font-size="7"
            fill="#5a6a85" text-anchor="end">${row.label}</text>
      <rect x="${BAR_START}" y="${y0}" width="${bW}" height="${BAR_H}"
            fill="#e8534a" rx="2"/>
      <text x="${BAR_START + bW + 3}" y="${y0 + BAR_H - 1}"
            font-family="Inter,sans-serif" font-size="7" font-weight="700" fill="#e8534a">${row.beforeLabel}</text>
      <rect x="${BAR_START}" y="${y1}" width="${aW}" height="${BAR_H}"
            fill="#1a9080" rx="2"/>
      <text x="${BAR_START + aW + 3}" y="${y1 + BAR_H - 1}"
            font-family="Inter,sans-serif" font-size="7" font-weight="700" fill="#1a9080">${row.afterLabel}</text>`;
  }).join('');

  const chartBottom = TOP + data.rows.length * ROW_H + 4;
  const svgH = chartBottom + 28;

  const barChartSVG = `
    <svg viewBox="0 0 330 ${svgH}" xmlns="http://www.w3.org/2000/svg"
         style="width:100%;display:block;">
      <text x="0" y="13" font-family="Inter,sans-serif" font-size="9"
            font-weight="700" fill="#0d1f44">${data.title}</text>
      <!-- Legend -->
      <rect x="0" y="20" width="8" height="8" fill="#e8534a" rx="2"/>
      <text x="12" y="28" font-family="Inter,sans-serif" font-size="7" fill="#5a6a85">Before</text>
      <rect x="52" y="20" width="8" height="8" fill="#1a9080" rx="2"/>
      <text x="64" y="28" font-family="Inter,sans-serif" font-size="7" fill="#5a6a85">After ValuConnect</text>
      <!-- Axis -->
      <line x1="${BAR_START}" y1="34" x2="${BAR_START}" y2="${chartBottom - 4}"
            stroke="#dde1ea" stroke-width="1"/>
      ${rowsSVG}
      <!-- Callout -->
      <rect x="${BAR_START}" y="${chartBottom}" width="${BAR_MAX}" height="20"
            fill="#e0f5f1" rx="4"/>
      <text x="${BAR_START + BAR_MAX / 2}" y="${chartBottom + 13}"
            font-family="Inter,sans-serif" font-size="8" font-weight="800"
            fill="#1a9080" text-anchor="middle">${data.savingsLabel}</text>
    </svg>`;

  // Donut chart SVG — static stroke-dasharray, no JS
  const d = data.donut;
  const R   = 58;
  const CX  = 90, CY = 95;
  const circ = Math.round(2 * Math.PI * R);        // ≈ 364
  const arc  = Math.round((d.pct / 100) * circ);   // filled portion
  const donutLines = d.label.split('\n');

  const donutSVG = `
    <svg viewBox="0 0 180 175" xmlns="http://www.w3.org/2000/svg"
         style="width:100%;max-width:180px;display:block;margin:0 auto;">
      <text x="90" y="14" font-family="Inter,sans-serif" font-size="8"
            font-weight="700" fill="#0d1f44" text-anchor="middle">Admin Time Reduced</text>
      <!-- Track -->
      <circle cx="${CX}" cy="${CY}" r="${R}"
              fill="none" stroke="#dde1ea" stroke-width="14"/>
      <!-- Arc -->
      <circle cx="${CX}" cy="${CY}" r="${R}"
              fill="none" stroke="#1a9080" stroke-width="14"
              stroke-dasharray="${arc} ${circ}"
              stroke-linecap="round"
              transform="rotate(-90 ${CX} ${CY})"/>
      <!-- Center metric -->
      <text x="${CX}" y="${CY - 6}" font-family="Inter,sans-serif" font-size="24"
            font-weight="900" fill="#0d1f44" text-anchor="middle">${d.pct}%</text>
      ${donutLines.map((line, i) => `
      <text x="${CX}" y="${CY + 10 + i * 12}" font-family="Inter,sans-serif" font-size="7"
            fill="#5a6a85" text-anchor="middle">${line}</text>`).join('')}
      <!-- Before/after note -->
      <text x="${CX}" y="158" font-family="Inter,sans-serif" font-size="7"
            fill="#5a6a85" text-anchor="middle">${d.before} → ${d.after}</text>
    </svg>`;

  return `
    <div class="slide">
      <div class="slide-body" style="padding-bottom: 10mm;">
        ${slideHeader('By the Numbers — <span>Before vs. After ValuConnect</span>')}
        <div class="chart-layout">
          <div class="chart-block">
            ${barChartSVG}
          </div>
          <div class="chart-block">
            ${donutSVG}
            <div class="chart-highlight">${d.pct}% less time on admin</div>
            <div class="chart-caption">Time reclaimed every week — back to<br>running your business, not paperwork.</div>
          </div>
        </div>
      </div>
      ${footer()}
    </div>`;
}

// ── Industry deck builder (7-slide format) ────────────────────────────────────
function buildIndustryDeck(ind) {
  const icon = icons[ind.id] || '🏢';
  const slides = [];

  // Slide 1 — Cover
  slides.push(`
    <div class="slide">
      <div class="slide-cover" style="position:relative;overflow:hidden;">
        <!-- Decorative SVG accent (replaces CSS clip-path for print reliability) -->
        <svg style="position:absolute;right:0;top:0;height:100%;width:55mm;pointer-events:none;"
             viewBox="0 0 110 210" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">
          <polygon points="40,0 110,0 110,210 0,210" fill="#1a9080" opacity="0.13"/>
          <!-- Dot grid -->
          ${Array.from({length:6}, (_,row) => Array.from({length:5}, (_,col) =>
            `<circle cx="${col*18+9}" cy="${row*30+15}" r="1.5" fill="#ffffff" opacity="0.25"/>`
          ).join('')).join('')}
        </svg>
        <div class="eyebrow">${icon} ${ind.name} · Industry Solution</div>
        <h1>Digital Systems<br>Built for <span>${ind.name.split(/\s+/)[0]}</span><br>Businesses.</h1>
        <p class="subtitle">
          Stop managing your business on paper and in your head.
          ValuConnect builds the digital workflow system that runs in the background —
          so you can focus on what you do best.
        </p>
        <div class="tag-row">
          <span class="tag">${ind.name}</span>
          <span class="tag">Bilingual EN/ES</span>
          <span class="tag">Paper → Digital</span>
          <span class="tag">Hands-On Partner</span>
        </div>
        <div class="cta-pill">Free 30-Minute Workflow Assessment</div>
      </div>
      ${footer()}
    </div>`);

  // Slide 2 — Who is ValuConnect?
  slides.push(buildCompanyIntroSlide());

  // Slide 3 — Before vs. After (with column tints)
  slides.push(`
    <div class="slide">
      <div class="slide-body" style="padding-bottom: 10mm;">
        ${slideHeader('Before vs. After — <span>What Changes</span>')}
        <div class="compare-grid">
          <div class="compare-col-before-wrap">
            <div class="compare-col-header col-before">✕ Before ValuConnect</div>
            <ul class="compare-list">
              ${ind.pain_points.map(p => `
                <li>
                  <span class="bullet bullet-x">✕</span>
                  <span>${p}</span>
                </li>`).join('')}
            </ul>
          </div>
          <div class="compare-col-after-wrap">
            <div class="compare-col-header col-after">✓ After ValuConnect</div>
            <ul class="compare-list">
              ${ind.solutions.map(s => `
                <li>
                  <span class="bullet bullet-check">✓</span>
                  <span>${s}</span>
                </li>`).join('')}
            </ul>
          </div>
        </div>
      </div>
      ${footer()}
    </div>`);

  // Slide 4 — Industry challenges with real-world consequences
  slides.push(buildChallengesSlide(ind));

  // Slide 5 — SVG charts: By the Numbers
  slides.push(buildChartSlide(ind));

  // Slide 6 — Results metrics
  slides.push(`
    <div class="slide">
      <div class="slide-body" style="padding-bottom: 10mm;">
        ${slideHeader('Results You Can <span>Expect</span>')}
        <div class="result-grid" style="margin-bottom: 5mm;">
          ${ind.results.map(r => {
            const match = r.match(/^([\d%x+<]+\s*\w*)/i);
            const metric = match ? match[0] : '✓';
            const label  = match ? r.replace(match[0], '').trim().replace(/^[-–—]/, '').trim() : r;
            return `
            <div class="result-chip">
              <div class="metric">${metric}</div>
              <div class="metric-label">${label}</div>
            </div>`;
          }).join('')}
        </div>
        <div style="background: var(--gray-bg); border-radius: 6px; padding: 5mm; border-left: 3px solid var(--gold); display: flex; gap: 6mm; align-items: center;">
          <div style="flex: 1;">
            <div style="font-size: 7.5pt; font-weight: 700; letter-spacing: 1.5px; text-transform: uppercase; color: var(--teal); margin-bottom: 2mm;">How We Do It</div>
            <div style="font-size: 8pt; color: var(--gray-text); line-height: 1.6;">Free 30-min assessment → custom roadmap → implementation → team training → ongoing support. Bilingual (EN/ES), always personalized.</div>
          </div>
          <div style="text-align:center; flex-shrink:0;">
            <div style="font-size: 20pt; font-weight: 900; color: var(--gold); line-height:1;">3</div>
            <div style="font-size: 7pt; font-weight: 700; color: var(--navy);">Simple Steps</div>
          </div>
        </div>
      </div>
      ${footer()}
    </div>`);

  // Slide 7 — Client quote + CTA
  slides.push(`
    <div class="slide">
      <div class="quote-slide" style="position:relative;overflow:hidden;">
        <!-- Decorative arc in top-right -->
        <svg style="position:absolute;top:0;right:0;width:40mm;height:40mm;pointer-events:none;"
             viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
          <circle cx="100" cy="0" r="70" fill="none" stroke="#d4920a" stroke-width="2" opacity="0.2"/>
          <circle cx="100" cy="0" r="50" fill="none" stroke="#d4920a" stroke-width="1.5" opacity="0.15"/>
        </svg>
        <div class="quote-mark">"</div>
        <div class="quote-text">${ind.quote}</div>
        <div class="quote-attr">${ind.quote_attr}</div>
        <div class="quote-cta-box">
          <div class="cta-heading">Ready to run your ${ind.name.split(/\s+/)[0].toLowerCase()} business on systems — not stress?</div>
          <div class="cta-sub">Book a free 30-minute workflow assessment with Andres</div>
          <div style="margin-top: 4mm; font-size: 9pt; font-weight: 800; color: var(--navy);">valuconnect.com${ind.website_slug}</div>
        </div>
        <div style="margin-top: 7mm; display: flex; gap: 8mm; justify-content: center; align-items: center;">
          <div style="text-align: center;">
            <div style="font-size: 7.5pt; font-weight: 700; color: rgba(255,255,255,.5); text-transform: uppercase; letter-spacing: 1px; margin-bottom: 1mm;">Founder</div>
            <div style="font-size: 9pt; font-weight: 700; color: #fff;">Andres Ramirez</div>
          </div>
          <div style="width: 1px; height: 20px; background: rgba(255,255,255,.2);"></div>
          <div style="text-align: center;">
            <div style="font-size: 7.5pt; font-weight: 700; color: rgba(255,255,255,.5); text-transform: uppercase; letter-spacing: 1px; margin-bottom: 1mm;">Bilingual</div>
            <div style="font-size: 9pt; font-weight: 700; color: #fff;">English · Español</div>
          </div>
          <div style="width: 1px; height: 20px; background: rgba(255,255,255,.2);"></div>
          <div style="text-align: center;">
            <div style="font-size: 7.5pt; font-weight: 700; color: rgba(255,255,255,.5); text-transform: uppercase; letter-spacing: 1px; margin-bottom: 1mm;">Industry</div>
            <div style="font-size: 9pt; font-weight: 700; color: #fff;">${ind.name}</div>
          </div>
        </div>
        <div style="margin-top: 5mm; font-size: 8pt; font-style: italic; color: var(--gold); opacity: .8;">
          Hablamos tu idioma — We speak your language.
        </div>
      </div>
      ${footer()}
    </div>`);

  return wrapHtml(`ValuConnect — ${ind.name} Solutions`, slides.join('\n'));
}

// ── HTML wrapper ──────────────────────────────────────────────────────────────
function wrapHtml(title, body) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>${sharedCSS}</style>
</head>
<body>
${body}
</body>
</html>`;
}

// ── Generate files ────────────────────────────────────────────────────────────
// PILOT MODE: generating Restaurants only to validate the new 7-slide format.
// Once approved, remove the filter below to generate all 8 industry decks.

const PILOT_SLUG = 'restaurants'; // set to null to generate all industries

const overviewHtml = buildOverview();
fs.writeFileSync(path.join(OUT, 'overview.html'), overviewHtml);
console.log('✓  overview.html');

const pilotIndustries = PILOT_SLUG
  ? industries.filter(ind => ind.slug === PILOT_SLUG)
  : industries;

for (const ind of pilotIndustries) {
  const html = buildIndustryDeck(ind);
  const filename = `${ind.slug}.html`;
  fs.writeFileSync(path.join(OUT, filename), html);
  console.log(`✓  ${filename}  (${ind.results.length} results, ${(chartData[ind.id] ? 'custom' : 'fallback')} chart data)`);
}

if (PILOT_SLUG) {
  console.log('\n📋 PILOT MODE — Restaurants only.');
  console.log('   Review restaurants.html, then set PILOT_SLUG = null to generate all 8 decks.');
} else {
  console.log(`\n🎉 Generated ${industries.length + 1} presentations in presentations/output/`);
}

console.log('\nTo convert to PDF:');
console.log('  Open HTML in Chrome/Edge → File → Print → Save as PDF');
console.log('  Settings: A4 landscape · Background graphics ON · Margins = None');
