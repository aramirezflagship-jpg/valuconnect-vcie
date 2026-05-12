const fs = require('fs');
const path = require('path');
const industries = require('../config/industries.json').industries;

const icons = { restaurants:'🍽️', retail:'🛍️', construction:'🏗️', 'health-wellness':'🏥', 'real-estate':'🏠', 'professional-services':'💼', 'salons-beauty':'✂️', logistics:'🚚' };

const content = {
  restaurants: {
    situation: {
      en: 'A family-owned restaurant manages supplier invoices, staff schedules, and compliance records entirely on paper. The owner spends 6+ hours every week hunting for receipts, manually reconciling deliveries, and rewriting schedules by hand. Health inspection records live in a shoebox.',
      es: 'Un restaurante familiar maneja facturas de proveedores, horarios de personal y registros de cumplimiento completamente en papel. El dueño pasa más de 6 horas cada semana buscando recibos, conciliando entregas manualmente y reescribiendo horarios a mano. Los registros de inspección de salud viven en una caja de zapatos.'
    },
    hero: { en: 'Still managing your restaurant on paper?', es: '¿Todavía manejando tu restaurante en papel?' }
  },
  retail: {
    situation: {
      en: 'A clothing boutique tracks inventory on handwritten cards and places supplier orders by phone. The owner cannot tell which items are low stock until she physically walks the floor — causing missed sales on popular items and overordering on slow movers.',
      es: 'Una boutique de ropa registra el inventario en tarjetas escritas a mano y hace pedidos a proveedores por teléfono. El dueño no puede saber qué artículos tienen poco stock hasta que físicamente recorre el local — causando ventas perdidas y pedidos excesivos.'
    },
    hero: { en: 'Still tracking your inventory on paper cards?', es: '¿Todavía rastreando tu inventario en tarjetas de papel?' }
  },
  construction: {
    situation: {
      en: 'A small general contractor manages 4 active job sites with paper work orders, handwritten timesheets, and subcontractor invoices stored in a folder in the truck. Billing delays of 2–3 weeks are common because documents get lost between the job site and the office.',
      es: 'Un contratista general maneja 4 obras activas con órdenes de trabajo en papel, hojas de horas escritas a mano y facturas de subcontratistas en una carpeta en el camión. Los retrasos de facturación de 2 a 3 semanas son comunes porque los documentos se pierden entre la obra y la oficina.'
    },
    hero: { en: 'Still running your job sites on paper?', es: '¿Todavía manejando tus obras en papel?' }
  },
  'health-wellness': {
    situation: {
      en: 'A physical therapy clinic stores patient intake forms in filing cabinets and manages scheduling in a shared paper appointment book. Insurance pre-authorization requests are faxed and tracked with sticky notes on a whiteboard — requests regularly fall through the cracks.',
      es: 'Una clínica de fisioterapia guarda los formularios de admisión en archiveros y maneja las citas en una agenda de papel compartida. Las solicitudes de preautorización de seguros se rastrean con notas adhesivas en una pizarra — regularmente se pierden.'
    },
    hero: { en: 'Still managing patient records on paper?', es: '¿Todavía manejando registros de pacientes en papel?' }
  },
  'real-estate': {
    situation: {
      en: 'A property management company handles 40 rental units with paper lease agreements, handwritten maintenance logs, and rent payments tracked in a spreadsheet that three people update manually — causing version conflicts, missed renewals, and tenant disputes.',
      es: 'Una empresa de administración de propiedades maneja 40 unidades con contratos de arrendamiento en papel, registros de mantenimiento escritos a mano y pagos de renta en una hoja de cálculo que tres personas actualizan manualmente — causando conflictos, renovaciones perdidas y disputas con inquilinos.'
    },
    hero: { en: 'Still managing your properties on paper?', es: '¿Todavía administrando tus propiedades en papel?' }
  },
  'professional-services': {
    situation: {
      en: 'A small accounting firm stores client tax documents in physical folders by year. Each tax season, staff spend two full weeks just locating and organizing documents. Client communication is tracked in a shared Gmail inbox with no assignment system — no one knows who is handling which client.',
      es: 'Un despacho de contabilidad guarda los documentos fiscales en carpetas físicas por año. Cada temporada de impuestos, el personal pasa dos semanas completas solo localizando y organizando documentos. La comunicación con clientes se rastrea en un Gmail compartido sin sistema de asignación.'
    },
    hero: { en: 'Still managing client documents in physical folders?', es: '¿Todavía manejando documentos de clientes en carpetas físicas?' }
  },
  'salons-beauty': {
    situation: {
      en: 'A hair salon runs on a paper appointment book that gets erased and rewritten daily. Client preferences, color formulas, and service history exist only in each stylist\'s memory. When a top stylist leaves, that knowledge — and often the clients — walk out the door.',
      es: 'Un salón de cabello funciona con una agenda de papel que se borra y reescribe diariamente. Las preferencias de los clientes, fórmulas de color e historial de servicios solo existen en la memoria de cada estilista. Cuando un estilista se va, ese conocimiento — y a menudo los clientes — se van con él.'
    },
    hero: { en: 'Still running your salon on a paper appointment book?', es: '¿Todavía manejando tu salón con una agenda de papel?' }
  },
  logistics: {
    situation: {
      en: 'A small delivery company dispatches drivers by phone call and tracks deliveries on a paper manifest. Proof of delivery is a photo texted to a group WhatsApp chat. Customer disputes about missed or damaged deliveries are nearly impossible to resolve — there is no clean audit trail.',
      es: 'Una pequeña empresa de entregas despacha conductores por llamada telefónica y rastrea las entregas en un manifiesto de papel. El comprobante de entrega es una foto enviada a un chat grupal de WhatsApp. Las disputas de clientes son casi imposibles de resolver — no hay un rastro de auditoría claro.'
    },
    hero: { en: 'Still dispatching drivers by phone call?', es: '¿Todavía despachando conductores por llamada telefónica?' }
  }
};

