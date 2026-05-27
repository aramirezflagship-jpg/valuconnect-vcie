const fs = require('fs');
const path = require('path');
const industries = require('../config/industries.json').industries;

const industriesDir = path.join(__dirname, 'industries');

industries.forEach(function(ind) {
  const filePath = path.join(industriesDir, ind.id + '.html');
  if (!fs.existsSync(filePath)) {
    console.log('SKIP (not found):', ind.id);
    return;
  }

  let html = fs.readFileSync(filePath, 'utf8');

  // Inject pain point text into empty <p data-i18n="pain.N"></p> tags
  ind.pain_points.forEach(function(text, i) {
    const empty = new RegExp('(<p data-i18n="pain\\.' + i + '")>\\s*<\\/p>', 'g');
    html = html.replace(empty, '$1>' + text + '</p>');
  });

  // Inject solution text into empty <p data-i18n="sol.N"></p> tags
  ind.solutions.forEach(function(text, i) {
    const empty = new RegExp('(<p data-i18n="sol\\.' + i + '")>\\s*<\\/p>', 'g');
    html = html.replace(empty, '$1>' + text + '</p>');
  });

  // Add scripts before </body> if not already present
  if (!html.includes('assets/js/translations.js')) {
    html = html.replace(
      '</body>',
      '  <script src="../assets/js/translations.js"></script>\n' +
      '  <script src="../assets/js/main.js"></script>\n' +
      '</body>'
    );
  }

  fs.writeFileSync(filePath, html, 'utf8');
  console.log('FIXED:', ind.id);
});

console.log('Done.');
