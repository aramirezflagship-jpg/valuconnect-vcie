#!/usr/bin/env node
/**
 * ValuConnect Sales One-Pager Generator
 * Source: marketing.md blueprint only.
 * Output: A5 portrait single-page brochure, print-to-PDF ready.
 *
 * Usage:  node presentations/generate-onepager.js
 * Output: presentations/output/onepager-[industry].html
 *
 * To PDF: Chrome → File → Print → Save as PDF
 *   A4 Portrait · Background graphics ON · Margins = None
 */

const fs   = require('fs');
const path = require('path');

const OUT = path.join(__dirname, 'output');
if (!fs.existsSync(OUT)) fs.mkdirSync(OUT, { recursive: true });

// ─────────────────────────────────────────────────────────────────────────────
// CONTENT — from marketing.md
// ─────────────────────────────────────────────────────────────────────────────
const CO = {
  name:      'ValuConnect Solutions',
  founder:   'Andres Ramirez',
  mission:   'Help small businesses work smarter, not harder — with digital systems that grow with them.',
  tagline:   'Your neighbor who happens to know digital systems.',
  url:       'valuconnect.com',
  audience:  'Small business owners · Latino & Hispanic entrepreneurs · Bilingual EN/ES',
  services:  ['Paper-to-Digital', 'Document Filing', 'Workflow Automation', 'Project Tracking', 'AI Communication', 'Training & Support'],
  process:   ['Free 30-min assessment', 'Custom digital roadmap', 'Implementation & training'],
};

