/**
 * Deterministic business-signal extraction.
 *
 * Everything here reads the raw HTML directly — no LLM. These are facts we can
 * point at: a script tag either loads Calendly or it does not. That matters
 * because Andres quotes these findings on a sales call, so a hallucinated
 * "they have no booking system" is worse than no finding at all.
 *
 * The LLM's job comes after, and only for prose.
 */

// ─── helpers ──────────────────────────────────────────────────────────────────

const strip = (s) => String(s || '').replace(/\s+/g, ' ').trim();

/** All JSON-LD blocks on the page, flattened (@graph included). */
function jsonLdBlocks(html) {
  const out = [];
  const re = /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let m;
  while ((m = re.exec(html))) {
    try {
      const parsed = JSON.parse(m[1].trim());
      const list = Array.isArray(parsed) ? parsed : [parsed];
      for (const item of list) {
        out.push(item);
        if (Array.isArray(item['@graph'])) out.push(...item['@graph']);
      }
    } catch { /* malformed JSON-LD is common; skip it rather than fail the crawl */ }
  }
  return out;
}

/**
 * Find the block describing the business.
 *
 * schema.org has a long tail of LocalBusiness subtypes — HVACBusiness, Plumber,
 * RoofingContractor, NailSalon, and dozens more — so enumerating them is a
 * losing game. Match the obvious ones, then anything ending in "Business", then
 * fall back to shape: a block with a name plus a phone, address or rating is a
 * business record whatever it calls itself.
 */
const BUSINESS_TYPE_RE =
  /LocalBusiness|Organization|Store|Restaurant|Dentist|Physician|Attorney|LegalService|AutoRepair|ProfessionalService|HomeAndConstructionBusiness|HealthAndBeautyBusiness|MedicalBusiness|FoodEstablishment|Plumber|Electrician|RoofingContractor|GeneralContractor|MovingCompany|Locksmith|HousePainter|LandscapingBusiness|CleaningService|BeautySalon|HairSalon|NailSalon|DaySpa|\w*Business$/i;

function looksLikeBusiness(b) {
  if (!b || typeof b !== 'object') return false;
  const t = b['@type'];
  const types = (Array.isArray(t) ? t : [t]).map(x => String(x || ''));
  if (types.some(x => BUSINESS_TYPE_RE.test(x))) return true;
  // Shape fallback for types we have never heard of.
  return Boolean(b.name && (b.telephone || b.address || b.aggregateRating));
}

function firstOfType(blocks) {
  // Prefer an explicitly typed business over a shape match.
  const typed = blocks.find(b => {
    const t = b && b['@type'];
    const types = (Array.isArray(t) ? t : [t]).map(x => String(x || ''));
    return types.some(x => BUSINESS_TYPE_RE.test(x));
  });
  return typed || blocks.find(looksLikeBusiness) || null;
}

// ─── identity ─────────────────────────────────────────────────────────────────

function extractSchemaOrg(html) {
  const blocks = jsonLdBlocks(html);
  const biz = firstOfType(blocks);
  if (!biz) return {};

  const addr = biz.address || {};
  const agg = biz.aggregateRating || {};

  const hours = Array.isArray(biz.openingHours) ? biz.openingHours.join('; ')
    : typeof biz.openingHours === 'string' ? biz.openingHours
    : Array.isArray(biz.openingHoursSpecification)
      ? biz.openingHoursSpecification.map(o =>
          `${[].concat(o.dayOfWeek || []).join(',')} ${o.opens || ''}-${o.closes || ''}`.trim()).join('; ')
      : null;

  return {
    businessName: strip(biz.name) || null,
    phone: strip(biz.telephone) || null,
    email: strip(biz.email).replace(/^mailto:/i, '') || null,
    address: strip(addr.streetAddress) || null,
    city: strip(addr.addressLocality) || null,
    state: strip(addr.addressRegion) || null,
    postalCode: strip(addr.postalCode) || null,
    hours: hours ? strip(hours) : null,
    rating: agg.ratingValue != null ? Number(agg.ratingValue) : null,
    reviewCount: agg.reviewCount != null ? Number(agg.reviewCount)
      : agg.ratingCount != null ? Number(agg.ratingCount) : null,
    priceRange: strip(biz.priceRange) || null
  };
}

