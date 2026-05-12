const fs = require('fs');
const path = require('path');
const industries = require('../config/industries.json').industries;

const icons = { restaurants:'🍽️', retail:'🛍️', construction:'🏗️', 'health-wellness':'🏥', 'real-estate':'🏠', 'professional-services':'💼', 'salons-beauty':'✂️', logistics:'🚚' };

const situationES = {
  restaurants: 'Un restaurante familiar maneja facturas de proveedores, horarios de personal y registros de cumplimiento completamente en papel. El dueño pasa más de 6 horas cada semana buscando recibos, conciliando entregas manualmente y reescribiendo horarios a mano.',
  retail: 'Una boutique de ropa registra el inventario en tarjetas escritas a mano y hace pedidos a proveedores por teléfono. El dueño no sabe qué artículos tienen poco stock hasta que físicamente recorre el local.',
  construction: 'Un contratista general maneja 4 obras activas con órdenes de trabajo en papel, hojas de horas escritas a mano y facturas de subcontratistas en una carpeta en el camión. Los retrasos de facturación de 2 a 3 semanas son comunes.',
  'health-wellness': 'Una clínica de fisioterapia guarda los formularios de admisión en archiveros y maneja las citas en una agenda de papel compartida. Las solicitudes de preautorización de seguros se rastrean con notas adhesivas en una pizarra.',
  'real-estate': 'Una empresa de administración de propiedades maneja 40 unidades con contratos de arrendamiento en papel, registros de mantenimiento escritos a mano y pagos de renta en una hoja de cálculo que tres personas actualizan manualmente.',
  'professional-services': 'Un despacho de contabilidad guarda los documentos fiscales de clientes en carpetas físicas por año. Cada temporada de impuestos, el personal pasa dos semanas completas solo localizando y organizando documentos.',
  'salons-beauty': 'Un salón de cabello funciona con una agenda de papel que se borra y reescribe diariamente. Las preferencias de los clientes, fórmulas de color e historial de servicios solo existen en la memoria de cada estilista.',
  logistics: 'Una pequeña empresa de entregas despacha conductores por llamada telefónica y rastrea las entregas en un manifiesto de papel. El comprobante de entrega es una foto enviada a un chat grupal de WhatsApp.'
};