const relatedMap = {
  restaurants: ['retail','construction','health-wellness'],
  retail: ['restaurants','salons-beauty','logistics'],
  construction: ['real-estate','professional-services','logistics'],
  'health-wellness': ['professional-services','salons-beauty','retail'],
  'real-estate': ['construction','professional-services','logistics'],
  'professional-services': ['real-estate','health-wellness','construction'],
  'salons-beauty': ['retail','restaurants','health-wellness'],
  logistics: ['construction','retail','real-estate']
};

function buildIndustryTranslations(ind) {
  const c = content[ind.id];
  return `
  en: {
    'page.hero': '${c.hero.en}',
    'page.situation.label': 'The Situation Before ValuConnect',
    'page.situation.title': 'Sound familiar?',
    'page.situation.body': '${c.situation.en.replace(/'/g, "\\'")}',
    'page.ps.label': 'Pain points → Solutions',
    'page.pain.title': '❌ Pain Points',
    'page.sol.title': '✅ ValuConnect Solutions',
    'page.results.label': 'Results Achieved',
    'page.results.title': 'What changes after ValuConnect',
    'page.quote.attr': '${ind.quote_attr}',
    'page.cta.title': 'Ready to transform your business?',
    'page.cta.sub': 'Book your free 30-minute workflow assessment. No tech knowledge required.',
    'page.related.title': 'Related industries',
    ${ind.pain_points.map((p,i) => `'pain.${i}': '${p.replace(/'/g, "\\'")}'`).join(',\n    ')},
    ${ind.solutions.map((s,i) => `'sol.${i}': '${s.replace(/'/g, "\\'")}'`).join(',\n    ')},
    ${ind.results.map((r,i) => `'result.${i}': '${r.replace(/'/g, "\\'")}'`).join(',\n    ')},
    'page.quote': '"${ind.quote.replace(/'/g, "\\'")}"',
    'page.name': '${ind.name}',
    'page.name.es': '${ind.name_es}'
  },
  es: {
    'page.hero': '${c.hero.es}',
    'page.situation.label': 'La Situación Antes de ValuConnect',
    'page.situation.title': '¿Te suena familiar?',
    'page.situation.body': '${c.situation.es.replace(/'/g, "\\'")}',
    'page.ps.label': 'Problemas → Soluciones',
    'page.pain.title': '❌ Problemas',
    'page.sol.title': '✅ Soluciones ValuConnect',
    'page.results.label': 'Resultados Obtenidos',
    'page.results.title': 'Qué cambia después de ValuConnect',
    'page.quote.attr': '${ind.quote_attr}',
    'page.cta.title': '¿Listo para transformar tu negocio?',
    'page.cta.sub': 'Agenda tu evaluación gratuita de 30 minutos. No se requieren conocimientos técnicos.',
    'page.related.title': 'Industrias relacionadas',
    ${ind.pain_points.map((p,i) => `'pain.${i}': '${p.replace(/'/g, "\\'")}'`).join(',\n    ')},
    ${ind.solutions.map((s,i) => `'sol.${i}': '${s.replace(/'/g, "\\'")}'`).join(',\n    ')},
    ${ind.results.map((r,i) => `'result.${i}': '${r.replace(/'/g, "\\'")}'`).join(',\n    ')},
    'page.quote': '"${ind.quote.replace(/'/g, "\\'")}"',
    'page.name': '${ind.name_es}',
    'page.name.es': '${ind.name_es}'
  }`;
}

function buildPage(ind) {
  const icon = icons[ind.id];
  const related = relatedMap[ind.id].map(id => industries.find(i => i.id === id));
  const painItems  = ind.pain_points.map((_, i) => `<div class="ps-item"><div class="dot"></div><p data-i18n="pain.${i}"></p></div>`).join('');
  const solItems   = ind.solutions.map((_, i) => `<div class="ps-item"><div class="dot"></div><p data-i18n="sol.${i}"></p></div>`).join('');
  const resultChips = ind.results.map((_, i) => `<div class="result-chip"><div class="metric">✓</div><p data-i18n="result.${i}"></p></div>`).join('');
  const relatedHTML = related.map(r => `<a href="${r.id}.html" class="industry-card"><div class="industry-icon">${icons[r.id]}</div><h3 data-i18n="i.${r.id}.name">${r.name}</h3><p data-i18n="i.${r.id}.desc"></p><span class="arrow">→</span></a>`).join('');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1.0"/>
  <title>${ind.name} — ValuConnect Solutions</title>
  <meta name="description" content="See how ValuConnect helps ${ind.name.toLowerCase()} businesses go digital. ${ind.results[0]}.">
  <link rel="stylesheet" href="../css/style.css"/>
  <script>
const translations = {
  ${buildIndustryTranslations(ind)}
};
  </script>
  <script src="../js/lang.js" defer></script>
</head>
<body>

<div class="lang-bar"><div class="container">
  <button class="lang-btn active" data-l="en">EN</button>
  <button class="lang-btn" data-l="es">ES</button>
</div></div>

<nav><div class="container">
  <a href="../index.html" class="nav-logo">Valu<span>Connect</span></a>
  <div class="nav-links">
    <a href="../index.html#industries">Industries</a>
    <a href="../index.html#services">Services</a>
    <a href="../index.html#about">About</a>
  </div>
  <a href="../index.html#contact" class="nav-cta">Book Free Call</a>
</div></nav>

<div class="industry-hero"><div class="container">
  <div class="badge">${icon} <span data-i18n="page.name">${ind.name}</span></div>
  <h1 data-i18n="page.hero">${content[ind.id].hero.en}</h1>
  <p class="subtitle">${ind.results.join(' &nbsp;·&nbsp; ')}</p>
</div></div>

<section><div class="container">
  <div class="section-header">
    <div class="section-label" data-i18n="page.situation.label">The Situation Before ValuConnect</div>
    <h2 class="section-title" data-i18n="page.situation.title">Sound familiar?</h2>
  </div>
  <div class="situation"><p data-i18n="page.situation.body">${content[ind.id].situation.en}</p></div>
</div></section>

<section class="bg-gray"><div class="container">
  <div class="section-header">
    <h2 class="section-title" data-i18n="page.ps.label">Pain points → ValuConnect solutions</h2>
  </div>
  <div class="ps-grid">
    <div class="ps-col pain">
      <h3 data-i18n="page.pain.title">❌ Pain Points</h3>
      ${painItems}
    </div>
    <div class="ps-col solutions">
      <h3 data-i18n="page.sol.title">✅ ValuConnect Solutions</h3>
      ${solItems}
    </div>
  </div>
</div></section>

<section><div class="container">
  <div class="section-header">
    <div class="section-label" data-i18n="page.results.label">Results Achieved</div>
    <h2 class="section-title" data-i18n="page.results.title">What changes after ValuConnect</h2>
  </div>
  <div class="results-grid">${resultChips}</div>
</div></section>

<section class="bg-gray"><div class="container">
  <div class="quote-block">
    <blockquote data-i18n="page.quote">"${ind.quote}"</blockquote>
    <div class="quote-attr" data-i18n="page.quote.attr">${ind.quote_attr}</div>
  </div>
</div></section>

<div class="cta-banner"><div class="container">
  <h2 data-i18n="page.cta.title">Ready to transform your business?</h2>
  <p data-i18n="page.cta.sub">Book your free 30-minute workflow assessment. No tech knowledge required.</p>
  <a href="mailto:andres@valuconnect.com" class="btn-navy">Book Your Free Call</a>
</div></div>

<section><div class="container">
  <div class="section-header">
    <h2 class="section-title" data-i18n="page.related.title">Related industries</h2>
  </div>
  <div class="related-grid">${relatedHTML}</div>
</div></section>

<footer><div class="container">
  <p>© 2026 <strong>ValuConnect Solutions</strong> · Andres Ramirez · <span data-i18n="footer.tagline">Bilingual small business operations partner</span></p>
</div></footer>
</body>
</html>`;
}

const outDir = path.join(__dirname, 'industries');
fs.mkdirSync(outDir, { recursive: true });
industries.forEach(ind => {
  fs.writeFileSync(path.join(outDir, `${ind.id}.html`), buildPage(ind), 'utf8');
  console.log(`Built: industries/${ind.id}.html`);
});
console.log(`\nDone — ${industries.length} industry pages built.`);