/** Contact details from the markup itself, which beats guessing from prose. */
function extractContacts(html) {
  const phones = [...html.matchAll(/href=["']tel:([^"']+)["']/gi)].map(m => strip(m[1]));
  const emails = [...html.matchAll(/href=["']mailto:([^"'?]+)/gi)].map(m => strip(m[1]).toLowerCase());

  // Personal-looking inboxes are not business contacts; keep the business ones.
  const businessEmails = emails.filter(e => /^(info|contact|hello|sales|office|admin|booking|service|support)@/i.test(e));

  return {
    phone: phones[0] || null,
    phones: [...new Set(phones)],
    email: businessEmails[0] || emails[0] || null,
    emails: [...new Set(emails)]
  };
}

// ─── leak signals ─────────────────────────────────────────────────────────────

const BOOKING_VENDORS = [
  [/calendly\.com/i, 'Calendly'],
  [/acuityscheduling\.com|squarespace-scheduling/i, 'Acuity'],
  [/squareup\.com\/appointments|square\.site/i, 'Square Appointments'],
  [/housecallpro\.com/i, 'Housecall Pro'],
  [/getjobber\.com|jobber\.com/i, 'Jobber'],
  [/servicetitan\.com/i, 'ServiceTitan'],
  [/setmore\.com/i, 'Setmore'],
  [/booksy\.com/i, 'Booksy'],
  [/vagaro\.com/i, 'Vagaro'],
  [/mindbodyonline\.com/i, 'Mindbody'],
  [/schedulicity\.com/i, 'Schedulicity'],
  [/opentable\.com|resy\.com/i, 'OpenTable/Resy'],
  [/cal\.com/i, 'Cal.com'],
  [/simplybook\.me/i, 'SimplyBook'],
  [/appointlet|youcanbook\.me|tidycal/i, 'Other scheduler']
];

const CHAT_VENDORS = [
  [/intercom\.(io|com)/i, 'Intercom'],
  [/drift\.com/i, 'Drift'],
  [/tawk\.to/i, 'Tawk.to'],
  [/crisp\.chat/i, 'Crisp'],
  [/zdassets\.com|zendesk\.com\/embeddable/i, 'Zendesk'],
  [/tidio/i, 'Tidio'],
  [/livechatinc\.com/i, 'LiveChat'],
  [/connect\.facebook\.net\/.*sdk\/xfbml\.customerchat/i, 'Messenger'],
  [/podium\.com/i, 'Podium'],
  [/hubspot\.com\/.*conversations/i, 'HubSpot Chat']
];

const AD_PLATFORMS = [
  [/googleadservices\.com|gtag\/js\?id=AW-|google_conversion/i, 'Google Ads'],
  [/connect\.facebook\.net\/.*fbevents\.js|fbq\(/i, 'Meta Pixel'],
  [/analytics\.tiktok\.com/i, 'TikTok Ads'],
  [/bat\.bing\.com/i, 'Microsoft Ads'],
  [/snap\.licdn\.com|linkedin\.com\/px/i, 'LinkedIn Ads']
];

function matchVendor(html, table) {
  for (const [re, name] of table) if (re.test(html)) return name;
  return null;
}

function detectBooking(html) {
  const vendor = matchVendor(html, BOOKING_VENDORS);
  if (vendor) return { hasBooking: true, bookingVendor: vendor };
  // A "book now" link that goes nowhere schedulable is not booking.
  const claimsBooking = /book\s+(now|online|an?\s+appointment)|schedule\s+(now|online|service)/i.test(html);
  return { hasBooking: false, bookingVendor: null, claimsBookingWithoutTool: claimsBooking };
}

function detectChat(html) {
  const vendor = matchVendor(html, CHAT_VENDORS);
  return { hasChat: !!vendor, chatVendor: vendor };
}

function detectAds(html) {
  const platforms = AD_PLATFORMS.filter(([re]) => re.test(html)).map(([, name]) => name);
  return { runsAds: platforms.length > 0, adPlatforms: platforms };
}

function detectContactForm(html) {
  const forms = html.match(/<form[\s\S]*?<\/form>/gi) || [];
  const real = forms.some(f =>
    /type=["']email["']|name=["'][^"']*email/i.test(f) ||
    /type=["']tel["']|name=["'][^"']*phone/i.test(f)
  );
  return { hasContactForm: real };
}

function detectMobileFriendly(html) {
  return { mobileFriendly: /<meta[^>]+name=["']viewport["'][^>]*>/i.test(html) };
}

// ─── prose signals ────────────────────────────────────────────────────────────

function extractEmergencyClaim(text) {
  return { emergencyClaim: /24\s*[\/\-]?\s*7|24 hours|emergency service|same[- ]day service|around the clock/i.test(text) };
}

function extractYearsInBusiness(text, now = new Date()) {
  const since = text.match(/(?:since|established|serving\s+\w+\s+since|est\.?)\s+(19\d{2}|20\d{2})/i);
  if (since) return { yearsInBusiness: Math.max(0, now.getFullYear() - Number(since[1])) };
  const years = text.match(/(\d{1,2})\+?\s*years?\s+(?:of\s+)?(?:experience|in business|serving)/i);
  if (years) return { yearsInBusiness: Number(years[1]) };
  return { yearsInBusiness: null };
}

function extractStaffCount(text) {
  const m = text.match(/(?:team of|staff of|crew of)\s+(\d{1,3})|(\d{1,3})\s*(?:\+\s*)?(?:employees|technicians|techs|stylists|staff members)/i);
  const n = m ? Number(m[1] || m[2]) : null;
  return { staffCount: n && n > 0 && n < 500 ? n : null };
}

function extractServiceArea(text) {
  const m = text.match(/(?:serving|we serve|service area[:\s]+)([A-Z][^.!?\n]{3,80})/);
  return { serviceArea: m ? strip(m[1]) : null };
}

function extractSocial(html) {
  const found = new Set();
  for (const [re, name] of [
    [/facebook\.com\/[A-Za-z0-9._-]+/i, 'facebook'],
    [/instagram\.com\/[A-Za-z0-9._-]+/i, 'instagram'],
    [/linkedin\.com\/(company|in)\/[A-Za-z0-9._-]+/i, 'linkedin'],
    [/tiktok\.com\/@[A-Za-z0-9._-]+/i, 'tiktok'],
    [/youtube\.com\/(c|channel|@)[A-Za-z0-9._\/-]+/i, 'youtube']
  ]) if (re.test(html)) found.add(name);
  return { socialProfiles: [...found] };
}

function detectSpanishMarket(text) {
  const markers = /\b(servicios|gratis|llámenos|presupuesto|contáctenos|hablamos español|se habla español)\b/i;
  return { spanishMarket: markers.test(text) };
}

/**
 * Review lines describing exactly the leak we fix. The single most persuasive
 * thing the crawler can find, so it is matched narrowly to avoid false hits.
 */
const PAIN_RE = /[^.!?\n]*\b(never (?:called|got) (?:me |us )?back|no ?one (?:ever )?(?:answer|answered|picked up)|couldn'?t (?:get|reach) (?:a|an)? ?(?:hold of |answer)|left (?:several|multiple|three|two) (?:messages|voicemails)|didn'?t (?:call|get) back|waited (?:days|a week) for a (?:call|quote)|unresponsive)\b[^.!?\n]*/gi;

function extractPainQuotes(text) {
  const hits = (text.match(PAIN_RE) || []).map(strip).filter(q => q.length > 15 && q.length < 300);
  return { painQuotes: [...new Set(hits)].slice(0, 3) };
}

// ─── public API ───────────────────────────────────────────────────────────────

/**
 * Extract everything determinable from one page.
 * @param {string} html  raw HTML (Firecrawl `html` / `rawHtml` format)
 * @param {string} text  readable text/markdown of the same page
 * @param {string} url   the page URL, recorded as the source of every fact
 */
function extractSignals(html = '', text = '', url = '') {
  const h = String(html || '');
  const t = String(text || '') || h.replace(/<[^>]+>/g, ' ');

  const schema = extractSchemaOrg(h);
  const contacts = extractContacts(h);

  const signals = {
    ...schema,
    // schema.org wins when present; markup links are the fallback
    phone: schema.phone || contacts.phone || null,
    email: schema.email || contacts.email || null,
    phones: contacts.phones,
    emails: contacts.emails,
    hasHours: !!schema.hours,
    https: /^https:/i.test(url),
    ...detectBooking(h),
    ...detectChat(h),
    ...detectAds(h),
    ...detectContactForm(h),
    ...detectMobileFriendly(h),
    ...extractEmergencyClaim(t),
    ...extractYearsInBusiness(t),
    ...extractStaffCount(t),
    ...extractServiceArea(t),
    ...extractSocial(h),
    ...detectSpanishMarket(t),
    ...extractPainQuotes(t)
  };

  // Provenance: every fact we found came from this page.
  const sources = {};
  for (const [k, v] of Object.entries(signals)) {
    if (v !== null && v !== undefined && !(Array.isArray(v) && !v.length) && v !== false) sources[k] = url;
  }
  signals.sources = sources;

  return signals;
}

module.exports = {
  extractSignals,
  // exported for tests
  extractSchemaOrg, extractContacts, detectBooking, detectChat, detectAds,
  detectContactForm, detectMobileFriendly, extractEmergencyClaim,
  extractYearsInBusiness, extractStaffCount, extractSocial, extractPainQuotes,
  detectSpanishMarket
};