const situationEN = {
  restaurants: 'A family-owned restaurant manages supplier invoices, staff schedules, and compliance records entirely on paper. The owner spends 6+ hours every week hunting for receipts, manually reconciling deliveries, and rewriting schedules by hand.',
  retail: 'A clothing boutique tracks inventory on handwritten cards and places supplier orders by phone. The owner cannot tell which items are low stock until she physically walks the floor — causing missed sales and overordering.',
  construction: 'A small general contractor manages 4 active job sites with paper work orders, handwritten timesheets, and subcontractor invoices stored in a folder in the truck. Billing delays of 2–3 weeks are common.',
  'health-wellness': 'A physical therapy clinic stores patient intake forms in filing cabinets and manages scheduling in a shared paper appointment book. Insurance pre-authorization requests are faxed and tracked with sticky notes on a whiteboard.',
  'real-estate': 'A property management company handles 40 rental units with paper lease agreements, handwritten maintenance logs, and rent payments tracked in a spreadsheet that three people update manually.',
  'professional-services': 'A small accounting firm stores client tax documents in physical folders by year. Each tax season, staff spend two full weeks just locating and organizing documents sent by mail or email.',
  'salons-beauty': 'A hair salon runs on a paper appointment book that gets erased and rewritten daily. Client preferences, color formulas, and service history exist only in each stylist\'s memory.',
  logistics: 'A small delivery company dispatches drivers by phone call and tracks deliveries on a paper manifest. Proof of delivery is a photo texted to a group WhatsApp chat.'
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

function buildPage(ind) {
  const icon = icons[ind.id] || '🏢';
  const related = relatedMap[ind.id].map(id => industries.find(i => i.id === id));

  const painItemsEN = ind.pain_points.map(p => `<div class="ps-item"><div class="dot"></div><p>${p}</p></div>`).join('');
  const solItemsEN  = ind.solutions.map(s => `<div class="ps-item"><div class="dot"></div><p>${s}</p></div>`).join('');
  const resultsHTML = ind.results.map(r => `<div class="result-chip"><div class="metric">✓</div><p>${r}</p></div>`).join('');
  const relatedHTML = related.map(r => `<a href="${r.id}.html" class="industry-card"><div class="industry-icon">${icons[r.id]}</div><h3 data-lang="en">${r.name}</h3><h3 data-lang="es">${r.name_es}</h3><span class="arrow">→</span></a>`).join('');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1.0"/>
  <title>${ind.name} — ValuConnect Solutions</title>
  <meta name="description" content="See how ValuConnect helps ${ind.name.toLowerCase()} businesses go digital. ${ind.results[0]}.">
  <link rel="stylesheet" href="../css/style.css"/>
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
    <a href="../index.html#industries"><span data-lang="en">Industries</span><span data-lang="es">Industrias</span></a>
    <a href="../index.html#services"><span data-lang="en">Services</span><span data-lang="es">Servicios</span></a>
    <a href="../index.html#about"><span data-lang="en">About</span><span data-lang="es">Nosotros</span></a>
  </div>
  <a href="../index.html#contact" class="nav-cta"><span data-lang="en">Book Free Call</span><span data-lang="es">Llamada Gratis</span></a>
</div></nav>

<div class="industry-hero"><div class="container">
  <div class="badge">${icon} <span data-lang="en">${ind.name}</span><span data-lang="es">${ind.name_es}</span></div>
  <h1 data-lang="en">Still running your ${ind.name.split('&')[0].trim().toLowerCase()} on paper?</h1>
  <h1 data-lang="es">¿Todavía operando tu negocio en papel?</h1>
  <p class="subtitle" data-lang="en">${ind.results.join(' · ')}</p>
  <p class="subtitle" data-lang="es">Resultados reales para negocios como el tuyo — sin papeleo, sin caos.</p>
</div></div>

<section><div class="container">
  <div class="section-header">
    <div class="section-label"><span data-lang="en">The Situation Before ValuConnect</span><span data-lang="es">La Situación Antes de ValuConnect</span></div>
    <h2 class="section-title"><span data-lang="en">Sound familiar?</span><span data-lang="es">¿Te suena familiar?</span></h2>
  </div>
  <div class="situation">
    <p data-lang="en">${situationEN[ind.id]}</p>
    <p data-lang="es">${situationES[ind.id]}</p>
  </div>
</div></section>

<section class="bg-gray"><div class="container">
  <div class="section-header">
    <h2 class="section-title"><span data-lang="en">Pain points → ValuConnect solutions</span><span data-lang="es">Problemas → Soluciones ValuConnect</span></h2>
  </div>
  <div class="ps-grid">
    <div class="ps-col pain">
      <h3 data-lang="en">❌ Pain Points</h3>
      <h3 data-lang="es">❌ Problemas</h3>
      ${painItemsEN}
    </div>
    <div class="ps-col solutions">
      <h3 data-lang="en">✅ ValuConnect Solutions</h3>
      <h3 data-lang="es">✅ Soluciones ValuConnect</h3>
      ${solItemsEN}
    </div>
  </div>
</div></section>

<section><div class="container">
  <div class="section-header">
    <div class="section-label"><span data-lang="en">Results Achieved</span><span data-lang="es">Resultados Obtenidos</span></div>
    <h2 class="section-title"><span data-lang="en">What changes after ValuConnect</span><span data-lang="es">Qué cambia después de ValuConnect</span></h2>
  </div>
  <div class="results-grid">${resultsHTML}</div>
</div></section>

<section class="bg-gray"><div class="container">
  <div class="quote-block">
    <blockquote>"${ind.quote}"</blockquote>
    <div class="quote-attr">— ${ind.quote_attr}</div>
  </div>
</div></section>

<div class="cta-banner"><div class="container">
  <h2 data-lang="en">Ready to transform your ${ind.name.split('&')[0].trim().toLowerCase()}?</h2>
  <h2 data-lang="es">¿Listo para transformar tu negocio?</h2>
  <p data-lang="en">Book your free 30-minute workflow assessment. No tech knowledge required.</p>
  <p data-lang="es">Agenda tu evaluación gratuita de 30 minutos. No se requieren conocimientos técnicos.</p>
  <a href="mailto:andres@valuconnect.com" class="btn-navy"><span data-lang="en">Book Your Free Call</span><span data-lang="es">Agenda tu Llamada Gratis</span></a>
</div></div>

<section><div class="container">
  <div class="section-header">
    <h2 class="section-title"><span data-lang="en">Related industries</span><span data-lang="es">Industrias relacionadas</span></h2>
  </div>
  <div class="related-grid">${relatedHTML}</div>
</div></section>

<footer><div class="container">
  <p>© 2026 <strong>ValuConnect Solutions</strong> · Andres Ramirez · <span data-lang="en">Bilingual small business operations partner</span><span data-lang="es">Socio bilingüe de operaciones para pequeños negocios</span></p>
</div></footer>
</body>
</html>`;
}

const outDir = path.join(__dirname, 'industries');
fs.mkdirSync(outDir, { recursive: true });

industries.forEach(ind => {
  const html = buildPage(ind);
  const file = path.join(outDir, `${ind.id}.html`);
  fs.writeFileSync(file, html, 'utf8');
  console.log(`Built: industries/${ind.id}.html`);
});

console.log(`\nDone — ${industries.length} industry pages built.`);
