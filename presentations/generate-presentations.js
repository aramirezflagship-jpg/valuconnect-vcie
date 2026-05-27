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

// ── Industry deck builder ─────────────────────────────────────────────────────
function buildIndustryDeck(ind) {
  const icon = icons[ind.id] || '🏢';
  const slides = [];

  // Slide 1 — Cover
  slides.push(`
    <div class="slide">
      <div class="slide-cover">
        <div class="cover-accent"></div>
        <div class="cover-dot-grid"></div>
        <div class="eyebrow">${icon} ${ind.name} · Industry Solution</div>
        <h1>Digital Systems<br>Built for <span>${ind.name.split(' ')[0]}</span><br>Businesses.</h1>
        <p class="subtitle">
          Stop managing your business on paper and in your head.
          ValuConnect builds the digital workflow system that runs in the background,
          so you can focus on what you do best.
        </p>
        <div class="tag-row">
          <span class="tag">${ind.name}</span>
          <span class="tag">Bilingual EN/ES</span>
          <span class="tag">Paper → Digital</span>
        </div>
        <div class="cta-pill">Free 30-Minute Workflow Assessment</div>
      </div>
      ${footer()}
    </div>`);

  // Slide 2 — Pain points vs Solutions (compare)
  slides.push(`
    <div class="slide">
      <div class="slide-body" style="padding-bottom: 10mm;">
        ${slideHeader('Before vs. After — <span>What Changes</span>')}
        <div class="compare-grid">
          <div>
            <div class="compare-col-header col-before">✕ Before ValuConnect</div>
            <ul class="compare-list">
              ${ind.pain_points.map(p => `
                <li>
                  <span class="bullet bullet-x">✕</span>
                  <span>${p}</span>
                </li>`).join('')}
            </ul>
          </div>
          <div>
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

  // Slide 3 — Results
  slides.push(`
    <div class="slide">
      <div class="slide-body" style="padding-bottom: 10mm;">
        ${slideHeader('Results You Can <span>Expect</span>')}
        <div class="result-grid">
          ${ind.results.map(r => {
            const match = r.match(/^([\d%x+]+\s*\w*)/i);
            const metric = match ? match[0] : '✓';
            const label  = match ? r.replace(match[0], '').trim().replace(/^[-–—]/, '').trim() : r;
            return `
            <div class="result-chip">
              <div class="metric">${metric}</div>
              <div class="metric-label">${label}</div>
            </div>`;
          }).join('')}
        </div>
        <div style="margin-top: 6mm; display: grid; grid-template-columns: 1fr 1fr; gap: 5mm;">
          <div style="background: var(--gray-bg); border-radius: 5px; padding: 5mm;">
            <div style="font-size: 7.5pt; font-weight: 700; letter-spacing: 1.5px; text-transform: uppercase; color: var(--teal); margin-bottom: 3mm;">What You Get</div>
            ${ind.solutions.slice(0, 2).map(s => `<div style="font-size: 8pt; color: var(--navy); line-height: 1.5; margin-bottom: 2mm; display: flex; gap: 4px;"><span style="color: var(--teal); font-weight: 900; flex-shrink: 0;">›</span> ${s}</div>`).join('')}
          </div>
          <div style="background: var(--gray-bg); border-radius: 5px; padding: 5mm;">
            <div style="font-size: 7.5pt; font-weight: 700; letter-spacing: 1.5px; text-transform: uppercase; color: var(--teal); margin-bottom: 3mm;">How We Do It</div>
            <div style="font-size: 8pt; color: var(--gray-text); line-height: 1.6;">Free 30-min assessment → custom roadmap → implementation → team training → ongoing support. Bilingual (EN/ES), personalized to your business.</div>
          </div>
        </div>
      </div>
      ${footer()}
    </div>`);

  // Slide 4 — Quote + CTA
  slides.push(`
    <div class="slide">
      <div class="quote-slide">
        <div class="quote-mark">"</div>
        <div class="quote-text">${ind.quote}</div>
        <div class="quote-attr">${ind.quote_attr}</div>
        <div class="quote-cta-box">
          <div class="cta-heading">Ready to run your ${ind.name.split(' ')[0].toLowerCase()} business on systems — not stress?</div>
          <div class="cta-sub">Book a free 30-minute workflow assessment with Andres</div>
          <div style="margin-top: 4mm; font-size: 9pt; font-weight: 800; color: var(--navy);">valuconnect.com${ind.website_slug}</div>
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
            <div style="font-size: 7.5pt; font-weight: 700; color: rgba(255,255,255,.5); text-transform: uppercase; letter-spacing: 1px; margin-bottom: 1mm;">Industry</div>
            <div style="font-size: 9pt; font-weight: 700; color: #fff;">${ind.name}</div>
          </div>
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

// ── Generate all files ────────────────────────────────────────────────────────
const overviewHtml = buildOverview();
fs.writeFileSync(path.join(OUT, 'overview.html'), overviewHtml);
console.log('✓  overview.html');

for (const ind of industries) {
  const html = buildIndustryDeck(ind);
  const filename = `${ind.slug}.html`;
  fs.writeFileSync(path.join(OUT, filename), html);
  console.log(`✓  ${filename}`);
}

console.log(`\n🎉 Generated ${industries.length + 1} presentations in presentations/output/`);
console.log('\nTo convert to PDF:');
console.log('  Open each HTML file in Chrome/Edge → File → Print → Save as PDF');
console.log('  Settings: A4 landscape, margins = Minimum/None, Background graphics = ON');
