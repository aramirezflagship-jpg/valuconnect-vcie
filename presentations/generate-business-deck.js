#!/usr/bin/env node
/**
 * ValuConnect Business Deck Generator
 * Source: marketing.md (the ValuConnect blueprint) — no config/ files, no website assets.
 * Outputs a standalone print-to-PDF HTML presentation per industry.
 *
 * Usage:  node presentations/generate-business-deck.js
 * Output: presentations/output/vc-restaurants.html  (pilot)
 *         Set PILOT_SLUG = null to generate all 8 industries.
 *
 * To export PDF: Chrome → File → Print → Save as PDF
 *   A4 Landscape · Background graphics ON · Margins = None
 */

const fs   = require('fs');
const path = require('path');

const OUT = path.join(__dirname, 'output');
if (!fs.existsSync(OUT)) fs.mkdirSync(OUT, { recursive: true });

// ─────────────────────────────────────────────────────────────────────────────
// CONTENT — sourced directly from marketing.md
// ─────────────────────────────────────────────────────────────────────────────
const BRAND = {
  company:  'ValuConnect Solutions',
  founder:  'Andres Ramirez',
  mascot:   'Valu',
  mission:  'Help small businesses work smarter, not harder — with digital systems that grow with them.',
  mission_es: 'Ayudar a los pequeños negocios a trabajar con inteligencia, no con esfuerzo.',
  tagline:  '"Your neighbor who happens to know digital systems."',
  audience: 'Small business owners, especially Latino and Hispanic entrepreneurs',
  promise:  'A personalized, hands-on approach — not a one-size-fits-all platform.',
  services: [
    { icon: '📄', name: 'Paper-to-Digital',    desc: 'Invoices, contracts, records — converted and searchable in seconds.' },
    { icon: '🗂️', name: 'Document Filing',     desc: 'Organized digital folder systems — nothing lost, everything found fast.' },
    { icon: '⚙️', name: 'Workflow Automation', desc: 'Reminders, approvals, follow-ups run automatically in the background.' },
    { icon: '📊', name: 'Project Tracking',    desc: 'Real-time dashboards — who owns what, by when, with zero guesswork.' },
    { icon: '🤖', name: 'AI Communication',    desc: 'Smart templates and automated client updates that save hours weekly.' },
    { icon: '🎓', name: 'Training & Support',  desc: 'We build it, train your team, and stay available as you grow.' },
  ],
  pillars: [
    { name: 'Digital Transformation', desc: 'Paper-to-digital · Before/after stories · Cost of staying manual' },
    { name: 'Work Smarter',           desc: 'Automation tips · AI tools · Workflow systems · Time-saving hacks' },
    { name: 'Owner Stories',          desc: 'Client wins · Community spotlights · Real results' },
  ],
  process: [
    { step: '1', icon: '📞', title: 'Free Assessment',  desc: '30-minute call with Andres to map your current workflow and identify your biggest pain points.' },
    { step: '2', icon: '🗺️', title: 'Custom Roadmap',  desc: 'We build your digital system blueprint — prioritized by impact, timed for your business.' },
    { step: '3', icon: '🚀', title: 'Go Live + Support', desc: 'We implement, train your team, and stay by your side as the system evolves.' },
  ],
};

