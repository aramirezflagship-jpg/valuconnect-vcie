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

  // Inject English pain point text into <p data-i18n="pain.N"> tags
  ind.pain_points.forEach(function(text, i) {
    const re = new RegExp('(<p data-i18n="pain\\.' + i + '")>[^<]*<\\/p>', 'g');
    html = html.replace(re, '$1>' + text + '</p>');
  });

  // Inject English solution text into <p data-i18n="sol.N"> tags
  ind.solutions.forEach(function(text, i) {
    const re = new RegExp('(<p data-i18n="sol\\.' + i + '")>[^<]*<\\/p>', 'g');
    html = html.replace(re, '$1>' + text + '</p>');
  });

  // Build per-page Spanish translations inline script
  const esEntries = [];
  (ind.pain_points_es || []).forEach(function(text, i) {
    esEntries.push("    'pain." + i + "': \"" + text.replace(/"/g, '\\"') + '"');
  });
  (ind.solutions_es || []).forEach(function(text, i) {
    esEntries.push("    'sol." + i + "': \"" + text.replace(/"/g, '\\"') + '"');
  });

  const inlineScript = esEntries.length
    ? '<script>\n(function(){\n  var d = {\n' + esEntries.join(',\n') + '\n  };\n' +
      "  document.addEventListener('DOMContentLoaded', function() {\n" +
      "    if (typeof i18n !== 'undefined') Object.assign(i18n.es, d);\n" +
      '  });\n})();\n</script>\n'
    : '';

  // Remove any previously injected inline script block before re-adding
  html = html.replace(/<script>\n\(function\(\)\{[\s\S]*?\}\)\(\);\n<\/script>\n\s*/g, '');

  // Add scripts + inline block before </body>
  if (!html.includes('assets/js/translations.js')) {
    html = html.replace(
      '</body>',
      '  ' + inlineScript +
      '  <script src="../assets/js/translations.js"></script>\n' +
      '  <script src="../assets/js/main.js"></script>\n' +
      '</body>'
    );
  } else {
    // Already has scripts — insert inline block before translations.js
    html = html.replace(
      /(\s*<script src="\.\.\/assets\/js\/translations\.js"><\/script>)/,
      '\n  ' + inlineScript + '$1'
    );
  }

  fs.writeFileSync(filePath, html, 'utf8');
  console.log('FIXED:', ind.id);
});

console.log('Done.');
