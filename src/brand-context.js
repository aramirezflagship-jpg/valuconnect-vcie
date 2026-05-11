const brand = require('../config/brand.json');

function getSystemPrompt() {
  return brand.system_prompt;
}

function getBrandContext(industry) {
  return {
    company: brand.company,
    founder: brand.founder,
    mascot: brand.mascot,
    mission_en: brand.mission_en,
    mission_es: brand.mission_es,
    tone: brand.tone.join(', '),
    anti_tone: brand.anti_tone.join(', '),
    services: brand.services.join(', '),
    content_pillars: brand.content_pillars.map(p => p.name).join(', '),
    required_hashtags_es: brand.hashtags.always_include_es.join(' '),
    industry_pain_points: industry?.pain_points || [],
    industry_solutions: industry?.solutions || [],
    industry_results: industry?.results || [],
    industry_quote: industry?.quote || '',
    industry_quote_attr: industry?.quote_attr || ''
  };
}

function buildIndustryPrompt(topic, industry) {
  const ctx = getBrandContext(industry);
  return `
BRAND CONTEXT:
Company: ${ctx.company} | Founder: ${ctx.founder} | Mascot: ${ctx.mascot}
Tone: ${ctx.tone} | Anti-tone: ${ctx.anti_tone}
Services: ${ctx.services}
Required ES hashtags: ${ctx.required_hashtags_es}

VIRAL TOPIC TO LEVERAGE:
"${topic.title}" (${topic.source} | Outlier Score: ${topic.outlierScore})
Angle: ${topic.angle}
Hook: ${topic.hook}

INDUSTRY MATCH: ${industry.name} (${industry.name_es})
Pain Points:
${industry.pain_points.map((p, i) => `${i + 1}. ${p}`).join('\n')}

Solutions:
${industry.solutions.map((s, i) => `${i + 1}. ${s}`).join('\n')}

Results Achieved: ${industry.results.join(' | ')}

Client Quote: "${industry.quote}" — ${industry.quote_attr}
`.trim();
}

module.exports = { getSystemPrompt, getBrandContext, buildIndustryPrompt };