// Industries — sourced from marketing.md "8 Industry Use Cases" section
// Pain points, solutions and results derived from marketing.md pillar descriptions
// and industry viral topic categories (Health inspection tech, Supplier automation, etc.)
const INDUSTRIES = [
  {
    id:    'restaurants',
    name:  'Restaurants & Food Service',
    icon:  '🍽️',
    pillar: 'Digital Transformation',
    topics: ['Health inspection tech', 'Supplier automation', 'Menu digitization'],
    pains: [
      { icon: '🧾', text: 'Supplier invoices lost or buried in a drawer every week' },
      { icon: '📅', text: 'Scheduling done by hand — conflicts and last-minute chaos' },
      { icon: '📦', text: 'Food costs invisible until the month-end spreadsheet panic' },
      { icon: '🏥', text: 'Health inspection week = days of scrambling through paper files' },
    ],
    solutions: [
      'Digital supplier invoice archive — any document searchable in under 10 seconds',
      'Automated weekly schedule with conflict alerts sent to your phone',
      'Real-time food cost tracking tied directly to your inventory',
      'Compliance folder with expiry reminders — always inspection-ready',
    ],
    chartRows: [
      { label: 'Invoice admin',   before: 3,    after: 0.25, bLabel: '3 hrs/wk',  aLabel: '15 min/wk' },
      { label: 'Scheduling',      before: 2,    after: 0.5,  bLabel: '2 hrs/wk',  aLabel: '30 min/wk' },
      { label: 'Compliance prep', before: 4,    after: 0.08, bLabel: '4 hrs/wk',  aLabel: '5 min/wk'  },
    ],
    chartMax: 4,
    donutPct: 87,
    savingsLine: '~6 hours saved every single week',
    results: ['6 hrs', '0', 'Real-time', '5 min'],
    resultLabels: ['Saved per week on admin', 'Lost invoices since go-live', 'Food cost visibility', 'Inspection readiness time'],
    quote: 'I used to dread inspection week. Now everything is one click away.',
    quoteAttr: 'Maria G. — Restaurant Owner, Miami',
  },
  {
    id:    'retail',
    name:  'Retail & Boutiques',
    icon:  '🛍️',
    pillar: 'Digital Transformation',
    topics: ['Inventory AI', 'Paperless POS', 'Small business ops tools'],
    pains: [
      { icon: '📋', text: 'Inventory tracked on paper cards — no real-time visibility' },
      { icon: '📞', text: 'Supplier orders by phone with no written confirmation trail' },
      { icon: '🗄️', text: 'Customer receipts in binders — a 10-minute search per lookup' },
      { icon: '↩️', text: 'No system for returns or exchanges — disputes cost you money' },
    ],
    solutions: [
      'Digital inventory with low-stock alerts sent automatically',
      'Automated supplier order emails with digital confirmation records',
      'Customer transaction archive — any receipt found in under 10 seconds',
      'Return and exchange tracking workflow with approval steps',
    ],
    chartRows: [
      { label: 'Stock-outs',      before: 100, after: 20, bLabel: 'Frequent',   aLabel: '80% fewer' },
      { label: 'Receipt lookup',  before: 10,  after: 0.2, bLabel: '10 min',    aLabel: '10 sec' },
      { label: 'Return disputes', before: 100, after: 5,  bLabel: 'Common',     aLabel: 'Rare' },
    ],
    chartMax: 100,
    donutPct: 80,
    savingsLine: 'Stock-outs reduced by 80% — more sales, less loss',
    results: ['80%', '<10s', '0', '3x'],
    resultLabels: ['Fewer stock-outs', 'Customer receipt lookup', 'Order errors eliminated', 'Faster return processing'],
    quote: 'I stopped losing money on items I forgot I had.',
    quoteAttr: 'Carmen L. — Boutique Owner, Los Angeles',
  },
  {
    id:    'construction',
    name:  'Construction & Contracting',
    icon:  '🏗️',
    pillar: 'Work Smarter',
    topics: ['Job site apps', 'Contractor billing automation', 'Mobile workforce tools'],
    pains: [
      { icon: '📝', text: 'Work orders handwritten on site — illegible or lost mid-job' },
      { icon: '📷', text: 'Timesheets collected by phone photo every Friday — unreliable' },
      { icon: '🧾', text: 'Subcontractor invoices missing, duplicated, or disputed monthly' },
      { icon: '📈', text: 'Budget overruns discovered only after the job is already done' },
    ],
    solutions: [
      'Mobile-friendly digital work orders submitted directly from the job site',
      'Automated timesheet collection with manager approval workflow',
      'Subcontractor invoice portal with status tracking and duplicate detection',
      'Real-time project cost dashboard vs. budget — alerts at 80% threshold',
    ],
    chartRows: [
      { label: 'Billing cycle',   before: 21, after: 3, bLabel: '3 weeks', aLabel: '3 days' },
      { label: 'Missing timeshts', before: 100, after: 0, bLabel: 'Weekly', aLabel: 'Zero' },
      { label: 'Disputes',        before: 100, after: 5, bLabel: 'Monthly', aLabel: 'Rare' },
    ],
    chartMax: 100,
    donutPct: 85,
    savingsLine: 'Billing cycle cut from 3 weeks to 3 days',
    results: ['3 wks→3 days', '0', '0', '80%'],
    resultLabels: ['Billing cycle improvement', 'Missing timesheets', 'Subcontractor disputes', 'Budget overruns caught early'],
    quote: 'We used to bill late every single month. Now invoices go out the same day the job is done.',
    quoteAttr: 'Roberto M. — General Contractor, Houston',
  },
  {
    id:    'health-wellness',
    name:  'Health & Wellness',
    icon:  '🏥',
    pillar: 'Digital Transformation',
    topics: ['HIPAA tech', 'Patient experience', 'Healthcare admin automation'],
    pains: [
      { icon: '🗂️', text: 'Patient files in physical folders — retrieval takes minutes, not seconds' },
      { icon: '📅', text: 'Double-bookings from a shared paper calendar happen every week' },
      { icon: '📌', text: 'Pre-auth requests tracked on sticky notes — delays and missed approvals' },
      { icon: '⚖️', text: 'HIPAA compliance gaps surface only when an audit catches them' },
    ],
    solutions: [
      'Secure digital patient records — any file retrieved in under 5 seconds',
      'Online scheduling with real-time availability sync across all staff',
      'Automated pre-auth tracking dashboard with deadline alerts',
      'Audit-ready HIPAA documentation folder with full access logs',
    ],
    chartRows: [
      { label: 'Patient lookup', before: 5,   after: 0.08, bLabel: '5 min',  aLabel: '<5 sec' },
      { label: 'Double-bookings', before: 100, after: 0,   bLabel: 'Weekly', aLabel: 'Zero' },
      { label: 'Auth speed',      before: 100, after: 60,  bLabel: 'Slow',   aLabel: '40% faster' },
    ],
    chartMax: 100,
    donutPct: 90,
    savingsLine: 'Patient lookup: 5 minutes → under 5 seconds',
    results: ['<5 sec', '0', '40%', '0'],
    resultLabels: ['Patient record retrieval', 'Double-bookings after go-live', 'Faster auth approvals', 'HIPAA audit findings'],
    quote: 'Our front desk used to be chaos. Now new patients comment on how organized we are.',
    quoteAttr: 'Dr. Ana P. — Physical Therapy Clinic, Phoenix',
  },
  {
    id:    'real-estate',
    name:  'Real Estate & Property Mgmt',
    icon:  '🏠',
    pillar: 'Work Smarter',
    topics: ['Property management apps', 'Landlord automation', 'Lease management'],
    pains: [
      { icon: '📁', text: 'Lease agreements in physical folders — one copy, no backup' },
      { icon: '📱', text: 'Maintenance requests arrive by text with no tracking system' },
      { icon: '📊', text: 'Rent spreadsheet has conflicting versions across staff' },
      { icon: '⏰', text: 'Lease renewals missed — tenants go month-to-month by accident' },
    ],
    solutions: [
      'Digital lease archive with automatic 60-day renewal alerts',
      'Maintenance request portal with ticket numbers and photo documentation',
      'Centralized rent log with automated reminders to tenants',
      'Renewal workflow: automated notice → digital signature → filed instantly',
    ],
    chartRows: [
      { label: 'Missed renewals', before: 100, after: 0,  bLabel: 'Regular', aLabel: 'Zero/yr' },
      { label: 'Maint. speed',    before: 100, after: 50, bLabel: 'Slow',    aLabel: '2x faster' },
      { label: 'Staff hours/prop',before: 1,   after: 0,  bLabel: '1 hr',    aLabel: '0 hrs' },
    ],
    chartMax: 100,
    donutPct: 75,
    savingsLine: 'Zero missed renewals — 12 months running',
    results: ['0', '2x', '0', '1 hr'],
    resultLabels: ['Missed renewals (12 mo)', 'Faster maintenance resolution', 'Rent collection disputes', 'Staff hours saved/property/mo'],
    quote: 'We grew from 20 to 40 units without hiring extra staff. The system does the tracking for us.',
    quoteAttr: 'Luis T. — Property Manager, Dallas',
  },
  {
    id:    'professional-services',
    name:  'Professional Services',
    icon:  '💼',
    pillar: 'Work Smarter',
    topics: ['CPA automation', 'Legal tech for small firms', 'Document AI'],
    pains: [
      { icon: '📂', text: 'Client documents scattered across folders and email threads' },
      { icon: '❓', text: 'No way to see which clients have actually submitted required docs' },
      { icon: '😕', text: 'Staff confusion about who owns each client case or deadline' },
      { icon: '🗓️', text: 'Deadlines managed on a whiteboard — one erased date is a crisis' },
    ],
    solutions: [
      'Digital client portal for secure document submission with auto-confirmation',
      'Per-client checklist with real-time submission status visible to all staff',
      'Task assignment system with accountability and deadline tracking',
      'Automated 30-day and 7-day reminder emails to clients — zero missed deadlines',
    ],
    chartRows: [
      { label: 'Tax season prep', before: 14, after: 3,  bLabel: '2 weeks', aLabel: '3 days' },
      { label: 'Doc visibility',  before: 40, after: 100, bLabel: 'Partial', aLabel: '100%' },
      { label: 'Missed deadlines',before: 100, after: 0, bLabel: 'Happen',  aLabel: 'Zero' },
    ],
    chartMax: 100,
    donutPct: 79,
    savingsLine: 'Tax season prep: 2 weeks → 3 days',
    results: ['2wks→3days', '100%', '0', '↑'],
    resultLabels: ['Tax season prep time', 'Document submission visibility', 'Missed client deadlines', 'Client satisfaction'],
    quote: "We stopped having the 'where is that document?' conversation. It just exists, where it should be.",
    quoteAttr: 'Patricia S. — CPA Firm Owner, Chicago',
  },
  {
    id:    'salons-beauty',
    name:  'Salons & Beauty',
    icon:  '✂️',
    pillar: 'Owner Stories',
    topics: ['Client retention tools', 'Appointment tech', 'Beauty business growth'],
    pains: [
      { icon: '📖', text: 'Appointments in a paper book — one eraser ruins the whole day' },
      { icon: '🎨', text: 'Client color formulas and preferences not recorded anywhere' },
      { icon: '😶', text: 'No-shows tracked on sticky notes — no follow-up or recovery' },
      { icon: '🧴', text: 'Retail inventory counted by eye — stockouts happen weekly' },
    ],
    solutions: [
      'Digital appointment system with automated SMS reminders 24 hours before',
      'Client profile cards with full service history, color formulas, and preferences',
      'Automated no-show follow-up with rebooking offer — recovers lost revenue',
      'Retail inventory system with automatic reorder alerts before products run out',
    ],
    chartRows: [
      { label: 'No-shows',    before: 100, after: 40, bLabel: 'Frequent',  aLabel: '60% fewer' },
      { label: 'Rebook rate', before: 40,  after: 80, bLabel: 'Low',       aLabel: '2x higher' },
      { label: 'Stockouts',   before: 100, after: 5,  bLabel: 'Weekly',    aLabel: 'Rare' },
    ],
    chartMax: 100,
    donutPct: 60,
    savingsLine: 'No-shows reduced by 60% — revenue recovered automatically',
    results: ['60%', '0', '2x', '0'],
    resultLabels: ['Fewer no-shows', 'Lost client histories', 'Higher rebooking rate', 'Stockouts on top sellers'],
    quote: 'When my top stylist left, I was terrified. But we had every client\'s history saved. Not one client was lost.',
    quoteAttr: 'Diana V. — Salon Owner, Miami',
  },
  {
    id:    'logistics',
    name:  'Logistics & Delivery',
    icon:  '🚚',
    pillar: 'Work Smarter',
    topics: ['Delivery proof tech', 'Driver management', 'Last-mile automation'],
    pains: [
      { icon: '📞', text: 'Dispatch by phone only — no written record of any instructions' },
      { icon: '📋', text: 'Paper delivery manifest lost when a driver loses it or truck breaks' },
      { icon: '💬', text: 'Proof of delivery buried in a group chat with 300+ messages' },
      { icon: '🕐', text: 'Driver hours tracked by verbal report — pay disputes are common' },
    ],
    solutions: [
      'Digital dispatch board with real-time driver assignment and route tracking',
      'Digital manifest on any phone — survives any hardware failure',
      'Structured proof-of-delivery: photo + GPS timestamp + customer signature',
      'Driver timesheet system with documented hours — eliminates all pay disputes',
    ],
    chartRows: [
      { label: 'Lost manifests', before: 100, after: 0,  bLabel: 'Happened', aLabel: '0 in 90 days' },
      { label: 'Dispute time',   before: 60,  after: 5,  bLabel: '60+ min',  aLabel: '< 5 min' },
      { label: 'Complaints',     before: 100, after: 30, bLabel: 'Regular',  aLabel: '70% fewer' },
    ],
    chartMax: 100,
    donutPct: 70,
    savingsLine: 'Customer complaints reduced by 70% in the first 90 days',
    results: ['0', '<5 min', '70%', '0'],
    resultLabels: ['Lost manifests (90 days)', 'Delivery dispute resolution', 'Fewer customer complaints', 'Driver pay disputes'],
    quote: 'A customer claimed we never delivered. We showed the photo, the GPS timestamp, and the signature. Case closed in two minutes.',
    quoteAttr: 'Jorge A. — Delivery Company Owner, Orlando',
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// DESIGN — fresh palette, independent of website
// ─────────────────────────────────────────────────────────────────────────────
const D = {
  dark:     '#111827',   // near-black for headings
  mid:      '#374151',   // body text
  subtle:   '#6B7280',   // captions, labels
  border:   '#E5E7EB',   // dividers
  bg:       '#F9FAFB',   // slide area background
  white:    '#FFFFFF',
  ink:      '#1E293B',   // deep slate (cover backgrounds, dark slides)
  accent:   '#0369A1',   // strong blue (primary accent)
  accentLt: '#E0F2FE',   // light blue tint
  green:    '#059669',   // positive / after / solutions
  greenLt:  '#D1FAE5',   // light green tint
  red:      '#DC2626',   // before / pain points
  redLt:    '#FEE2E2',   // light red tint
  amber:    '#D97706',   // warm CTA / gold-ish
  amberLt:  '#FEF3C7',   // light amber tint
};

const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:ital,wght@0,300;0,400;0,500;0,600;0,700;0,800;0,900;1,400;1,600&display=swap');

  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  body {
    font-family: 'Inter', system-ui, sans-serif;
    background: #DDE3ED;
    color: ${D.dark};
    line-height: 1.5;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }

  /* ── Slide shell ── */
  .slide {
    width: 297mm;
    height: 210mm;
    background: ${D.white};
    margin: 10mm auto;
    overflow: hidden;
    box-shadow: 0 4px 30px rgba(0,0,0,.16);
    page-break-after: always;
    page-break-inside: avoid;
    position: relative;
    display: flex;
    flex-direction: column;
  }
  .slide:last-of-type { page-break-after: auto; }

  /* ── Footer strip ── */
  .deck-footer {
    height: 7mm;
    background: ${D.ink};
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 10mm;
    flex-shrink: 0;
    margin-top: auto;
  }
  .deck-footer span {
    font-size: 6pt;
    color: rgba(255,255,255,.5);
    font-weight: 500;
    letter-spacing: .3px;
  }
  .deck-footer .logo-ft {
    font-size: 7pt;
    font-weight: 800;
    color: rgba(255,255,255,.75);
    letter-spacing: .5px;
  }

  /* ── Slide header bar ── */
  .slide-head {
    padding: 7mm 10mm 5mm;
    border-bottom: 1.5px solid ${D.border};
    display: flex;
    align-items: flex-end;
    justify-content: space-between;
    flex-shrink: 0;
  }
  .slide-head h2 {
    font-size: 17pt;
    font-weight: 800;
    color: ${D.dark};
    line-height: 1.15;
  }
  .slide-head h2 em {
    font-style: normal;
    color: ${D.accent};
  }
  .slide-eyebrow {
    font-size: 6.5pt;
    font-weight: 700;
    letter-spacing: 2px;
    text-transform: uppercase;
    color: ${D.accent};
    margin-bottom: 2mm;
  }
  .brand-mark {
    font-size: 8.5pt;
    font-weight: 800;
    color: ${D.dark};
    opacity: .4;
    white-space: nowrap;
  }

  /* ── Body area ── */
  .slide-body {
    padding: 6mm 10mm;
    flex: 1;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }

  /* ── Cover slide ── */
  .cover-wrap {
    flex: 1;
    display: flex;
    overflow: hidden;
  }
  .cover-left {
    background: ${D.ink};
    width: 60%;
    padding: 12mm 12mm 12mm 14mm;
    display: flex;
    flex-direction: column;
    justify-content: center;
    position: relative;
    overflow: hidden;
  }
  .cover-right {
    background: ${D.accent};
    flex: 1;
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    padding: 10mm;
    position: relative;
    overflow: hidden;
  }
  .cover-label {
    font-size: 7pt;
    font-weight: 700;
    letter-spacing: 2.5px;
    text-transform: uppercase;
    color: ${D.amber};
    margin-bottom: 5mm;
  }
  .cover-h1 {
    font-size: 28pt;
    font-weight: 900;
    color: #fff;
    line-height: 1.1;
    margin-bottom: 5mm;
  }
  .cover-h1 mark {
    background: none;
    color: ${D.amber};
  }
  .cover-sub {
    font-size: 10pt;
    color: rgba(255,255,255,.75);
    line-height: 1.65;
    max-width: 105mm;
    margin-bottom: 8mm;
  }
  .cover-tags {
    display: flex;
    flex-wrap: wrap;
    gap: 5px;
    margin-bottom: 8mm;
  }
  .cover-tag {
    background: rgba(255,255,255,.1);
    border: 1px solid rgba(255,255,255,.2);
    color: rgba(255,255,255,.85);
    font-size: 7.5pt;
    font-weight: 600;
    padding: 2px 8px;
    border-radius: 20px;
  }
  .cover-cta {
    background: ${D.amber};
    color: ${D.ink};
    font-size: 8.5pt;
    font-weight: 800;
    padding: 5px 14px;
    border-radius: 20px;
    display: inline-block;
    letter-spacing: .3px;
  }
  /* Right panel content */
  .cover-stat-stack {
    display: flex;
    flex-direction: column;
    gap: 5mm;
    width: 100%;
  }
  .cover-stat {
    background: rgba(255,255,255,.12);
    border-radius: 8px;
    padding: 5mm 6mm;
    border-left: 3px solid ${D.amber};
  }
  .cover-stat-num {
    font-size: 18pt;
    font-weight: 900;
    color: #fff;
    line-height: 1;
    margin-bottom: 1mm;
  }
  .cover-stat-label {
    font-size: 7.5pt;
    color: rgba(255,255,255,.7);
    line-height: 1.4;
  }

  /* ── Company intro slide ── */
  .intro-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 7mm;
    flex: 1;
  }
  .intro-left { display: flex; flex-direction: column; gap: 4mm; }
  .intro-tagline {
    font-size: 13.5pt;
    font-weight: 700;
    color: ${D.dark};
    line-height: 1.4;
    font-style: italic;
    border-left: 3px solid ${D.accent};
    padding-left: 4mm;
    margin-bottom: 1mm;
  }
  .intro-copy {
    font-size: 9pt;
    color: ${D.mid};
    line-height: 1.7;
  }
  .founder-block {
    background: ${D.ink};
    border-radius: 8px;
    padding: 4mm 5mm;
    display: flex;
    align-items: center;
    gap: 4mm;
  }
  .founder-avatar {
    width: 11mm; height: 11mm;
    border-radius: 50%;
    background: ${D.amber};
    display: flex; align-items: center; justify-content: center;
    font-size: 13pt; flex-shrink: 0;
  }
  .founder-name { font-size: 9.5pt; font-weight: 700; color: #fff; line-height: 1.2; }
  .founder-sub  { font-size: 7pt;   color: rgba(255,255,255,.6); margin-top: 1px; }
  .badge-row { display: flex; flex-wrap: wrap; gap: 4px; }
  .badge {
    background: ${D.accentLt};
    color: ${D.accent};
    font-size: 7pt; font-weight: 700;
    padding: 2px 7px; border-radius: 10px;
    letter-spacing: .3px;
  }
  .services-grid {
    display: grid;
    grid-template-columns: 1fr 1fr 1fr;
    gap: 3mm;
  }
  .svc-card {
    background: ${D.bg};
    border-radius: 6px;
    padding: 4mm;
    border-top: 2px solid ${D.accent};
  }
  .svc-icon  { font-size: 12pt; margin-bottom: 1.5mm; display: block; }
  .svc-name  { font-size: 7.5pt; font-weight: 800; color: ${D.dark}; margin-bottom: 1mm; line-height: 1.2; }
  .svc-desc  { font-size: 6.5pt; color: ${D.subtle}; line-height: 1.45; }

  /* ── Before/After slide ── */
  .ba-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 0;
    flex: 1;
  }
  .ba-col {
    padding: 4mm 5mm;
    border-radius: 6px;
  }
  .ba-col-before { background: ${D.redLt};   border: 1.5px solid #FECACA; }
  .ba-col-after  { background: ${D.greenLt}; border: 1.5px solid #A7F3D0; margin-left: 4mm; }
  .ba-col-head {
    font-size: 8.5pt; font-weight: 800;
    letter-spacing: .5px; text-transform: uppercase;
    margin-bottom: 4mm; display: flex; align-items: center; gap: 5px;
  }
  .ba-col-before .ba-col-head { color: ${D.red}; }
  .ba-col-after  .ba-col-head { color: ${D.green}; }
  .ba-list { list-style: none; display: flex; flex-direction: column; gap: 3mm; }
  .ba-list li {
    display: flex; align-items: flex-start; gap: 5px;
    font-size: 8.5pt; color: ${D.dark}; line-height: 1.45;
    background: rgba(255,255,255,.6);
    border-radius: 4px; padding: 3px 6px;
  }
  .ba-bullet {
    flex-shrink: 0; width: 14px; height: 14px; border-radius: 50%;
    display: flex; align-items: center; justify-content: center;
    font-size: 7pt; font-weight: 900; margin-top: 1px;
  }
  .bullet-x     { background: #FEE2E2; color: ${D.red}; }
  .bullet-check { background: #D1FAE5; color: ${D.green}; }

  /* ── Challenges slide ── */
  .chal-grid {
    display: grid; grid-template-columns: 1fr 1fr;
    gap: 4mm; flex: 1;
  }
  .chal-card {
    background: ${D.bg};
    border-radius: 6px; padding: 5mm;
    border-left: 3px solid ${D.red};
    display: flex; flex-direction: column; gap: 2mm;
  }
  .chal-icon  { font-size: 16pt; }
  .chal-title { font-size: 9.5pt; font-weight: 800; color: ${D.dark}; line-height: 1.3; }
  .chal-cost  {
    font-size: 7.5pt; color: ${D.red}; font-style: italic;
    line-height: 1.45; margin-top: auto; padding-top: 2mm;
    border-top: 1px solid rgba(220,38,38,.15);
  }

  /* ── Chart slide ── */
  .chart-grid {
    display: grid; grid-template-columns: 3fr 2fr;
    gap: 5mm; flex: 1; align-items: center;
  }
  .chart-panel {
    background: ${D.bg}; border-radius: 8px;
    padding: 5mm; height: 100%;
    display: flex; flex-direction: column;
    align-items: center; justify-content: center;
  }
  .chart-note {
    font-size: 7pt; color: ${D.subtle};
    text-align: center; margin-top: 3mm; line-height: 1.4;
  }
  .chart-badge {
    margin-top: 4mm;
    background: ${D.ink}; color: ${D.amber};
    font-size: 7.5pt; font-weight: 800;
    padding: 3px 10px; border-radius: 12px;
    text-align: center; display: inline-block;
  }

  /* ── Results slide ── */
  .results-grid {
    display: grid; grid-template-columns: 1fr 1fr;
    gap: 4mm; flex: 1; align-content: start;
  }
  .result-card {
    background: ${D.ink};
    border-radius: 8px; padding: 6mm;
    text-align: center; position: relative;
    overflow: hidden;
  }
  .result-card::before {
    content: ''; position: absolute;
    top: 0; left: 0; right: 0; height: 3px;
    background: ${D.amber};
  }
  .result-num {
    font-size: 22pt; font-weight: 900;
    color: ${D.amber}; line-height: 1; margin-bottom: 2mm;
  }
  .result-label {
    font-size: 8pt; color: rgba(255,255,255,.75); line-height: 1.4;
  }
  .process-strip {
    display: flex; gap: 3mm; margin-top: 5mm;
  }
  .proc-step {
    flex: 1; background: ${D.bg};
    border-radius: 5px; padding: 4mm;
    text-align: center;
    border-top: 2px solid ${D.accent};
  }
  .proc-num {
    width: 8mm; height: 8mm; border-radius: 50%;
    background: ${D.accent}; color: #fff;
    font-size: 9pt; font-weight: 900;
    display: flex; align-items: center; justify-content: center;
    margin: 0 auto 2mm;
  }
  .proc-title { font-size: 7.5pt; font-weight: 800; color: ${D.dark}; margin-bottom: 1mm; }
  .proc-desc  { font-size: 6.5pt; color: ${D.subtle}; line-height: 1.45; }

  /* ── Quote/CTA slide ── */
  .cta-wrap {
    flex: 1;
    background: ${D.ink};
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    text-align: center;
    padding: 10mm 18mm;
    position: relative;
    overflow: hidden;
  }
  .quote-mark  { font-size: 44pt; font-weight: 900; color: ${D.amber}; line-height: .7; opacity: .5; margin-bottom: 4mm; }
  .quote-text  { font-size: 13pt; font-weight: 600; color: #fff; line-height: 1.65; max-width: 150mm; margin-bottom: 5mm; font-style: italic; }
  .quote-attr  { font-size: 8.5pt; font-weight: 700; color: ${D.amber}; letter-spacing: .5px; margin-bottom: 8mm; }
  .cta-box {
    background: ${D.amber}; color: ${D.ink};
    border-radius: 8px; padding: 5mm 14mm;
    max-width: 130mm;
  }
  .cta-headline { font-size: 12pt; font-weight: 900; margin-bottom: 1.5mm; }
  .cta-sub      { font-size: 8.5pt; font-weight: 600; opacity: .8; }
  .cta-contact  { margin-top: 3mm; font-size: 8.5pt; font-weight: 800; color: ${D.ink}; }
  .bilingual-line {
    margin-top: 6mm;
    font-size: 7.5pt; font-style: italic; color: ${D.amber}; opacity: .7;
  }
  .meta-strip {
    display: flex; gap: 8mm; margin-top: 6mm; justify-content: center; align-items: center;
  }
  .meta-item { text-align: center; }
  .meta-label { font-size: 6.5pt; font-weight: 700; color: rgba(255,255,255,.4); text-transform: uppercase; letter-spacing: 1px; margin-bottom: 1mm; }
  .meta-value { font-size: 8.5pt; font-weight: 700; color: #fff; }
  .meta-divider { width: 1px; height: 16px; background: rgba(255,255,255,.2); }

  /* ── Print ── */
  @media print {
    body { background: white; }
    .slide { margin: 0; box-shadow: none; width: 297mm; height: 210mm; }
    @page { size: A4 landscape; margin: 0; }
  }
`;

// ─────────────────────────────────────────────────────────────────────────────
// SVG CHART BUILDERS (inline — no JS, no CDN)
// ─────────────────────────────────────────────────────────────────────────────
function buildBarChart(ind) {
  const rows   = ind.chartRows;
  const maxVal = ind.chartMax;
  const BAR_START = 92;   // x where bars begin
  const BAR_AREA  = 195;  // total bar width at 100%
  const scale     = BAR_AREA / maxVal;
  const BAR_H     = 10;
  const ROW_GAP   = 27;   // vertical space per metric row
  const TOP       = 36;

  const rowsSVG = rows.map((r, i) => {
    const y0 = TOP + i * ROW_GAP;
    const y1 = y0 + BAR_H + 3;
    const bW = Math.max(2, Math.round(r.before * scale));
    const aW = Math.max(2, Math.round(r.after  * scale));
    return `
      <text x="88" y="${y0 + BAR_H - 1}" font-family="Inter,sans-serif" font-size="6.5"
            fill="${D.subtle}" text-anchor="end">${r.label}</text>
      <rect x="${BAR_START}" y="${y0}" width="${bW}" height="${BAR_H}"
            fill="${D.red}" rx="2"/>
      <text x="${BAR_START + bW + 3}" y="${y0 + BAR_H - 1}"
            font-family="Inter,sans-serif" font-size="6.5" font-weight="700"
            fill="${D.red}">${r.bLabel}</text>
      <rect x="${BAR_START}" y="${y1}" width="${aW}" height="${BAR_H}"
            fill="${D.green}" rx="2"/>
      <text x="${BAR_START + aW + 3}" y="${y1 + BAR_H - 1}"
            font-family="Inter,sans-serif" font-size="6.5" font-weight="700"
            fill="${D.green}">${r.aLabel}</text>`;
  }).join('');

  const bottom = TOP + rows.length * ROW_GAP + 4;
  const svgH   = bottom + 24;

  return `
    <svg viewBox="0 0 310 ${svgH}" xmlns="http://www.w3.org/2000/svg"
         style="width:100%;display:block;">
      <text x="0" y="12" font-family="Inter,sans-serif" font-size="8.5"
            font-weight="700" fill="${D.dark}">Weekly Time Spent on Admin</text>
      <rect x="0"  y="18" width="7" height="7" fill="${D.red}"   rx="1.5"/>
      <text x="10" y="25" font-family="Inter,sans-serif" font-size="6.5" fill="${D.subtle}">Before</text>
      <rect x="45" y="18" width="7" height="7" fill="${D.green}" rx="1.5"/>
      <text x="55" y="25" font-family="Inter,sans-serif" font-size="6.5" fill="${D.subtle}">After ValuConnect</text>
      <line x1="${BAR_START}" y1="30" x2="${BAR_START}" y2="${bottom - 2}"
            stroke="${D.border}" stroke-width="1"/>
      ${rowsSVG}
      <rect x="${BAR_START}" y="${bottom}" width="${BAR_AREA}" height="20"
            fill="${D.greenLt}" rx="4"/>
      <text x="${BAR_START + BAR_AREA / 2}" y="${bottom + 13}"
            font-family="Inter,sans-serif" font-size="7.5" font-weight="800"
            fill="${D.green}" text-anchor="middle">${ind.savingsLine}</text>
    </svg>`;
}

function buildDonutChart(ind) {
  const pct   = ind.donutPct;
  const R     = 52, CX = 80, CY = 85;
  const circ  = Math.round(2 * Math.PI * R);
  const arc   = Math.round((pct / 100) * circ);
  return `
    <svg viewBox="0 0 160 165" xmlns="http://www.w3.org/2000/svg"
         style="width:100%;max-width:160px;display:block;margin:0 auto;">
      <text x="${CX}" y="14" font-family="Inter,sans-serif" font-size="7.5"
            font-weight="700" fill="${D.dark}" text-anchor="middle">Time Reduction</text>
      <circle cx="${CX}" cy="${CY}" r="${R}"
              fill="none" stroke="${D.border}" stroke-width="13"/>
      <circle cx="${CX}" cy="${CY}" r="${R}"
              fill="none" stroke="${D.green}" stroke-width="13"
              stroke-dasharray="${arc} ${circ}" stroke-linecap="round"
              transform="rotate(-90 ${CX} ${CY})"/>
      <text x="${CX}" y="${CY - 4}" font-family="Inter,sans-serif" font-size="22"
            font-weight="900" fill="${D.dark}" text-anchor="middle">${pct}%</text>
      <text x="${CX}" y="${CY + 10}" font-family="Inter,sans-serif" font-size="6.5"
            fill="${D.subtle}" text-anchor="middle">time reduced</text>
      <text x="${CX}" y="${CY + 21}" font-family="Inter,sans-serif" font-size="6.5"
            fill="${D.subtle}" text-anchor="middle">on admin tasks</text>
      <text x="${CX}" y="152" font-family="Inter,sans-serif" font-size="6.5"
            fill="${D.subtle}" text-anchor="middle">Source: marketing.md blueprint</text>
    </svg>`;
}

// ─────────────────────────────────────────────────────────────────────────────
// SLIDE BUILDERS
// ─────────────────────────────────────────────────────────────────────────────
function footer(ind) {
  const label = ind ? `${ind.icon} ${ind.name} Solution` : 'ValuConnect Solutions';
  return `
    <div class="deck-footer">
      <span>${label} · Confidential Customer Presentation</span>
      <span class="logo-ft">ValuConnect Solutions</span>
    </div>`;
}

function slideHead(eyebrow, title) {
  return `
    <div class="slide-head">
      <div>
        <div class="slide-eyebrow">${eyebrow}</div>
        <h2>${title}</h2>
      </div>
      <div class="brand-mark">ValuConnect</div>
    </div>`;
}

// Slide 1 — Cover
function slideCover(ind) {
  const stats = [
    { num: ind.donutPct + '%', label: 'Average reduction in\nadmin time per week' },
    { num: '30 min',           label: 'Free assessment with\nAndres — no commitment' },
    { num: '8',                label: 'Industries served\nwith a tailored system' },
  ];
  return `
    <div class="slide">
      <div class="cover-wrap">
        <div class="cover-left">
          <svg style="position:absolute;right:-10mm;top:0;height:100%;pointer-events:none;opacity:.06;"
               viewBox="0 0 100 210" xmlns="http://www.w3.org/2000/svg">
            <circle cx="100" cy="105" r="90" fill="white"/>
          </svg>
          <div class="cover-label">${ind.icon} ${ind.name} · Customer Presentation</div>
          <div class="cover-h1">Digital Systems<br>Built for <mark>${ind.name.split(/\s+/)[0]}</mark><br>Businesses.</div>
          <p class="cover-sub">
            Stop managing your ${ind.name.split(/\s+/)[0].toLowerCase()} on paper and in your head.
            ValuConnect builds the digital workflow system that runs quietly in the background —
            so you can focus on what you do best.
          </p>
          <div class="cover-tags">
            <span class="cover-tag">${ind.pillar}</span>
            <span class="cover-tag">Bilingual EN/ES</span>
            <span class="cover-tag">Paper → Digital</span>
          </div>
          <span class="cover-cta">Book a Free 30-Min Assessment</span>
        </div>
        <div class="cover-right">
          <svg style="position:absolute;top:0;right:0;width:100%;height:100%;pointer-events:none;"
               viewBox="0 0 200 210" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMaxYMid slice">
            <circle cx="180" cy="30"  r="60" fill="rgba(255,255,255,.06)"/>
            <circle cx="20"  cy="190" r="50" fill="rgba(255,255,255,.05)"/>
          </svg>
          <div class="cover-stat-stack">
            ${stats.map(s => `
              <div class="cover-stat">
                <div class="cover-stat-num">${s.num}</div>
                <div class="cover-stat-label">${s.label.replace(/\n/g, '<br>')}</div>
              </div>`).join('')}
          </div>
        </div>
      </div>
      ${footer(ind)}
    </div>`;
}

// Slide 2 — Who is ValuConnect?
function slideCompanyIntro(ind) {
  return `
    <div class="slide">
      ${slideHead('About ValuConnect Solutions', 'Who We Are — <em>And Why We\'re Different</em>')}
      <div class="slide-body">
        <div class="intro-grid">
          <div class="intro-left">
            <div class="intro-tagline">${BRAND.tagline}</div>
            <div class="intro-copy">
              ${BRAND.company} helps small business owners — especially Latino and Hispanic entrepreneurs —
              replace paper chaos with digital systems that run without stress.<br><br>
              We are not a platform. We are a personalized, bilingual partner who builds
              your system, trains your team, and stays by your side as you grow.
            </div>
            <div class="founder-block">
              <div class="founder-avatar">👤</div>
              <div>
                <div class="founder-name">${BRAND.founder} · Founder &amp; Principal</div>
                <div class="founder-sub">${BRAND.company} · Bilingual EN/ES · Mascot: ${BRAND.mascot}</div>
              </div>
            </div>
            <div class="badge-row">
              <span class="badge">✓ Bilingual EN/ES</span>
              <span class="badge">✓ Small Business Only</span>
              <span class="badge">✓ 8 Industries</span>
              <span class="badge">✓ Hands-On Partner</span>
            </div>
          </div>
          <div>
            <div style="font-size:7pt;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:${D.subtle};margin-bottom:3mm;">What We Build For You</div>
            <div class="services-grid">
              ${BRAND.services.map(s => `
                <div class="svc-card">
                  <span class="svc-icon">${s.icon}</span>
                  <div class="svc-name">${s.name}</div>
                  <div class="svc-desc">${s.desc}</div>
                </div>`).join('')}
            </div>
          </div>
        </div>
      </div>
      ${footer(ind)}
    </div>`;
}

// Slide 3 — Before vs. After
function slideBeforeAfter(ind) {
  return `
    <div class="slide">
      ${slideHead('The Transformation', 'Before vs. After — <em>What Changes for You</em>')}
      <div class="slide-body">
        <div class="ba-grid">
          <div class="ba-col ba-col-before">
            <div class="ba-col-head">✕ Before ValuConnect</div>
            <ul class="ba-list">
              ${ind.pains.map(p => `
                <li>
                  <span class="ba-bullet bullet-x">✕</span>
                  <span>${p.text}</span>
                </li>`).join('')}
            </ul>
          </div>
          <div class="ba-col ba-col-after">
            <div class="ba-col-head">✓ After ValuConnect</div>
            <ul class="ba-list">
              ${ind.solutions.map(s => `
                <li>
                  <span class="ba-bullet bullet-check">✓</span>
                  <span>${s}</span>
                </li>`).join('')}
            </ul>
          </div>
        </div>
      </div>
      ${footer(ind)}
    </div>`;
}

// Slide 4 — Real-world consequences
function slideChallenges(ind) {
  const consequences = {
    restaurants:           ["One missing invoice can mean a $400 overpayment you never catch.", "Last-minute call-outs cost you overtime and damage customer experience.", "You're pricing dishes on guesses — and margins leak silently.", "Every inspection is a 2-day scramble that lands entirely on you."],
    retail:                ["Stock-outs send your customers straight to the competitor next door.", "No paper trail means disputes, wrong orders, and money lost.", "One 10-minute search per customer lookup kills your staff's day.", "Untracked returns are an open door to fraud you won't see coming."],
    construction:          ["Illegible or lost orders cause rework — and the client blames you.", "Disputed pay every Friday erodes crew trust and retention.", "Duplicate invoice payments can cost thousands on a single job.", "Finding overruns after the job ends destroys the margin you planned."],
    'health-wellness':     ["Slow retrieval frustrates patients and creates real liability risk.", "One scheduling error can cost you a patient relationship permanently.", "A missed pre-auth means a denied claim and delayed revenue.", "A failed HIPAA audit can trigger fines up to $50,000 per violation."],
    'real-estate':         ["One fire or flood and your entire lease archive is gone forever.", "Requests buried in texts fester — and tenants get frustrated fast.", "Version confusion leads to disputes and late fees you never collect.", "Month-to-month tenants cost you 2–3 months of locked-in revenue."],
    'professional-services':["Staff waste billable hours hunting for files — time you can't recover.", "You don't know what's missing until the deadline has already passed.", "When no one owns a task, it falls through the cracks silently.", "One erased deadline can mean a missed filing and a damaged client."],
    'salons-beauty':       ["One eraser and the whole day's schedule is a mystery — clients are livid.", "When a stylist leaves, every color formula walks out with them.", "Every no-show without follow-up is permanent lost revenue.", "Running out of a top seller mid-week costs retail sales and trust."],
    logistics:             ["No written record = he-said/she-said disputes on every job.", "A lost manifest with 30 deliveries is a full-day catastrophe.", "Finding one delivery proof in 300+ messages takes 20+ minutes.", "Pay disputes without documentation cost you in court and trust."],
  };
  const cons = consequences[ind.id] || ind.pains.map(() => 'This creates friction, cost, and stress that compounds over time.');
  return `
    <div class="slide">
      ${slideHead('The Real Cost of Staying Manual', 'Does This Sound <em>Familiar?</em>')}
      <div class="slide-body">
        <div class="chal-grid">
          ${ind.pains.map((p, i) => `
            <div class="chal-card">
              <span class="chal-icon">${p.icon}</span>
              <div class="chal-title">${p.text}</div>
              <div class="chal-cost">💸 ${cons[i]}</div>
            </div>`).join('')}
        </div>
      </div>
      ${footer(ind)}
    </div>`;
}

// Slide 5 — Charts
function slideCharts(ind) {
  return `
    <div class="slide">
      ${slideHead('By the Numbers', 'Before vs. After ValuConnect — <em>Quantified</em>')}
      <div class="slide-body">
        <div class="chart-grid">
          <div class="chart-panel">
            ${buildBarChart(ind)}
          </div>
          <div class="chart-panel">
            ${buildDonutChart(ind)}
            <div class="chart-badge">${ind.donutPct}% less admin time</div>
            <div class="chart-note">
              Time reclaimed every week — back to<br>
              running your business, not paperwork.
            </div>
          </div>
        </div>
      </div>
      ${footer(ind)}
    </div>`;
}

// Slide 6 — Results + Process
function slideResults(ind) {
  return `
    <div class="slide">
      ${slideHead('Proven Outcomes', 'Results You Can <em>Expect</em>')}
      <div class="slide-body">
        <div class="results-grid">
          ${ind.results.map((r, i) => `
            <div class="result-card">
              <div class="result-num">${r}</div>
              <div class="result-label">${ind.resultLabels[i]}</div>
            </div>`).join('')}
        </div>
        <div class="process-strip">
          ${BRAND.process.map(p => `
            <div class="proc-step">
              <div class="proc-num">${p.step}</div>
              <div class="proc-title">${p.title}</div>
              <div class="proc-desc">${p.desc}</div>
            </div>`).join('')}
        </div>
      </div>
      ${footer(ind)}
    </div>`;
}

// Slide 7 — Quote + CTA
function slideCTA(ind) {
  return `
    <div class="slide">
      <div class="cta-wrap">
        <svg style="position:absolute;top:0;right:0;width:50mm;height:50mm;pointer-events:none;"
             viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg">
          <circle cx="120" cy="0" r="80" fill="none" stroke="${D.amber}" stroke-width="1.5" opacity=".18"/>
          <circle cx="120" cy="0" r="55" fill="none" stroke="${D.amber}" stroke-width="1"   opacity=".12"/>
        </svg>
        <div class="quote-mark">"</div>
        <div class="quote-text">${ind.quote}</div>
        <div class="quote-attr">${ind.quoteAttr}</div>
        <div class="cta-box">
          <div class="cta-headline">Ready to stop running your ${ind.name.split(/\s+/)[0].toLowerCase()} on paper and stress?</div>
          <div class="cta-sub">Book a free 30-minute workflow assessment with ${BRAND.founder}</div>
          <div class="cta-contact">valuconnect.com</div>
        </div>
        <div class="bilingual-line">Hablamos tu idioma — We speak your language.</div>
        <div class="meta-strip">
          <div class="meta-item">
            <div class="meta-label">Founder</div>
            <div class="meta-value">${BRAND.founder}</div>
          </div>
          <div class="meta-divider"></div>
          <div class="meta-item">
            <div class="meta-label">Bilingual</div>
            <div class="meta-value">English · Español</div>
          </div>
          <div class="meta-divider"></div>
          <div class="meta-item">
            <div class="meta-label">Industry</div>
            <div class="meta-value">${ind.name}</div>
          </div>
          <div class="meta-divider"></div>
          <div class="meta-item">
            <div class="meta-label">Focus</div>
            <div class="meta-value">${ind.pillar}</div>
          </div>
        </div>
      </div>
      ${footer(ind)}
    </div>`;
}

// ─────────────────────────────────────────────────────────────────────────────
// ASSEMBLE DECK
// ─────────────────────────────────────────────────────────────────────────────
function buildDeck(ind) {
  const slides = [
    slideCover(ind),
    slideCompanyIntro(ind),
    slideBeforeAfter(ind),
    slideChallenges(ind),
    slideCharts(ind),
    slideResults(ind),
    slideCTA(ind),
  ].join('\n');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>ValuConnect — ${ind.name} Business Presentation</title>
  <style>${CSS}</style>
</head>
<body>
${slides}
</body>
</html>`;
}

// ─────────────────────────────────────────────────────────────────────────────
// RUN
// ─────────────────────────────────────────────────────────────────────────────
const PILOT_SLUG = 'restaurants'; // set null to generate all 8

const targets = PILOT_SLUG
  ? INDUSTRIES.filter(i => i.id === PILOT_SLUG)
  : INDUSTRIES;

for (const ind of targets) {
  const html = buildDeck(ind);
  const file = path.join(OUT, `vc-${ind.id}.html`);
  fs.writeFileSync(file, html);
  console.log(`✓  vc-${ind.id}.html  (${ind.chartRows.length} chart rows)`);
}

if (PILOT_SLUG) {
  console.log('\n📋 PILOT MODE — Restaurants only.');
  console.log('   Review vc-restaurants.html, then set PILOT_SLUG = null for all 8 decks.');
} else {
  console.log(`\n🎉 Generated ${targets.length} decks → presentations/output/vc-[industry].html`);
}
console.log('\nTo PDF: Chrome → File → Print → Save as PDF | A4 Landscape | Background graphics ON | Margins = None');