const INDUSTRIES = [
  {
    id:    'restaurants',
    name:  'Restaurants & Food Service',
    icon:  '🍽️',
    headline: 'Stop Running Your Restaurant on Paper.',
    sub:   'ValuConnect builds the back-office digital system your team actually needs — so you can get back to cooking, not filing.',
    pains: [
      { icon: '🧾', text: 'Supplier invoices lost or buried in a drawer every week' },
      { icon: '📅', text: 'Scheduling done by hand — conflicts and call-outs every Friday' },
      { icon: '📦', text: 'No visibility on food costs until the month-end spreadsheet panic' },
      { icon: '🏥', text: 'Health inspection week = days of scrambling through paper files' },
    ],
    solutions: [
      { icon: '✅', text: 'Digital invoice archive — any document found in under 10 seconds' },
      { icon: '✅', text: 'Automated weekly schedule with conflict alerts to your phone' },
      { icon: '✅', text: 'Real-time food cost tracking tied directly to your inventory' },
      { icon: '✅', text: 'Compliance folder always current — inspection-ready any day, any time' },
    ],
    metrics: [
      { num: '6 hrs',  label: 'Saved per week\non admin tasks' },
      { num: '87%',    label: 'Reduction in\nadmin time' },
      { num: '5 min',  label: 'Inspection readiness\n(was 4+ hours)' },
      { num: '0',      label: 'Lost invoices\nsince go-live' },
    ],
    chartRows: [
      { label: 'Invoice admin',   before: 3,    after: 0.25, bLabel: '3 hrs', aLabel: '15 min' },
      { label: 'Scheduling',      before: 2,    after: 0.5,  bLabel: '2 hrs', aLabel: '30 min' },
      { label: 'Compliance prep', before: 4,    after: 0.08, bLabel: '4 hrs', aLabel: '5 min'  },
    ],
    chartMax: 4,
    donutPct: 87,
    quote: '"I used to dread inspection week. Now everything is one click away."',
    quoteAttr: '— Maria G., Restaurant Owner · Miami, FL',
    pillar: 'Digital Transformation',
  },
  {
    id:    'retail',
    name:  'Retail & Boutiques',
    icon:  '🛍️',
    headline: 'Stop Managing Your Store on Paper.',
    sub:   'ValuConnect replaces paper cards, verbal orders, and binder receipts with a digital system that keeps your inventory visible and your customers happy.',
    pains: [
      { icon: '📋', text: 'Inventory tracked on paper cards — stock-outs happen weekly' },
      { icon: '📞', text: 'Supplier orders by phone with no written trail to reference' },
      { icon: '🗄️', text: 'Customer receipts in binders — a 10-minute search every lookup' },
      { icon: '↩️', text: 'No returns system — disputes and losses you never catch' },
    ],
    solutions: [
      { icon: '✅', text: 'Digital inventory with automatic low-stock alerts sent to you' },
      { icon: '✅', text: 'Supplier order emails with digital confirmation records on file' },
      { icon: '✅', text: 'Customer transaction archive — any receipt in under 10 seconds' },
      { icon: '✅', text: 'Return and exchange workflow with approval steps and history' },
    ],
    metrics: [
      { num: '80%',   label: 'Fewer stock-outs\nsince go-live' },
      { num: '<10 s', label: 'Customer receipt\nlookup time' },
      { num: '0',     label: 'Supplier order\nerrors' },
      { num: '3×',    label: 'Faster return\nprocessing' },
    ],
    chartRows: [
      { label: 'Stock-outs/month', before: 100, after: 20, bLabel: 'Frequent', aLabel: '80% fewer' },
      { label: 'Receipt lookup',   before: 10,  after: 0.17, bLabel: '10 min', aLabel: '10 sec' },
      { label: 'Return disputes',  before: 100, after: 10, bLabel: 'Common',   aLabel: 'Rare' },
    ],
    chartMax: 100,
    donutPct: 80,
    quote: '"I stopped losing money on items I forgot I had."',
    quoteAttr: '— Carmen L., Boutique Owner · Los Angeles, CA',
    pillar: 'Digital Transformation',
  },
  {
    id:    'construction',
    name:  'Construction & Contracting',
    icon:  '🏗️',
    headline: 'Stop Running Your Crew on Paper.',
    sub:   'ValuConnect replaces lost work orders, Friday-night timesheet photos, and billing delays with a digital system built for the job site.',
    pains: [
      { icon: '📝', text: 'Work orders handwritten on site — illegible or lost mid-job' },
      { icon: '📷', text: 'Timesheets collected via phone photos every Friday — unreliable' },
      { icon: '🧾', text: 'Subcontractor invoices missing, duplicated, or disputed monthly' },
      { icon: '📈', text: 'Cost overruns discovered only after the job is already done' },
    ],
    solutions: [
      { icon: '✅', text: 'Digital work orders submitted from the job site, instantly' },
      { icon: '✅', text: 'Automated timesheet collection with manager approval flow' },
      { icon: '✅', text: 'Subcontractor invoice portal with tracking and duplicate detection' },
      { icon: '✅', text: 'Live project cost dashboard vs. budget — alert at 80% threshold' },
    ],
    metrics: [
      { num: '3 days', label: 'Billing cycle\n(was 3 weeks)' },
      { num: '0',      label: 'Missing\ntimesheets' },
      { num: '0',      label: 'Subcontractor\ndisputes' },
      { num: '85%',    label: 'Reduction in\nbilling delays' },
    ],
    chartRows: [
      { label: 'Billing cycle',  before: 21, after: 3,  bLabel: '21 days', aLabel: '3 days' },
      { label: 'Missing sheets', before: 4,  after: 0,  bLabel: '4/mo',    aLabel: 'Zero' },
      { label: 'Disputes',       before: 3,  after: 0,  bLabel: '3/mo',    aLabel: 'Zero' },
    ],
    chartMax: 21,
    donutPct: 85,
    quote: '"We used to bill late every single month. Now invoices go out the same day the job is done."',
    quoteAttr: '— Roberto M., General Contractor · Houston, TX',
    pillar: 'Work Smarter',
  },
  {
    id:    'health-wellness',
    name:  'Health & Wellness',
    icon:  '🏥',
    headline: 'Stop Running Your Practice on Paper.',
    sub:   'ValuConnect brings patient records, scheduling, and compliance into a single digital system — so your team can focus on care, not paperwork.',
    pains: [
      { icon: '🗂️', text: 'Patient files in physical folders — retrieval takes minutes' },
      { icon: '📅', text: 'Double-bookings from a shared paper calendar happen regularly' },
      { icon: '📌', text: 'Pre-auth requests tracked on sticky notes — delays and misses' },
      { icon: '⚖️', text: 'HIPAA compliance gaps that only surface when an audit hits' },
    ],
    solutions: [
      { icon: '✅', text: 'Secure digital patient records — any file in under 5 seconds' },
      { icon: '✅', text: 'Online scheduling with real-time availability sync for all staff' },
      { icon: '✅', text: 'Pre-auth tracking dashboard with deadline alerts — zero misses' },
      { icon: '✅', text: 'HIPAA compliance folder with access logs — audit-ready always' },
    ],
    metrics: [
      { num: '<5 s', label: 'Patient record\nretrieval time' },
      { num: '0',    label: 'Double-bookings\nafter go-live' },
      { num: '40%',  label: 'Faster prior-auth\napprovals' },
      { num: '0',    label: 'HIPAA audit\nfindings' },
    ],
    chartRows: [
      { label: 'Patient lookup', before: 5,   after: 0.08, bLabel: '5 min', aLabel: '<5 sec' },
      { label: 'Auth wait time', before: 100, after: 60,   bLabel: 'Slow',  aLabel: '40% faster' },
      { label: 'Double-bookings',before: 100, after: 0,    bLabel: 'Weekly',aLabel: 'Zero' },
    ],
    chartMax: 100,
    donutPct: 90,
    quote: '"Our front desk used to be chaos. Now new patients comment on how organized we are."',
    quoteAttr: '— Dr. Ana P., Physical Therapy Clinic · Phoenix, AZ',
    pillar: 'Digital Transformation',
  },
  {
    id:    'real-estate',
    name:  'Real Estate & Property Mgmt',
    icon:  '🏠',
    headline: 'Stop Managing Properties on Paper.',
    sub:   'ValuConnect replaces physical lease folders, text-message maintenance requests, and missed renewal deadlines with a system that runs itself.',
    pains: [
      { icon: '📁', text: 'Lease agreements in one physical folder — no backup, no search' },
      { icon: '📱', text: 'Maintenance requests via text — buried and forgotten' },
      { icon: '📊', text: 'Rent spreadsheet has conflicting versions across staff' },
      { icon: '⏰', text: 'Lease renewals missed — tenants go month-to-month accidentally' },
    ],
    solutions: [
      { icon: '✅', text: 'Digital lease archive with automatic 60-day renewal alerts' },
      { icon: '✅', text: 'Maintenance portal with ticket numbers and photo documentation' },
      { icon: '✅', text: 'Central rent log with automated reminders sent to tenants' },
      { icon: '✅', text: 'Renewal workflow: notice → digital signature → filed instantly' },
    ],
    metrics: [
      { num: '0',    label: 'Missed renewals\nin 12 months' },
      { num: '2×',   label: 'Faster maintenance\nresolution' },
      { num: '0',    label: 'Rent collection\ndisputes' },
      { num: '1 hr', label: 'Staff time saved\nper property/mo' },
    ],
    chartRows: [
      { label: 'Missed renewals', before: 6,   after: 0,  bLabel: '6/yr',   aLabel: 'Zero' },
      { label: 'Maint. resolution',before: 100, after: 50, bLabel: 'Slow',  aLabel: '2× faster' },
      { label: 'Pay disputes',    before: 100, after: 5,  bLabel: 'Common', aLabel: 'Rare' },
    ],
    chartMax: 100,
    donutPct: 75,
    quote: '"We grew from 20 to 40 units without hiring extra staff. The system does the tracking for us."',
    quoteAttr: '— Luis T., Property Manager · Dallas, TX',
    pillar: 'Work Smarter',
  },
  {
    id:    'professional-services',
    name:  'Professional Services',
    icon:  '💼',
    headline: 'Stop Running Your Firm on Paper.',
    sub:   'ValuConnect replaces scattered documents, whiteboard deadlines, and "did you send that?" emails with a digital client system your whole team can trust.',
    pains: [
      { icon: '📂', text: 'Client docs scattered across folders, email, and attachments' },
      { icon: '❓', text: 'No way to track which clients have submitted required documents' },
      { icon: '😕', text: 'Staff confusion over who owns each case, task, or deadline' },
      { icon: '🗓️', text: 'Deadlines on a shared whiteboard — one erased date is a crisis' },
    ],
    solutions: [
      { icon: '✅', text: 'Digital client portal — secure doc submission with auto-confirmation' },
      { icon: '✅', text: 'Per-client checklist with real-time submission status for all staff' },
      { icon: '✅', text: 'Task assignment system with accountability and deadline tracking' },
      { icon: '✅', text: 'Automated 30-day and 7-day reminder emails — zero missed deadlines' },
    ],
    metrics: [
      { num: '3 days', label: 'Tax season prep\n(was 2 weeks)' },
      { num: '100%',   label: 'Document submission\nvisibility' },
      { num: '0',      label: 'Missed client\ndeadlines' },
      { num: '↑',      label: 'Measurable rise in\nclient satisfaction' },
    ],
    chartRows: [
      { label: 'Tax prep time',   before: 14, after: 3,   bLabel: '14 days', aLabel: '3 days' },
      { label: 'Doc visibility',  before: 40, after: 100, bLabel: '40%',     aLabel: '100%' },
      { label: 'Missed deadlines',before: 4,  after: 0,   bLabel: '4/season',aLabel: 'Zero' },
    ],
    chartMax: 100,
    donutPct: 79,
    quote: '"We stopped having the \'where is that document?\' conversation. It just exists, where it should be."',
    quoteAttr: '— Patricia S., CPA Firm Owner · Chicago, IL',
    pillar: 'Work Smarter',
  },
  {
    id:    'salons-beauty',
    name:  'Salons & Beauty',
    icon:  '✂️',
    headline: 'Stop Running Your Salon on Paper.',
    sub:   'ValuConnect replaces the paper appointment book, lost color formulas, and sticky-note no-show tracking with a digital system that actually protects your revenue.',
    pains: [
      { icon: '📖', text: 'Paper appointment book — one eraser wrecks the whole day' },
      { icon: '🎨', text: 'Color formulas and preferences not recorded — lost with each stylist' },
      { icon: '😶', text: 'No-shows tracked on sticky notes — zero follow-up, zero recovery' },
      { icon: '🧴', text: 'Retail inventory counted by eye — stockouts happen every week' },
    ],
    solutions: [
      { icon: '✅', text: 'Digital booking with automated SMS reminders 24 hrs before' },
      { icon: '✅', text: 'Client profile cards — full history, formulas, and preferences saved' },
      { icon: '✅', text: 'Automated no-show follow-up with rebooking offer — recovers revenue' },
      { icon: '✅', text: 'Retail inventory system with automatic reorder alerts' },
    ],
    metrics: [
      { num: '60%',  label: 'Fewer no-shows\nsince go-live' },
      { num: '0',    label: 'Client histories\nlost to turnover' },
      { num: '2×',   label: 'Higher rebooking\nrate' },
      { num: '0',    label: 'Stockouts on\ntop sellers' },
    ],
    chartRows: [
      { label: 'No-show rate',  before: 100, after: 40, bLabel: 'High',    aLabel: '60% fewer' },
      { label: 'Rebook rate',   before: 40,  after: 80, bLabel: 'Low',     aLabel: '2× higher' },
      { label: 'Retail stockouts',before: 100, after: 5, bLabel: 'Weekly', aLabel: 'Rare' },
    ],
    chartMax: 100,
    donutPct: 60,
    quote: '"When my top stylist left, I was terrified. But we had every client\'s history saved. Not one client was lost."',
    quoteAttr: '— Diana V., Salon Owner · Miami, FL',
    pillar: 'Owner Stories',
  },
  {
    id:    'logistics',
    name:  'Logistics & Delivery',
    icon:  '🚚',
    headline: 'Stop Running Your Fleet on Paper.',
    sub:   'ValuConnect replaces phone dispatch, paper manifests, and group-chat proof of delivery with a structured digital system every driver and dispatcher can use.',
    pains: [
      { icon: '📞', text: 'Dispatch by phone only — no written record, no accountability' },
      { icon: '📋', text: 'Paper manifest lost when a driver loses it or a truck breaks down' },
      { icon: '💬', text: 'Proof of delivery buried in a 300-message group chat' },
      { icon: '🕐', text: 'Driver hours by verbal report — pay disputes happen every week' },
    ],
    solutions: [
      { icon: '✅', text: 'Digital dispatch board with real-time driver assignment and routes' },
      { icon: '✅', text: 'Digital manifest on any phone — never lost, always accessible' },
      { icon: '✅', text: 'Proof-of-delivery: photo + GPS timestamp + customer signature' },
      { icon: '✅', text: 'Driver timesheet system — documented hours, zero disputes' },
    ],
    metrics: [
      { num: '0',      label: 'Lost manifests\nin first 90 days' },
      { num: '<5 min', label: 'Delivery dispute\nresolution time' },
      { num: '70%',    label: 'Fewer customer\ncomplaints' },
      { num: '0',      label: 'Driver pay\ndisputes' },
    ],
    chartRows: [
      { label: 'Lost manifests', before: 100, after: 0,  bLabel: 'Happened', aLabel: 'Zero (90d)' },
      { label: 'Dispute time',   before: 60,  after: 5,  bLabel: '60 min',   aLabel: '< 5 min' },
      { label: 'Complaints',     before: 100, after: 30, bLabel: 'Regular',  aLabel: '70% fewer' },
    ],
    chartMax: 100,
    donutPct: 70,
    quote: '"A customer claimed we never delivered. We showed the photo, the GPS, and the signature. Case closed in two minutes."',
    quoteAttr: '— Jorge A., Delivery Company Owner · Orlando, FL',
    pillar: 'Work Smarter',
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// DESIGN — brochure palette, independent of website
// ─────────────────────────────────────────────────────────────────────────────
const P = {
  ink:     '#1A2332',   // deep dark blue-black (headers, footer)
  body:    '#2D3748',   // body text
  muted:   '#718096',   // captions
  border:  '#E2E8F0',   // dividers
  white:   '#FFFFFF',
  offwhite:'#F7F9FC',   // panel backgrounds
  accent:  '#1D6FA4',   // blue accent
  green:   '#1A7F5A',   // solutions / positive
  greenBg: '#EAF7F1',   // solution column bg
  red:     '#C0392B',   // challenges / pain
  redBg:   '#FEF0EE',   // challenge column bg
  amber:   '#C47B0A',   // metrics / highlight
  amberBg: '#FEF9E7',   // metric chips
};

// ─────────────────────────────────────────────────────────────────────────────
// SVG CHARTS
// ─────────────────────────────────────────────────────────────────────────────
function svgBarChart(ind) {
  const rows   = ind.chartRows;
  const mx     = ind.chartMax;
  const BAR_X  = 82;
  const BAR_W  = 170;
  const scale  = BAR_W / mx;
  const BAR_H  = 9;
  const ROW_H  = 24;
  const TOP    = 32;

  const rowsSVG = rows.map((r, i) => {
    const y0 = TOP + i * ROW_H;
    const y1 = y0 + BAR_H + 3;
    const bW = Math.max(2, Math.round(r.before * scale));
    const aW = Math.max(2, Math.round(r.after  * scale));
    return `
      <text x="78" y="${y0 + BAR_H - 1}" font-family="Inter,sans-serif" font-size="6"
            fill="${P.muted}" text-anchor="end">${r.label}</text>
      <rect x="${BAR_X}" y="${y0}" width="${bW}" height="${BAR_H}" fill="${P.red}" rx="2"/>
      <text x="${BAR_X + bW + 3}" y="${y0 + BAR_H - 1}" font-family="Inter,sans-serif"
            font-size="6" font-weight="700" fill="${P.red}">${r.bLabel}</text>
      <rect x="${BAR_X}" y="${y1}" width="${aW}" height="${BAR_H}" fill="${P.green}" rx="2"/>
      <text x="${BAR_X + aW + 3}" y="${y1 + BAR_H - 1}" font-family="Inter,sans-serif"
            font-size="6" font-weight="700" fill="${P.green}">${r.aLabel}</text>`;
  }).join('');

  const bottom = TOP + rows.length * ROW_H + 3;
  const svgH   = bottom + 18;

  return `<svg viewBox="0 0 270 ${svgH}" xmlns="http://www.w3.org/2000/svg" style="width:100%;display:block;">
    <text x="0" y="12" font-family="Inter,sans-serif" font-size="7.5" font-weight="700" fill="${P.ink}">Weekly Admin Hours</text>
    <rect x="0" y="18" width="6" height="6" fill="${P.red}" rx="1"/>
    <text x="9" y="24" font-family="Inter,sans-serif" font-size="6" fill="${P.muted}">Before</text>
    <rect x="40" y="18" width="6" height="6" fill="${P.green}" rx="1"/>
    <text x="49" y="24" font-family="Inter,sans-serif" font-size="6" fill="${P.muted}">After</text>
    <line x1="${BAR_X}" y1="28" x2="${BAR_X}" y2="${bottom}" stroke="${P.border}" stroke-width="1"/>
    ${rowsSVG}
    <rect x="${BAR_X}" y="${bottom}" width="${BAR_W}" height="15" fill="${P.greenBg}" rx="3"/>
    <text x="${BAR_X + BAR_W / 2}" y="${bottom + 10}" font-family="Inter,sans-serif" font-size="6.5"
          font-weight="700" fill="${P.green}" text-anchor="middle">${ind.donutPct}% less admin time overall</text>
  </svg>`;
}

function svgDonut(ind) {
  const R = 38, CX = 46, CY = 46;
  const circ = Math.round(2 * Math.PI * R);
  const arc  = Math.round((ind.donutPct / 100) * circ);
  return `<svg viewBox="0 0 92 100" xmlns="http://www.w3.org/2000/svg" style="width:90px;display:block;margin:0 auto;">
    <circle cx="${CX}" cy="${CY}" r="${R}" fill="none" stroke="${P.border}" stroke-width="10"/>
    <circle cx="${CX}" cy="${CY}" r="${R}" fill="none" stroke="${P.green}" stroke-width="10"
            stroke-dasharray="${arc} ${circ}" stroke-linecap="round"
            transform="rotate(-90 ${CX} ${CY})"/>
    <text x="${CX}" y="${CY - 3}" font-family="Inter,sans-serif" font-size="16"
          font-weight="900" fill="${P.ink}" text-anchor="middle">${ind.donutPct}%</text>
    <text x="${CX}" y="${CY + 10}" font-family="Inter,sans-serif" font-size="5.5"
          fill="${P.muted}" text-anchor="middle">time saved</text>
    <text x="${CX}" y="92" font-family="Inter,sans-serif" font-size="5.5"
          fill="${P.muted}" text-anchor="middle">on admin work</text>
  </svg>`;
}

// ─────────────────────────────────────────────────────────────────────────────
// HTML BUILDER
// ─────────────────────────────────────────────────────────────────────────────
function buildOnePager(ind) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>ValuConnect — ${ind.name} One-Pager</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:ital,wght@0,400;0,500;0,600;0,700;0,800;0,900;1,600&display=swap');
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

    body {
      font-family: 'Inter', system-ui, sans-serif;
      background: #CBD5E0;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }

    /* ── Page shell ── */
    .page {
      width: 148mm;
      min-height: 210mm;
      background: ${P.white};
      margin: 8mm auto;
      display: flex;
      flex-direction: column;
      box-shadow: 0 4px 30px rgba(0,0,0,.18);
      overflow: hidden;
    }

    /* ── HEADER ── */
    .hdr {
      background: ${P.ink};
      padding: 5mm 6mm 4mm;
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
    }
    .hdr-left {}
    .hdr-logo {
      font-size: 11pt;
      font-weight: 900;
      color: #fff;
      letter-spacing: -.3px;
      line-height: 1;
      margin-bottom: 1mm;
    }
    .hdr-logo span { color: ${P.amber}; }
    .hdr-tagline {
      font-size: 6pt;
      color: rgba(255,255,255,.55);
      font-style: italic;
    }
    .hdr-right { text-align: right; }
    .hdr-industry {
      font-size: 8pt;
      font-weight: 800;
      color: #fff;
      line-height: 1.2;
      margin-bottom: 1mm;
    }
    .hdr-industry-sub {
      font-size: 5.5pt;
      color: rgba(255,255,255,.5);
      text-transform: uppercase;
      letter-spacing: 1.5px;
    }

    /* ── HERO STRIP ── */
    .hero {
      background: ${P.accent};
      padding: 4mm 6mm;
    }
    .hero h1 {
      font-size: 12pt;
      font-weight: 900;
      color: #fff;
      line-height: 1.15;
      margin-bottom: 1.5mm;
    }
    .hero p {
      font-size: 7pt;
      color: rgba(255,255,255,.82);
      line-height: 1.55;
      max-width: 130mm;
    }

    /* ── COMPANY STRIP ── */
    .company-strip {
      background: ${P.offwhite};
      border-bottom: 1.5px solid ${P.border};
      padding: 3mm 6mm;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 4mm;
    }
    .company-intro {
      font-size: 6.5pt;
      color: ${P.body};
      line-height: 1.5;
      max-width: 80mm;
    }
    .company-intro strong { color: ${P.ink}; }
    .services-row {
      display: flex;
      flex-wrap: wrap;
      gap: 2px;
    }
    .svc-pill {
      background: ${P.accent};
      color: #fff;
      font-size: 5.5pt;
      font-weight: 700;
      padding: 1.5px 5px;
      border-radius: 10px;
      white-space: nowrap;
    }

    /* ── THREE-COLUMN BODY ── */
    .body-cols {
      display: grid;
      grid-template-columns: 1fr 1fr 1fr;
      flex: 1;
      border-bottom: 1.5px solid ${P.border};
    }

    .col {
      padding: 4mm 4mm;
      display: flex;
      flex-direction: column;
    }
    .col + .col { border-left: 1.5px solid ${P.border}; }

    .col-head {
      font-size: 6pt;
      font-weight: 800;
      letter-spacing: 1.5px;
      text-transform: uppercase;
      padding-bottom: 2.5mm;
      margin-bottom: 2.5mm;
      border-bottom: 2px solid currentColor;
      display: flex;
      align-items: center;
      gap: 4px;
    }
    .col-challenges .col-head { color: ${P.red};   border-bottom-color: ${P.red};   }
    .col-solutions  .col-head { color: ${P.green}; border-bottom-color: ${P.green}; }
    .col-results    .col-head { color: ${P.accent}; border-bottom-color: ${P.accent}; }

    /* Challenges */
    .col-challenges { background: ${P.redBg}; }
    .pain-list { list-style: none; display: flex; flex-direction: column; gap: 2mm; }
    .pain-item {
      display: flex; gap: 3px; align-items: flex-start;
      font-size: 6.5pt; color: ${P.body}; line-height: 1.4;
    }
    .pain-icon { flex-shrink: 0; font-size: 9pt; margin-top: -1px; }

    /* Solutions */
    .col-solutions { background: ${P.greenBg}; }
    .sol-list { list-style: none; display: flex; flex-direction: column; gap: 2mm; }
    .sol-item {
      display: flex; gap: 3px; align-items: flex-start;
      font-size: 6.5pt; color: ${P.body}; line-height: 1.4;
    }
    .sol-check { color: ${P.green}; font-weight: 900; flex-shrink: 0; margin-top: 1px; }

    /* Results */
    .col-results { background: ${P.white}; }
    .metrics-grid {
      display: grid; grid-template-columns: 1fr 1fr;
      gap: 2mm; margin-bottom: 3mm;
    }
    .metric-chip {
      background: ${P.amberBg};
      border: 1px solid #F6D98A;
      border-radius: 5px;
      padding: 2.5mm 2mm;
      text-align: center;
    }
    .metric-num {
      font-size: 11pt; font-weight: 900;
      color: ${P.amber}; line-height: 1; margin-bottom: 1mm;
    }
    .metric-label {
      font-size: 5.5pt; color: ${P.muted}; line-height: 1.3;
    }
    .chart-section { margin-top: 1.5mm; }
    .chart-section-head {
      font-size: 5.5pt; font-weight: 700; color: ${P.muted};
      text-transform: uppercase; letter-spacing: 1px;
      margin-bottom: 1.5mm;
    }
    .donut-row {
      display: flex; align-items: center; gap: 3mm; margin-top: 2mm;
    }
    .donut-label {
      font-size: 6pt; color: ${P.body}; line-height: 1.45; flex: 1;
    }
    .donut-label strong { color: ${P.green}; font-size: 8pt; }

    /* ── QUOTE BAND ── */
    .quote-band {
      background: ${P.ink};
      padding: 4mm 6mm;
      display: flex;
      align-items: center;
      gap: 4mm;
    }
    .quote-mark {
      font-size: 24pt; font-weight: 900;
      color: ${P.amber}; line-height: .6;
      flex-shrink: 0; opacity: .6;
    }
    .quote-body {}
    .quote-text {
      font-size: 7.5pt; font-style: italic; font-weight: 600;
      color: #fff; line-height: 1.5; margin-bottom: 1mm;
    }
    .quote-attr {
      font-size: 6pt; font-weight: 700;
      color: ${P.amber}; letter-spacing: .3px;
    }

    /* ── CTA BAND ── */
    .cta-band {
      background: ${P.amber};
      padding: 3.5mm 6mm;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    .cta-left {}
    .cta-headline {
      font-size: 8pt; font-weight: 900;
      color: ${P.ink}; line-height: 1.2; margin-bottom: 1mm;
    }
    .cta-sub {
      font-size: 6pt; color: rgba(26,35,50,.65);
    }
    .cta-right { text-align: right; }
    .cta-url {
      font-size: 9pt; font-weight: 900;
      color: ${P.ink}; letter-spacing: -.3px;
      line-height: 1.1;
    }
    .cta-lang {
      font-size: 5.5pt; color: rgba(26,35,50,.55);
      font-style: italic; margin-top: 1mm;
    }

    /* ── PROCESS FOOTER ── */
    .process-footer {
      background: ${P.offwhite};
      border-top: 1.5px solid ${P.border};
      padding: 3mm 6mm;
      display: flex;
      align-items: center;
      gap: 0;
    }
    .proc-label {
      font-size: 5.5pt; font-weight: 700;
      text-transform: uppercase; letter-spacing: 1.5px;
      color: ${P.muted}; margin-right: 4mm; white-space: nowrap;
    }
    .proc-steps {
      display: flex; gap: 0; flex: 1; align-items: center;
    }
    .proc-step {
      display: flex; align-items: center; gap: 2px;
    }
    .proc-num {
      width: 4.5mm; height: 4.5mm; border-radius: 50%;
      background: ${P.accent}; color: #fff;
      font-size: 6pt; font-weight: 800;
      display: flex; align-items: center; justify-content: center;
      flex-shrink: 0;
    }
    .proc-text {
      font-size: 6pt; font-weight: 600; color: ${P.body};
    }
    .proc-arrow {
      font-size: 8pt; color: ${P.muted};
      margin: 0 2mm; flex-shrink: 0;
    }
    .founder-note {
      font-size: 5.5pt; color: ${P.muted};
      text-align: right; white-space: nowrap; margin-left: 4mm;
    }

    /* ── PRINT ── */
    @media print {
      body { background: white; }
      .page { margin: 0; box-shadow: none; width: 148mm; min-height: 210mm; }
      @page { size: A5 portrait; margin: 0; }
    }
  </style>
</head>
<body>
<div class="page">

  <!-- HEADER -->
  <div class="hdr">
    <div class="hdr-left">
      <div class="hdr-logo">Valu<span>Connect</span> Solutions</div>
      <div class="hdr-tagline">"${CO.tagline}"</div>
    </div>
    <div class="hdr-right">
      <div class="hdr-industry">${ind.icon} ${ind.name}</div>
      <div class="hdr-industry-sub">Industry Solution Guide · ${ind.pillar}</div>
    </div>
  </div>

  <!-- HERO -->
  <div class="hero">
    <h1>${ind.headline}</h1>
    <p>${ind.sub}</p>
  </div>

  <!-- COMPANY STRIP -->
  <div class="company-strip">
    <div class="company-intro">
      <strong>${CO.name}</strong> — ${CO.mission}<br>
      Founded by <strong>${CO.founder}</strong> · Serving small business owners, especially Latino &amp; Hispanic entrepreneurs.
    </div>
    <div>
      <div style="font-size:6pt;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:${P.muted};margin-bottom:2mm;">What We Build For You</div>
      <div class="services-row">
        ${CO.services.map(s => `<span class="svc-pill">${s}</span>`).join('')}
      </div>
    </div>
  </div>

  <!-- THREE COLUMNS -->
  <div class="body-cols">

    <!-- CHALLENGES -->
    <div class="col col-challenges">
      <div class="col-head">✕ Your Challenges</div>
      <ul class="pain-list">
        ${ind.pains.map(p => `
          <li class="pain-item">
            <span class="pain-icon">${p.icon}</span>
            <span>${p.text}</span>
          </li>`).join('')}
      </ul>
    </div>

    <!-- SOLUTIONS -->
    <div class="col col-solutions">
      <div class="col-head">✓ ValuConnect Fixes This</div>
      <ul class="sol-list">
        ${ind.solutions.map(s => `
          <li class="sol-item">
            <span class="sol-check">›</span>
            <span>${s.text}</span>
          </li>`).join('')}
      </ul>
    </div>

    <!-- RESULTS -->
    <div class="col col-results">
      <div class="col-head">📊 Your Results</div>
      <div class="metrics-grid">
        ${ind.metrics.map(m => `
          <div class="metric-chip">
            <div class="metric-num">${m.num}</div>
            <div class="metric-label">${m.label.replace(/\n/g,'<br>')}</div>
          </div>`).join('')}
      </div>
      <div class="chart-section">
        <div class="chart-section-head">Weekly admin hours — before vs. after</div>
        ${svgBarChart(ind)}
        <div class="donut-row">
          ${svgDonut(ind)}
          <div class="donut-label">
            <strong>${ind.donutPct}%</strong><br>
            reduction in admin time — every week, permanently.
          </div>
        </div>
      </div>
    </div>

  </div><!-- /body-cols -->

  <!-- QUOTE BAND -->
  <div class="quote-band">
    <div class="quote-mark">"</div>
    <div class="quote-body">
      <div class="quote-text">${ind.quote.replace(/^"|"$/g,'')}</div>
      <div class="quote-attr">${ind.quoteAttr}</div>
    </div>
  </div>

  <!-- CTA BAND -->
  <div class="cta-band">
    <div class="cta-left">
      <div class="cta-headline">Ready to stop running your business on paper?</div>
      <div class="cta-sub">Book a free 30-minute workflow assessment with ${CO.founder} — no commitment, no jargon.</div>
    </div>
    <div class="cta-right">
      <div class="cta-url">${CO.url}</div>
      <div class="cta-lang">Hablamos tu idioma · We speak your language</div>
    </div>
  </div>

  <!-- PROCESS FOOTER -->
  <div class="process-footer">
    <div class="proc-label">How it works</div>
    <div class="proc-steps">
      ${CO.process.map((p, i) => `
        <div class="proc-step">
          <div class="proc-num">${i + 1}</div>
          <div class="proc-text">${p}</div>
        </div>
        ${i < CO.process.length - 1 ? '<div class="proc-arrow">›</div>' : ''}`).join('')}
    </div>
    <div class="founder-note">Bilingual EN/ES · ${CO.name}</div>
  </div>

</div><!-- /page -->
</body>
</html>`;
}

// ─────────────────────────────────────────────────────────────────────────────
// RUN
// ─────────────────────────────────────────────────────────────────────────────
const PILOT_SLUG = 'restaurants'; // set null for all 8

const targets = PILOT_SLUG
  ? INDUSTRIES.filter(i => i.id === PILOT_SLUG)
  : INDUSTRIES;

for (const ind of targets) {
  const html = buildOnePager(ind);
  const file = path.join(OUT, `onepager-${ind.id}.html`);
  fs.writeFileSync(file, html);
  console.log(`✓  onepager-${ind.id}.html`);
}

if (PILOT_SLUG) {
  console.log('\n📋 PILOT — Restaurants only. Set PILOT_SLUG = null to generate all 8.');
} else {
  console.log(`\n🎉 ${targets.length} one-pagers → presentations/output/onepager-[industry].html`);
}
console.log('\nTo PDF: Chrome → File → Print → Save as PDF | A4 Portrait | Background graphics ON | Margins = None');
