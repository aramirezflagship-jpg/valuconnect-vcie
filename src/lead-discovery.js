require('dotenv').config();
const axios = require('axios');
const Anthropic = require('@anthropic-ai/sdk');
const logger = require('./logger');
const industriesData = require('../config/industries.json');
const { extractSignals } = require('./lead-enrichment');

const FIRECRAWL_API = 'https://api.firecrawl.dev/v1';
const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const RESEARCH_MODEL = process.env.RESEARCH_MODEL || 'claude-haiku-4-5-20251001';

function getFirecrawlKey() { return process.env.FIRECRAWL_API_KEY; }

// ─── Industry search keyword map ──────────────────────────────────────────────

const INDUSTRY_KEYWORDS = {
  'restaurants':           ['restaurant', 'cocina', 'comida', 'cafeteria', 'bakery', 'cafe'],
  'retail':                ['boutique', 'tienda', 'store', 'clothing store', 'shop'],
  'construction':          ['contractor', 'contratista', 'construction', 'renovation', 'remodelacion'],
  'health-wellness':       ['salon masajes', 'physical therapy', 'clinic', 'spa', 'wellness center'],
  'real-estate':           ['property management', 'real estate', 'bienes raices', 'landlord'],
  'professional-services': ['accountant', 'contador', 'CPA', 'law firm', 'abogado', 'consultant'],
  'salons-beauty':         ['salon', 'beauty', 'barberia', 'barbershop', 'nail salon', 'peluqueria'],
  'logistics':             ['delivery', 'courier', 'transport', 'logistics', 'envios', 'mensajeria']
};

// ─── Firecrawl helpers ────────────────────────────────────────────────────────

async function fcSearch(query, limit = 8) {
  const key = getFirecrawlKey();
  if (!key) throw new Error('FIRECRAWL_API_KEY not set in .env');

  const res = await axios.post(`${FIRECRAWL_API}/search`,
    { query, limit },
    { headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' }, timeout: 30000 }
  );
  return res.data?.data || [];
}

/**
 * Scrape a page for both markdown and raw HTML.
 *
 * The HTML is what makes deterministic enrichment possible - schema.org blocks,
 * script tags and tel: links are stripped out of markdown. onlyMainContent is
 * off for the HTML because the signals we want (booking widgets, chat, pixels,
 * JSON-LD) live in <head> and the footer, which "main content" discards.
 */
async function fcScrape(url) {
  const key = getFirecrawlKey();
  if (!key) throw new Error('FIRECRAWL_API_KEY not set in .env');

  try {
    const res = await axios.post(`${FIRECRAWL_API}/scrape`,
      { url, formats: ['markdown', 'rawHtml'], onlyMainContent: false, timeout: 15000 },
      { headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' }, timeout: 25000 }
    );
    const data = res.data?.data || {};
    const markdown = data.markdown || null;
    if (!markdown && !data.rawHtml) return null;
    return { markdown, html: data.rawHtml || data.html || '' };
  } catch (err) {
    logger.warn(`Firecrawl scrape failed for ${url}: ${err.message}`);
    return null;
  }
}

// ─── Lead extraction via Claude ───────────────────────────────────────────────

async function extractLead(url, content, industryId, city, country) {
  const industryList = industriesData.industries.map(i => `${i.id}: ${i.name}`).join(', ');
  const industry = industriesData.industries.find(i => i.id === industryId);

  const prompt = `You are a lead qualification analyst for ValuConnect Solutions, which helps small businesses go from paper-based manual operations to digital automated workflows.

Analyze this business web page content and extract lead intelligence. The business should be in the ${industry?.name || industryId} industry in ${city}, ${country}.

URL: ${url}
CONTENT:
${(content || '').slice(0, 4000)}

If this page does NOT represent an actual small business (e.g. it's a news article, directory listing, or unrelated business), return { "skip": true }.

Otherwise return ONLY valid JSON:
{
  "skip": false,
  "businessName": "<exact business name or null>",
  "ownerName": "<owner/founder name if visible or null>",
  "industryId": "<best match from: ${industryList} — or null>",
  "location": "<city, state/country if visible or null>",
  "phone": "<phone number if visible or null>",
  "email": "<email if visible or null>",
  "website": "${url}",
  "instagram": "<instagram URL or handle if visible or null>",
  "facebook": "<facebook URL or handle if visible or null>",
  "size": "<size clues: years open, staff count — or null>",
  "currentTools": "<any tech, booking, POS mentioned — or null>",
  "challenge_signals": ["<list operational pain signals: WhatsApp only, call to book, paper, manual, no online booking>"],
  "digital_presence": "<professional|basic|minimal|none — based on site quality>",
  "lead_score": <0-100 integer — HIGH score means MORE manual operations, LOW means already digital>,
  "lead_quality": "<HIGH|MEDIUM|LOW>",
  "why_valuconnect": "<1 sentence: specific reason this business needs ValuConnect based on visible signals>",
  "opening_message": "<warm, specific first message Andres could send — references something specific on the page>"
}

Scoring guide:
- 80-100 (HIGH): WhatsApp/phone only for booking, no online system, paper/manual mentions, basic/no website
- 50-79 (MEDIUM): Basic website but no booking system, limited digital tools
- 0-49 (LOW): Has booking software, e-commerce, already uses digital systems — not a fit right now`;

  try {
    const response = await client.messages.create({
      model: RESEARCH_MODEL,
      max_tokens: 800,
      messages: [{ role: 'user', content: prompt }]
    });
    const raw = response.content[0].text;
    const s = raw.indexOf('{'), e = raw.lastIndexOf('}');
    const parsed = JSON.parse(s !== -1 && e !== -1 ? raw.slice(s, e + 1) : raw);
    if (parsed.skip) return null;
    return { ...parsed, sourceUrl: url };
  } catch (err) {
    logger.warn(`Lead extraction failed for ${url}: ${err.message}`);
    return null;
  }
}

// ─── Deduplicate URLs ─────────────────────────────────────────────────────────

function dedupeUrls(results) {
  const seen = new Set();
  const skip = /\.(pdf|jpg|png|gif|svg)$/i;
  const skipDomains = /google\.|yelp\.|facebook\.|instagram\.|tripadvisor\.|yellowpages\.|mapquest\.|foursquare\.|linkedin\./i;
  return results
    .map(r => r.url || r)
    .filter(u => {
      if (!u || skip.test(u) || skipDomains.test(u)) return false;
      try { const h = new URL(u).hostname; if (seen.has(h)) return false; seen.add(h); return true; } catch { return false; }
    });
}

// ─── Main discovery function ──────────────────────────────────────────────────

async function discoverLeads({
  industryId,
  city,
  country = '',
  limit = 10,
  minScore = 40,
  onProgress = null
}) {
  const keywords = INDUSTRY_KEYWORDS[industryId] || [industryId];
  const locationStr = [city, country].filter(Boolean).join(', ');

  // Build search queries (primary + fallbacks)
  const queries = [
    `${keywords[0]} small business ${locationStr}`,
    `${keywords[1] || keywords[0]} ${city} contact`,
    `${keywords[0]} local ${locationStr} appointment phone`,
  ];

  const emit = (msg, data = {}) => {
    if (onProgress) onProgress({ message: msg, ...data });
    logger.info(`[LeadDiscovery] ${msg}`);
  };

  emit(`Searching for ${industryId} businesses in ${locationStr}…`);

  // 1 — Collect search result URLs
  let rawUrls = [];
  for (const q of queries) {
    try {
      const results = await fcSearch(q, 6);
      rawUrls.push(...results);
    } catch (err) {
      emit(`Search query failed: ${err.message}`);
    }
  }

  const urls = dedupeUrls(rawUrls).slice(0, limit * 2);
  emit(`Found ${urls.length} candidate pages — qualifying…`, { total: urls.length });

  if (!urls.length) return [];

  // 2 — Scrape + score each URL
  const leads = [];
  let processed = 0;

  for (const url of urls) {
    if (leads.length >= limit) break;
    processed++;
    emit(`Analyzing ${new URL(url).hostname} (${processed}/${urls.length})…`, { current: processed });

    const page = await fcScrape(url);
    if (!page) continue;

    const lead = await extractLead(url, page.markdown, industryId, city, country);
    if (!lead) continue;
    if ((lead.lead_score || 0) < minScore) continue;
    if (!lead.businessName) continue;

    // Deterministic signals from the raw HTML. These are facts, so they OVERRIDE
    // anything the model inferred about booking, contact details or ratings.
    try {
      const signals = extractSignals(page.html, page.markdown, url);
      lead.signals = signals;
      lead.phone = signals.phone || lead.phone;
      lead.email = signals.email || lead.email;
      lead.businessName = lead.businessName || signals.businessName;
      lead.city = signals.city || lead.city || city;
      lead.address = signals.address || null;
      if (signals.painQuotes?.length) {
        lead.challenge_signals = [...new Set([...(lead.challenge_signals || []), ...signals.painQuotes])];
      }
    } catch (err) {
      logger.warn(`Enrichment failed for ${url}: ${err.message}`); // the lead is still worth having
    }

    leads.push(lead);
    emit(`✓ ${lead.businessName} — Score: ${lead.lead_score} (${lead.lead_quality})`, { lead });
  }

  // 3 — Sort by score descending
  leads.sort((a, b) => (b.lead_score || 0) - (a.lead_score || 0));

  emit(`Discovery complete — ${leads.length} qualified leads found`, { done: true, count: leads.length });
  return leads;
}

module.exports = { discoverLeads };
