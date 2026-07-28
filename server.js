require('dotenv').config();

// ── Load DPAPI-encrypted secrets FIRST (before any module reads process.env) ──
const secrets = require('./src/secrets-manager');
const _loaded = secrets.loadSecretsToEnv();
if (_loaded > 0) console.log(`  🔐 Loaded ${_loaded} secret(s) from DPAPI vault`);

const express = require('express');
const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');
const axios = require('axios');
const multer = require('multer');
const { generateThumbnail } = require('./src/thumbnail-generator');
const { generateCustomerBrief } = require('./src/customer-brief-generator');
const { researchCustomer } = require('./src/customer-researcher');
const { exportToDocx } = require('./src/brief-exporter');
const { createProspectItem } = require('./src/monday-connector');
const { saveProspect, fromIntake } = require('./src/valuconnect-crm');
const { discoverLeads } = require('./src/lead-discovery');
const { generateWebsite }   = require('./src/website-generator');
const { generateOnepager }  = require('./src/onepager-generator');
const emailSequence = require('./src/email-sequence-engine');

const BRIEFS_DIR    = process.env.BRIEFS_DIR    || './outputs/briefs';
const WEBSITES_DIR  = process.env.WEBSITES_DIR  || './outputs/websites';
const ONEPAGERS_DIR = process.env.ONEPAGERS_DIR || './outputs/onepagers';
const UPLOADS_TMP = './uploads/tmp';

const upload = multer({
  dest: UPLOADS_TMP,
  limits: { fileSize: 25 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = /\.(jpe?g|png|webp|gif|pdf|docx?|txt)$/i;
    cb(null, allowed.test(file.originalname));
  }
});

const app = express();
const PORT = process.env.DASHBOARD_PORT || 3000;
const OUTPUT_DIR = process.env.OUTPUT_DIR || './outputs';
const TOKENS_FILE = path.join(__dirname, 'config', 'tokens.json');

app.use(express.json());
app.use(express.static(path.join(__dirname, 'dashboard')));
app.use('/outputs', express.static(path.join(__dirname, 'outputs')));

// ── Cloudflare Zero Trust — block protected pages without CF JWT (production only) ──
const CF_PROTECTED = ['/secrets.html', '/leads.html', '/brief.html'];
const CF_AUD       = process.env.CLOUDFLARE_ACCESS_AUD;
const CF_TEAM      = process.env.CLOUDFLARE_TEAM_DOMAIN;

if (CF_AUD && CF_TEAM) {
  app.use((req, res, next) => {
    if (!CF_PROTECTED.some(p => req.path === p)) return next();
    const jwt = req.headers['cf-access-jwt-assertion'];
    if (!jwt) return res.status(401).send('<h1>401 — Access Denied</h1><p>This page requires Cloudflare Access authentication. Open it via <a href="https://app.vcsolutions.us">app.vcsolutions.us</a>.</p>');
    // JWT signature verification is handled by Cloudflare before the request reaches us.
    // This check simply ensures the header is present (belt-and-suspenders).
    next();
  });
}

// ── Intranet hub ──
app.get('/intranet', (_req, res) => res.sendFile(path.join(__dirname, 'dashboard', 'intranet.html')));

// ── Public intake form ──
app.get('/intake', (_req, res) => res.sendFile(path.join(__dirname, 'dashboard', 'intake.html')));

// ── Serve website assets (logos, images) for internal use ──
app.use('/brand', express.static(path.join(__dirname, 'website', 'assets', 'images')));

// ── Audit log ──
const LOGS_DIR = path.join(__dirname, 'logs');

app.post('/api/audit', (req, res) => {
  const { user, action, detail } = req.body;
  if (!action) return res.status(400).json({ error: 'action required' });
  const entry = {
    id: Date.now(),
    timestamp: new Date().toISOString(),
    user: user || 'unknown',
    action,
    detail: detail || '',
    ip: req.ip || req.socket?.remoteAddress || 'unknown'
  };
  const logFile = path.join(LOGS_DIR, 'audit.json');
  let logs = [];
  try { logs = JSON.parse(fs.readFileSync(logFile, 'utf8')); } catch {}
  logs.push(entry);
  if (logs.length > 2000) logs = logs.slice(-2000);
  fs.mkdirSync(LOGS_DIR, { recursive: true });
  fs.writeFileSync(logFile, JSON.stringify(logs, null, 2));
  res.json({ ok: true });
});

app.get('/api/audit', (req, res) => {
  const logFile = path.join(LOGS_DIR, 'audit.json');
  try {
    const logs = JSON.parse(fs.readFileSync(logFile, 'utf8'));
    const limit = Math.min(parseInt(req.query.limit) || 100, 500);
    res.json(logs.slice(-limit).reverse());
  } catch { res.json([]); }
});

// ── Token helpers ──
function loadTokens() {
  try { return JSON.parse(fs.readFileSync(TOKENS_FILE, 'utf8')); } catch { return {}; }
}
function saveTokens(tokens) {
  const dir = path.dirname(TOKENS_FILE);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(TOKENS_FILE, JSON.stringify(tokens, null, 2));
}

// ── List all past runs ──
app.get('/api/runs', (_req, res) => {
  try {
    if (!fs.existsSync(OUTPUT_DIR)) return res.json([]);
    const runs = fs.readdirSync(OUTPUT_DIR)
      .filter(d => /^\d{4}-\d{2}-\d{2}$/.test(d))
      .sort((a, b) => b.localeCompare(a))
      .map(date => {
        const dir = path.join(OUTPUT_DIR, date);
        let topics = 0, industries = [];
        try {
          const content = JSON.parse(fs.readFileSync(path.join(dir, 'content.json'), 'utf8'));
          topics = content.length;
          industries = [...new Set(content.map(c => c.industry).filter(Boolean))];
        } catch {}
        return { date, topics, industries, hasContent: fs.existsSync(path.join(dir, 'content.json')) };
      });
    res.json(runs);
  } catch { res.json([]); }
});

// ── Get a specific run's data ──
app.get('/api/runs/:date', (req, res) => {
  const dir = path.join(OUTPUT_DIR, req.params.date);
  try {
    const content = JSON.parse(fs.readFileSync(path.join(dir, 'content.json'), 'utf8'));
    let matches = [], rawTopics = [];
    try { matches   = JSON.parse(fs.readFileSync(path.join(dir, 'industry-matches.json'), 'utf8')); } catch {}
    try { rawTopics = JSON.parse(fs.readFileSync(path.join(dir, 'raw_topics.json'),        'utf8')); } catch {}
    res.json({ content, matches, rawTopics });
  } catch { res.status(404).json({ error: 'Run not found' }); }
});

// ── Auth status ──
app.get('/api/auth/status', (_req, res) => {
  const tokens = loadTokens();
  const liExpired = tokens.linkedin?.expires_at && Date.now() > tokens.linkedin.expires_at;
  res.json({
    linkedin: !!(tokens.linkedin?.access_token && !liExpired),
    linkedin_name: tokens.linkedin?.name || null,
    facebook: !!(tokens.facebook?.pages?.length),
    facebook_pages: tokens.facebook?.pages?.map(p => ({ id: p.id, name: p.name })) || [],
    instagram: !!(tokens.instagram?.accounts?.length),
    instagram_username: tokens.instagram?.accounts?.[0]?.username || null,
    instagram_accounts: tokens.instagram?.accounts?.map(a => ({ id: a.ig_user_id, username: a.username })) || []
  });
});

// ── LinkedIn OAuth ──
app.get('/auth/linkedin', (_req, res) => {
  const clientId = process.env.LINKEDIN_CLIENT_ID;
  if (!clientId) return res.send(oauthErrorPage('LINKEDIN_CLIENT_ID is not set in .env', 'developer.linkedin.com'));
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: clientId,
    redirect_uri: `http://localhost:${PORT}/auth/linkedin/callback`,
    scope: 'openid profile w_member_social',
    state: 'vcie_' + Date.now()
  });
  res.redirect(`https://www.linkedin.com/oauth/v2/authorization?${params}`);
});

app.get('/auth/linkedin/callback', async (req, res) => {
  const { code, error } = req.query;
  if (error) return res.send(oauthErrorPage('LinkedIn denied access: ' + error));
  try {
    const tokenRes = await axios.post('https://www.linkedin.com/oauth/v2/accessToken',
      new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: `http://localhost:${PORT}/auth/linkedin/callback`,
        client_id: process.env.LINKEDIN_CLIENT_ID,
        client_secret: process.env.LINKEDIN_CLIENT_SECRET
      }),
      { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
    );
    const profileRes = await axios.get('https://api.linkedin.com/v2/userinfo', {
      headers: { Authorization: `Bearer ${tokenRes.data.access_token}` }
    });
    const tokens = loadTokens();
    tokens.linkedin = {
      access_token: tokenRes.data.access_token,
      expires_at: Date.now() + (tokenRes.data.expires_in || 5184000) * 1000,
      person_urn: `urn:li:person:${profileRes.data.sub}`,
      name: profileRes.data.name
    };
    saveTokens(tokens);
    res.send(oauthSuccessPage('LinkedIn', profileRes.data.name));
  } catch (err) {
    res.send(oauthErrorPage(err.response?.data?.error_description || err.message));
  }
});

// ── Post to LinkedIn ──
app.post('/api/post/linkedin', async (req, res) => {
  const { text } = req.body;
  const tokens = loadTokens();
  if (!tokens.linkedin?.access_token) return res.status(401).json({ error: 'LinkedIn not connected. Click Connect LinkedIn in the dashboard.' });
  if (Date.now() > tokens.linkedin.expires_at) return res.status(401).json({ error: 'LinkedIn token expired. Click Connect LinkedIn to reconnect.' });
  try {
    const postRes = await axios.post('https://api.linkedin.com/v2/ugcPosts', {
      author: tokens.linkedin.person_urn,
      lifecycleState: 'PUBLISHED',
      specificContent: {
        'com.linkedin.ugc.ShareContent': {
          shareCommentary: { text },
          shareMediaCategory: 'NONE'
        }
      },
      visibility: { 'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC' }
    }, {
      headers: {
        Authorization: `Bearer ${tokens.linkedin.access_token}`,
        'Content-Type': 'application/json',
        'X-Restli-Protocol-Version': '2.0.0'
      }
    });
    res.json({ ok: true, id: postRes.headers['x-restli-id'] || postRes.data.id });
  } catch (err) {
    const msg = err.response?.data?.message || err.response?.data?.serviceErrorCode || err.message;
    res.status(500).json({ error: String(msg) });
  }
});

// ── Facebook OAuth ──
app.get('/auth/facebook', (_req, res) => {
  const appId = process.env.FACEBOOK_APP_ID;
  if (!appId) return res.send(oauthErrorPage('FACEBOOK_APP_ID is not set in .env', 'developers.facebook.com'));
  const params = new URLSearchParams({
    client_id: appId,
    redirect_uri: `http://localhost:${PORT}/auth/facebook/callback`,
    scope: 'pages_show_list,pages_read_engagement',
    state: 'vcie_' + Date.now()
  });
  res.redirect(`https://www.facebook.com/v19.0/dialog/oauth?${params}`);
});

app.get('/auth/facebook/callback', async (req, res) => {
  const { code, error } = req.query;
  if (error) return res.send(oauthErrorPage('Facebook denied access: ' + error));
  try {
    const tokenRes = await axios.get('https://graph.facebook.com/v19.0/oauth/access_token', {
      params: {
        client_id: process.env.FACEBOOK_APP_ID,
        client_secret: process.env.FACEBOOK_APP_SECRET,
        redirect_uri: `http://localhost:${PORT}/auth/facebook/callback`,
        code
      }
    });
    const pagesRes = await axios.get('https://graph.facebook.com/v19.0/me/accounts', {
      params: { access_token: tokenRes.data.access_token }
    });
    const tokens = loadTokens();
    tokens.facebook = {
      user_access_token: tokenRes.data.access_token,
      pages: pagesRes.data.data || []
    };
    saveTokens(tokens);
    const pages = pagesRes.data.data || [];
    res.send(oauthSuccessPage('Facebook', null, pages));
  } catch (err) {
    res.send(oauthErrorPage(err.response?.data?.error?.message || err.message));
  }
});

// ── Post to Facebook ──
app.post('/api/post/facebook', async (req, res) => {
  const { text } = req.body;
  const tokens = loadTokens();
  const pageId = process.env.FACEBOOK_PAGE_ID;
  if (!tokens.facebook?.pages?.length) return res.status(401).json({ error: 'Facebook not connected. Click Connect Facebook in the dashboard.' });
  if (!pageId) return res.status(400).json({ error: 'FACEBOOK_PAGE_ID not set in .env. Add it after connecting.' });
  const page = tokens.facebook.pages.find(p => p.id === pageId) || tokens.facebook.pages[0];
  if (!page) return res.status(400).json({ error: 'Page not found in connected accounts. Reconnect Facebook.' });
  try {
    await axios.post(`https://graph.facebook.com/v19.0/${page.id}/feed`, null, {
      params: { message: text, access_token: page.access_token }
    });
    res.json({ ok: true });
  } catch (err) {
    const msg = err.response?.data?.error?.message || err.message;
    res.status(500).json({ error: String(msg) });
  }
});

// ── Instagram OAuth (via Meta) ──
app.get('/auth/instagram', (_req, res) => {
  const appId = process.env.FACEBOOK_APP_ID;
  if (!appId) return res.send(oauthErrorPage('FACEBOOK_APP_ID is not set in .env', 'developers.facebook.com'));
  const params = new URLSearchParams({
    client_id: appId,
    redirect_uri: `http://localhost:${PORT}/auth/instagram/callback`,
    scope: 'instagram_basic,instagram_content_publish,pages_show_list,pages_read_engagement',
    state: 'vcie_ig_' + Date.now()
  });
  res.redirect(`https://www.facebook.com/v19.0/dialog/oauth?${params}`);
});

app.get('/auth/instagram/callback', async (req, res) => {
  const { code, error } = req.query;
  if (error) return res.send(oauthErrorPage('Instagram denied access: ' + error));
  try {
    const tokenRes = await axios.get('https://graph.facebook.com/v19.0/oauth/access_token', {
      params: {
        client_id: process.env.FACEBOOK_APP_ID,
        client_secret: process.env.FACEBOOK_APP_SECRET,
        redirect_uri: `http://localhost:${PORT}/auth/instagram/callback`,
        code
      }
    });
    const userToken = tokenRes.data.access_token;
    const pagesRes = await axios.get('https://graph.facebook.com/v19.0/me/accounts', {
      params: { access_token: userToken, fields: 'id,name,access_token,instagram_business_account' }
    });
    const igAccounts = [];
    for (const page of (pagesRes.data.data || [])) {
      if (page.instagram_business_account?.id) {
        try {
          const igRes = await axios.get(`https://graph.facebook.com/v19.0/${page.instagram_business_account.id}`, {
            params: { fields: 'id,name,username', access_token: page.access_token }
          });
          igAccounts.push({
            ig_user_id: igRes.data.id,
            username: igRes.data.username || igRes.data.name,
            page_id: page.id,
            page_access_token: page.access_token
          });
        } catch {}
      }
    }
    const tokens = loadTokens();
    tokens.instagram = { user_access_token: userToken, accounts: igAccounts };
    saveTokens(tokens);
    const detail = igAccounts.length
      ? igAccounts.map(a => `<li><strong>@${a.username}</strong></li>`).join('')
      : null;
    res.send(detail
      ? `<!DOCTYPE html><html><head><style>body{font-family:system-ui;display:flex;align-items:center;justify-content:center;min-height:100vh;background:#0d1117;color:#e6edf3;flex-direction:column;gap:12px;padding:24px;text-align:center}</style></head><body><h2 style="color:#3fb950">✓ Instagram Connected</h2><p style="color:#8b949e;margin:0">Accounts linked:</p><ul style="text-align:left;color:#e6edf3;margin:8px 0">${detail}</ul><p style="color:#8b949e;font-size:.8rem">This window will close automatically.</p><script>setTimeout(()=>window.close(),4000)</script></body></html>`
      : oauthErrorPage('No Instagram Business/Creator accounts found linked to your Facebook pages. Set your Instagram account to Business or Creator mode and link it to your Facebook Page, then try again.')
    );
  } catch (err) {
    res.send(oauthErrorPage(err.response?.data?.error?.message || err.message));
  }
});

// ── Post to Instagram ──
app.post('/api/post/instagram', async (req, res) => {
  const { caption, image_url } = req.body;
  const tokens = loadTokens();
  if (!tokens.instagram?.accounts?.length) return res.status(401).json({ error: 'Instagram not connected. Click Connect Instagram in the dashboard.' });
  if (!image_url) return res.status(400).json({ error: 'image_url is required for Instagram posts.' });
  const account = tokens.instagram.accounts[0];
  try {
    const containerRes = await axios.post(
      `https://graph.facebook.com/v19.0/${account.ig_user_id}/media`, null,
      { params: { image_url, caption, access_token: account.page_access_token } }
    );
    await axios.post(
      `https://graph.facebook.com/v19.0/${account.ig_user_id}/media_publish`, null,
      { params: { creation_id: containerRes.data.id, access_token: account.page_access_token } }
    );
    res.json({ ok: true });
  } catch (err) {
    const msg = err.response?.data?.error?.message || err.message;
    res.status(500).json({ error: String(msg) });
  }
});

// ── Generate thumbnail on demand ──
app.post('/api/thumbnail', async (req, res) => {
  const { topic, industry, angle, hook, source } = req.body;
  if (!topic) return res.status(400).json({ error: 'topic is required' });
  if (!process.env.OPENAI_API_KEY) return res.status(400).json({ error: 'OPENAI_API_KEY not set in .env' });
  try {
    const url = await generateThumbnail({ title: topic, industry, angle, hook, source });
    if (!url) return res.status(500).json({ error: 'Image generation returned no URL' });
    res.json({ url });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Stream a pipeline run via SSE ──
app.get('/api/run/:type', (req, res) => {
  const script = req.params.type === 'full' ? 'run.js' : 'test.js';
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  const send = (event, data) => res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
  send('status', { message: `Starting ${script}...` });

  const proc = spawn('node', [script], { cwd: __dirname, env: { ...process.env } });
  proc.stdout.on('data', d => {
    d.toString().split('\n').filter(l => l.trim()).forEach(line => send('log', { text: line }));
  });
  proc.stderr.on('data', d => {
    d.toString().split('\n').filter(l => l.trim()).forEach(line => send('log', { text: line, error: true }));
  });
  proc.on('close', code => { send('done', { code, success: code === 0 }); res.end(); });
  req.on('close', () => { try { proc.kill(); } catch {} });
});

// ═══════════════════════════════════════════════════════════════
// ── Intake Form API ───────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════

app.post('/api/intake/submit', async (req, res) => {
  const customer = req.body;
  if (!customer?.businessName || !customer?.ownerName || !customer?.email || !customer?.industryId) {
    return res.status(400).json({ error: 'businessName, ownerName, email and industryId are required' });
  }

  const results = { crmId: null, mondayUrl: null, confirmationSent: false, notificationSent: false };

  // 1 — file the prospect in the ValuConnect CRM
  const saved = await saveProspect(fromIntake(customer));
  if (saved.ok) {
    results.crmId = saved.id;
  } else if (process.env.MONDAY_API_KEY && process.env.MONDAY_CRM_BOARD_ID) {
    // Fallback while the CRM is not yet reachable - an intake form submission is
    // a real person who filled in a form; losing it is worse than a stale board.
    try {
      const pseudoBrief = {
        opsBrief:       { recommended_package: null, top_pain_points: [], current_state_summary: customer.notes || '', expected_outcomes: [], time_saved_per_week: '', risk_of_inaction: '', implementation_roadmap: {}, must_have_services: [] },
        marketingBrief: { pitch_angle: '', opening_hook: '', outreach_channel: '', outreach_sequence: [], top_objections: [], urgency_trigger: '', key_messages: [], buyer_profile: '', best_testimonial_match: '', demo_that_converts: '' },
        industryData:   { name: customer.industryId },
        filepath:       ''
      };
      const m = await createProspectItem(customer, pseudoBrief);
      results.mondayUrl = m?.itemUrl || null;
      console.warn(`Intake → CRM unavailable (${saved.reason}); fell back to Monday.com`);
    } catch (err) {
      console.warn('Intake → Monday.com fallback also failed:', err.message);
    }
  } else {
    console.warn('Intake → prospect NOT saved anywhere:', saved.reason);
  }

  // 2 — Confirmation email to prospect
  if (process.env.SENDGRID_API_KEY && customer.email) {
    try {
      const { send } = require('./src/email-sender');
      await send({ to: customer.email, toName: customer.ownerName, templateKey: 'intake_confirmation', lang: customer.lang || customer.langPref || 'en', data: { businessName: customer.businessName, ownerName: customer.ownerName } });
      results.confirmationSent = true;
    } catch (err) { console.warn('Intake → confirmation email failed:', err.message); }
  }

  // 3 — Internal notification to Andres
  if (process.env.SENDGRID_API_KEY) {
    try {
      const { send } = require('./src/email-sender');
      await send({ to: 'info@vcsolutions.us', toName: 'Andres Ramirez', templateKey: 'internal_lead_notification', lang: 'en', data: { businessName: customer.businessName, ownerName: customer.ownerName, email: customer.email, phone: customer.phone || customer.whatsapp || '—', industryId: customer.industryId, city: customer.city || '—', country: customer.country || '—', challenges: (customer.challenges || []).join(', ') || '—', goals: (customer.goals || []).join(', ') || '—', notes: customer.notes || '—', langPref: customer.langPref || 'en', mondayUrl: (results.crmId ? `ValuConnect CRM #${results.crmId}` : results.mondayUrl) || '—' } });
      results.notificationSent = true;
    } catch (err) { console.warn('Intake → Andres notification failed:', err.message); }
  }

  // 4 — Audit log
  try {
    const logFile = path.join(LOGS_DIR, 'audit.json');
    let logs = [];
    try { logs = JSON.parse(fs.readFileSync(logFile, 'utf8')); } catch {}
    logs.push({ id: Date.now(), timestamp: new Date().toISOString(), user: 'intake-form', action: 'intake_submit', detail: `${customer.businessName} — ${customer.email}`, ip: req.ip || 'unknown' });
    if (logs.length > 2000) logs = logs.slice(-2000);
    fs.writeFileSync(logFile, JSON.stringify(logs, null, 2));
  } catch {}

  res.json({ ok: true, ...results });
});

// ═══════════════════════════════════════════════════════════════
// ── Lead Discovery API ───────────────────────────────────────
// ═══════════════════════════════════════════════════════════════

// POST /api/leads/discover — stream SSE lead results from Firecrawl + Claude
app.post('/api/leads/discover', async (req, res) => {
  const { industryId, city, country, limit = 10, minScore = 40 } = req.body;

  if (!industryId || !city) {
    return res.status(400).json({ error: 'industryId and city are required' });
  }
  if (!process.env.FIRECRAWL_API_KEY) {
    return res.status(400).json({ error: 'FIRECRAWL_API_KEY not set in .env — get one at firecrawl.dev' });
  }

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders();

  const send = (type, data) => res.write(`data: ${JSON.stringify({ type, ...data })}\n\n`);

  try {
    const leads = await discoverLeads({
      industryId, city, country, limit: Number(limit), minScore: Number(minScore),
      onProgress: ({ message, lead, done, total, current, count }) => {
        if (lead)  send('lead',     { lead });
        else if (done) send('done', { count: count || 0 });
        else       send('progress', { message, total, current });
      }
    });

    // If onProgress already sent done event with leads individually, just close
    if (!leads.length) send('done', { count: 0 });
  } catch (err) {
    send('error', { message: err.message });
  }

  res.end();
});

// POST /api/leads/save — file a discovered lead in the ValuConnect CRM.
// The engine speaks lead-discovery's own field names, so the lead goes as-is.
// /api/leads/save-monday is kept as an alias only so an open dashboard tab or a
// cached leads.html keeps working; it goes to the same place.
async function saveDiscoveredLead(req, res) {
  const { lead } = req.body;
  if (!lead?.businessName) return res.status(400).json({ error: 'lead.businessName required' });

  const result = await saveProspect(lead);
  if (result.ok) return res.json({ ok: true, id: result.id, destination: 'valuconnect-crm' });

  // The CRM is the destination, but until it is deployed a failure here would
  // silently drop a prospect we already paid Firecrawl and Claude to find.
  // Fall back to Monday.com so nothing is lost, and say so in the response.
  if (process.env.MONDAY_API_KEY && process.env.MONDAY_CRM_BOARD_ID) {
    try {
      const { createProspectItem: push } = require('./src/monday-connector');
      const pseudoBrief = {
        opsBrief:      { recommended_package: null, top_pain_points: lead.challenge_signals?.map(s => ({ pain: s, business_impact: '', priority: 'MEDIUM' })) || [], current_state_summary: lead.why_valuconnect || '' },
        marketingBrief:{ opening_hook: lead.opening_message || '', outreach_channel: 'WhatsApp', pitch_angle: lead.why_valuconnect || '', outreach_sequence: [], top_objections: [], urgency_trigger: '' },
        industryData:  { name: lead.industryId || lead.industry || '' },
        filepath:      lead.sourceUrl || ''
      };
      const customer = {
        businessName: lead.businessName, ownerName: lead.ownerName || null,
        industryId: lead.industryId || null, phone: lead.phone || null,
        email: lead.email || null, langPref: lead.langPref || 'en',
        city: lead.city || null, country: lead.country || null,
        _research: { location: lead.location, contact: { phone: lead.phone, email: lead.email }, websiteQuality: lead.digital_presence, businessSummary: lead.why_valuconnect }
      };
      const m = await push(customer, pseudoBrief);
      console.warn(`Lead save → CRM unavailable (${result.reason}); fell back to Monday.com`);
      return res.json({ ok: true, itemUrl: m?.itemUrl || null, destination: 'monday-fallback', crmError: result.reason });
    } catch (err) {
      return res.status(500).json({ error: `CRM: ${result.reason}; Monday fallback: ${err.message}` });
    }
  }
  res.status(500).json({ error: result.reason });
}

app.post('/api/leads/save', saveDiscoveredLead);
app.post('/api/leads/save-monday', saveDiscoveredLead);

// ═══════════════════════════════════════════════════════════════
// ── Brief Generator API ──────────────────────────────────────
// ═══════════════════════════════════════════════════════════════

// POST /api/research — quick research for form autofill (no brief generation)
app.post('/api/research', upload.array('files', 15), async (req, res) => {
  fs.mkdirSync(UPLOADS_TMP, { recursive: true });
  const files = req.files || [];
  const cleanup = (ff) => ff.forEach(f => { try { fs.unlinkSync(f.path); } catch {} });
  try {
    const urls = JSON.parse(req.body.urls || '{}');
    const screenshots = files.filter(f => /^image\//.test(f.mimetype)).map(f => ({ path: f.path, label: f.originalname }));
    const documents   = files.filter(f => !/^image\//.test(f.mimetype)).map(f => ({ path: f.path, label: f.originalname, mimetype: f.mimetype }));
    const lang = req.body.lang || 'en';
    const result = await researchCustomer(urls, {}, screenshots, documents, lang);
    cleanup(files);
    if (!result) return res.json({ found: false });
    res.json({ found: true, data: result });
  } catch (err) {
    cleanup(files);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/brief/generate — streams SSE progress while generating
app.post('/api/brief/generate', upload.array('files', 15), async (req, res) => {
  // Ensure upload temp dir exists
  fs.mkdirSync(UPLOADS_TMP, { recursive: true });
  fs.mkdirSync(BRIEFS_DIR,  { recursive: true });

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders();

  const send = (type, data) => {
    res.write(`data: ${JSON.stringify({ type, ...data })}\n\n`);
  };

  const cleanup = (files = []) => {
    files.forEach(f => { try { fs.unlinkSync(f.path); } catch {} });
  };

  try {
    const customer     = JSON.parse(req.body.customer || '{}');
    const urls         = JSON.parse(req.body.urls     || '{}');
    const lang         = req.body.lang || 'en';
    const skipResearch = req.body.skipResearch === '1';
    const files        = req.files || [];

    const screenshots = files
      .filter(f => /^image\//.test(f.mimetype))
      .map(f => ({ path: f.path, label: f.originalname }));

    const documents = files
      .filter(f => !/^image\//.test(f.mimetype))
      .map(f => ({ path: f.path, label: f.originalname, mimetype: f.mimetype }));

    // Step 1 — Research (skipped when user already ran Research Business)
    const hasResearch = !skipResearch && (urls.website || urls.facebook || urls.instagram || screenshots.length || documents.length);
    let finalCustomer = { ...customer };

    if (hasResearch) {
      send('progress', { step: 1, total: 4, message: lang === 'es' ? 'Analizando presencia en línea...' : 'Analyzing online presence...' });
      const enriched = await researchCustomer(urls, customer, screenshots, documents, lang);
      if (enriched) finalCustomer = enriched;
    }

    // Step 2 — Generate brief
    send('progress', { step: 2, total: 4, message: lang === 'es' ? 'Generando evaluación operacional...' : 'Generating operations assessment...' });
    const briefResult = await generateCustomerBrief(finalCustomer, lang);

    // Step 3 — Export Word doc
    send('progress', { step: 3, total: 4, message: 'Building Word document...' });
    let docxFile = null;
    try {
      const docxPath = await exportToDocx(
        finalCustomer, briefResult.industryData,
        briefResult.opsBrief, briefResult.marketingBrief, BRIEFS_DIR
      );
      docxFile = path.basename(docxPath);
    } catch (err) {
      send('warn', { message: `Word export skipped: ${err.message}` });
    }

    // Step 4 — file the prospect in the ValuConnect CRM
    let mondayUrl = null;
    let crmId = null;
    send('progress', { step: 4, total: 4, message: 'Saving to ValuConnect CRM...' });
    {
      const saved = await saveProspect({
        ...fromIntake(finalCustomer),
        source: 'brief generator',
        why_valuconnect: briefResult.opsBrief?.current_state_summary || null,
        opening_message: briefResult.marketingBrief?.opening_hook || null,
        challenge_signals: (briefResult.opsBrief?.top_pain_points || [])
          .map(p => p?.pain).filter(Boolean)
      });
      if (saved.ok) {
        crmId = saved.id;
      } else if (process.env.MONDAY_API_KEY && process.env.MONDAY_CRM_BOARD_ID) {
        try {
          const m = await createProspectItem(finalCustomer, briefResult);
          mondayUrl = m?.itemUrl || null;
          send('warn', { message: `CRM unavailable (${saved.reason}); saved to Monday.com instead` });
        } catch (err) {
          send('warn', { message: `Prospect not saved: ${saved.reason} / ${err.message}` });
        }
      } else {
        send('warn', { message: `Prospect not saved: ${saved.reason}` });
      }
    }

    cleanup(files);

    send('done', {
      customer:      finalCustomer,
      opsBrief:      briefResult.opsBrief,
      marketingBrief: briefResult.marketingBrief,
      industryName:  briefResult.industryData?.name,
      mdFile:        path.basename(briefResult.filepath),
      docxFile,
      crmId,
      mondayUrl
    });

  } catch (err) {
    send('error', { message: err.message });
    cleanup(req.files || []);
  }

  res.end();
});

// GET /api/brief/list — all generated briefs
app.get('/api/brief/list', (_req, res) => {
  try {
    if (!fs.existsSync(BRIEFS_DIR)) return res.json([]);
    const files = fs.readdirSync(BRIEFS_DIR)
      .filter(f => f.endsWith('.md') || f.endsWith('.docx'))
      .sort((a, b) => b.localeCompare(a))
      .map(f => ({
        name: f,
        date: f.slice(0, 10),
        business: f.slice(11).replace(/\.(md|docx)$/, '').replace(/-/g, ' '),
        type: f.endsWith('.docx') ? 'docx' : 'md',
        size: (() => { try { return fs.statSync(path.join(BRIEFS_DIR, f)).size; } catch { return 0; } })()
      }));
    res.json(files);
  } catch { res.json([]); }
});

// GET /api/brief/download/:filename — serve a brief file
app.get('/api/brief/download/:filename', (req, res) => {
  const filepath = path.join(path.resolve(BRIEFS_DIR), path.basename(req.params.filename));
  if (!filepath.startsWith(path.resolve(BRIEFS_DIR))) return res.status(400).json({ error: 'Invalid path' });
  if (!fs.existsSync(filepath)) return res.status(404).json({ error: 'Not found' });
  res.download(filepath);
});

// DELETE /api/brief/:filename — delete a brief (and its paired file)
app.delete('/api/brief/:filename', (req, res) => {
  const base = path.basename(req.params.filename);
  const filepath = path.join(path.resolve(BRIEFS_DIR), base);
  if (!filepath.startsWith(path.resolve(BRIEFS_DIR))) return res.status(400).json({ error: 'Invalid path' });
  try {
    if (fs.existsSync(filepath)) fs.unlinkSync(filepath);
    const paired = filepath.endsWith('.md')
      ? filepath.replace(/\.md$/, '.docx')
      : filepath.replace(/\.docx$/, '.md');
    if (fs.existsSync(paired)) fs.unlinkSync(paired);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ═══════════════════════════════════════════════════════════════
// ── Secrets Manager API (DPAPI — localhost only) ─────────────
// ═══════════════════════════════════════════════════════════════

const KNOWN_SECRETS = [
  { name: 'ANTHROPIC_API_KEY',      label: 'Anthropic API Key',          group: 'AI',       how: 'console.anthropic.com → API Keys' },
  { name: 'OPENAI_API_KEY',         label: 'OpenAI API Key',             group: 'AI',       how: 'platform.openai.com → API Keys' },
  { name: 'FIRECRAWL_API_KEY',      label: 'Firecrawl API Key',          group: 'Leads',    how: 'firecrawl.dev → Sign Up → API Keys' },
  { name: 'MONDAY_API_KEY',         label: 'Monday.com API Token',       group: 'CRM',      how: 'monday.com → Profile → Developers → API → Personal Token' },
  { name: 'MONDAY_USER_ANDRES',     label: 'Monday.com User ID — Andres',group: 'CRM',      how: 'monday.com → Profile → URL shows /users/XXXXXXXX' },
  { name: 'MONDAY_USER_YOLANDA',    label: 'Monday.com User ID — Yolanda',group: 'CRM',     how: 'monday.com → Yolanda profile URL → /users/XXXXXXXX' },
  { name: 'SENDGRID_API_KEY',       label: 'SendGrid API Key',           group: 'Email',    how: 'app.sendgrid.com → Settings → API Keys' },
  { name: 'LINKEDIN_CLIENT_ID',     label: 'LinkedIn Client ID',         group: 'Social',   how: 'developer.linkedin.com → My Apps' },
  { name: 'LINKEDIN_CLIENT_SECRET', label: 'LinkedIn Client Secret',     group: 'Social',   how: 'developer.linkedin.com → My Apps → Auth' },
  { name: 'FACEBOOK_APP_ID',        label: 'Facebook App ID',            group: 'Social',   how: 'developers.facebook.com → My Apps' },
  { name: 'FACEBOOK_APP_SECRET',    label: 'Facebook App Secret',        group: 'Social',   how: 'developers.facebook.com → Settings → Basic' },
  { name: 'YOUTUBE_API_KEY',        label: 'YouTube API Key',            group: 'Content',  how: 'console.cloud.google.com → APIs → Credentials' },
  { name: 'GEMINI_API_KEY',         label: 'Google Gemini API Key',      group: 'AI',       how: 'aistudio.google.com → Get API Key' },
  { name: 'SERPAPI_KEY',            label: 'SerpAPI Key',                group: 'Search',   how: 'serpapi.com → Dashboard → API Key' },
  { name: 'CLOUDFLARE_ACCESS_AUD', label: 'Cloudflare Access AUD Tag',  group: 'Security', how: 'Cloudflare Zero Trust → Access → Applications → your app → Settings → AUD Tag' },
  { name: 'SEQUENCE_POLL_MINUTES', label: 'Sequence Poll Interval (min)',group: 'Email',    how: 'Set to 15 (default). Lower = more frequent polling.' },
];

// GET /api/secrets/status — which secrets are configured (never returns values)
app.get('/api/secrets/status', (_req, res) => {
  res.json({
    status:    secrets.getSecretsStatus(KNOWN_SECRETS),
    isWindows: secrets.IS_WINDOWS,
    isProd:    secrets.IS_PROD,
    guide:     secrets.getDeploymentGuide()
  });
});

// POST /api/secrets/set — store a secret in DPAPI vault
app.post('/api/secrets/set', express.json(), (req, res) => {
  const { name, value } = req.body;
  if (!name || !value) return res.status(400).json({ error: 'name and value required' });
  const allowed = KNOWN_SECRETS.map(s => s.name);
  if (!allowed.includes(name)) return res.status(400).json({ error: 'Unknown secret name' });
  try {
    secrets.setSecret(name, value);
    process.env[name] = value; // Also update current process so restart isn't needed
    res.json({ ok: true, name });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/secrets/:name — remove a secret from vault
app.delete('/api/secrets/:name', (req, res) => {
  try {
    secrets.deleteSecret(req.params.name);
    delete process.env[req.params.name];
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/secrets/migrate — migrate existing Windows env vars into DPAPI vault
app.post('/api/secrets/migrate', (_req, res) => {
  const results = {};
  KNOWN_SECRETS.forEach(s => {
    if (process.env[s.name] && !secrets.secretIsSet(s.name)) {
      try {
        secrets.setSecret(s.name, process.env[s.name]);
        results[s.name] = 'migrated';
      } catch { results[s.name] = 'failed'; }
    } else if (secrets.secretIsSet(s.name)) {
      results[s.name] = 'already_in_vault';
    } else {
      results[s.name] = 'not_set';
    }
  });
  res.json(results);
});

// ═══════════════════════════════════════════════════════════════
// ── Website Generator API ─────────────────────────────────────
// ═══════════════════════════════════════════════════════════════

// Serve generated website files statically
app.use('/outputs/websites', express.static(path.join(__dirname, 'outputs', 'websites')));

// POST /api/website/generate — build a prospect HTML landing page from brief data
app.post('/api/website/generate', async (req, res) => {
  const { customer, opsBrief, marketingBrief, industryData, lang } = req.body;
  if (!customer?.businessName || !opsBrief || !marketingBrief || !industryData) {
    return res.status(400).json({ error: 'customer, opsBrief, marketingBrief and industryData are required' });
  }
  if (!process.env.ANTHROPIC_API_KEY) {
    return res.status(400).json({ error: 'ANTHROPIC_API_KEY not set' });
  }
  try {
    const { filename } = await generateWebsite({ customer, opsBrief, marketingBrief, industryData, lang: lang || 'en' });
    res.json({ ok: true, filename, previewUrl: `/api/website/preview/${encodeURIComponent(filename)}` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/website/preview/:file — serve a generated HTML page
app.get('/api/website/preview/:file', (req, res) => {
  const filepath = path.join(__dirname, 'outputs', 'websites', path.basename(req.params.file));
  if (!fs.existsSync(filepath)) return res.status(404).send('Not found');
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.sendFile(filepath);
});

// GET /api/website/list — list all generated website files
app.get('/api/website/list', (_req, res) => {
  try {
    if (!fs.existsSync(WEBSITES_DIR)) return res.json([]);
    const files = fs.readdirSync(WEBSITES_DIR)
      .filter(f => f.endsWith('.html'))
      .sort((a, b) => b.localeCompare(a))
      .map(f => ({
        name: f,
        date: f.slice(0, 10),
        business: f.slice(11).replace(/\.html$/, '').replace(/-/g, ' '),
        size: (() => { try { return fs.statSync(path.join(WEBSITES_DIR, f)).size; } catch { return 0; } })()
      }));
    res.json(files);
  } catch { res.json([]); }
});

// ═══════════════════════════════════════════════════════════════
// ── One-Pager Generator API ───────────────────────────────────
// ═══════════════════════════════════════════════════════════════

app.use('/outputs/onepagers', express.static(path.join(__dirname, 'outputs', 'onepagers')));

// POST /api/onepager/generate — build HTML + Word one-pager from brief data
app.post('/api/onepager/generate', async (req, res) => {
  const { customer, opsBrief, marketingBrief, industryData, lang } = req.body;
  if (!customer?.businessName || !opsBrief || !marketingBrief || !industryData) {
    return res.status(400).json({ error: 'customer, opsBrief, marketingBrief and industryData are required' });
  }
  try {
    const { htmlFile, docxFile } = await generateOnepager({
      customer, opsBrief, marketingBrief, industryData, lang: lang || 'en'
    });
    res.json({
      ok: true,
      htmlFile,
      docxFile,
      previewUrl:  `/api/onepager/preview/${encodeURIComponent(htmlFile)}`,
      downloadUrl: `/api/onepager/download/${encodeURIComponent(docxFile)}`
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/onepager/preview/:file — serve the HTML one-pager
app.get('/api/onepager/preview/:file', (req, res) => {
  const filepath = path.join(__dirname, 'outputs', 'onepagers', path.basename(req.params.file));
  if (!fs.existsSync(filepath)) return res.status(404).send('Not found');
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.sendFile(filepath);
});

// GET /api/onepager/download/:file — download the Word .docx
app.get('/api/onepager/download/:file', (req, res) => {
  const filepath = path.join(__dirname, 'outputs', 'onepagers', path.basename(req.params.file));
  if (!fs.existsSync(filepath)) return res.status(404).json({ error: 'Not found' });
  res.download(filepath);
});

// GET /api/onepager/list — list all generated one-pagers
app.get('/api/onepager/list', (_req, res) => {
  try {
    if (!fs.existsSync(ONEPAGERS_DIR)) return res.json([]);
    const files = fs.readdirSync(ONEPAGERS_DIR)
      .filter(f => f.endsWith('.html') || f.endsWith('.docx'))
      .sort((a, b) => b.localeCompare(a))
      .map(f => ({
        name: f,
        date: f.slice(0, 10),
        business: f.slice(11).replace(/\.(html|docx)$/, '').replace(/-/g, ' '),
        type: f.endsWith('.docx') ? 'docx' : 'html'
      }));
    res.json(files);
  } catch { res.json([]); }
});

// POST /api/onepager/email — email the one-pager to the prospect
app.post('/api/onepager/email', async (req, res) => {
  const { to, toName, docxFile, websiteUrl, customer, opsBrief, lang } = req.body;
  if (!to) return res.status(400).json({ error: 'to (email address) is required' });
  if (!process.env.SENDGRID_API_KEY) return res.status(400).json({ error: 'SENDGRID_API_KEY not set' });
  try {
    const { send } = require('./src/email-sender');
    const attachments = [];
    if (docxFile) {
      const docxPath = path.join(__dirname, 'outputs', 'onepagers', path.basename(docxFile));
      if (fs.existsSync(docxPath)) {
        attachments.push({
          path: docxPath,
          filename: docxFile,
          type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        });
      }
    }
    const result = await send({
      to, toName,
      templateKey: 'proposal',
      lang: lang || 'en',
      data: {
        businessName: customer?.businessName || toName || to,
        ownerName:    customer?.ownerName    || null,
        packageName:  opsBrief?.recommended_package || 'Starter',
        websiteUrl:   websiteUrl || ''
      },
      attachments
    });
    res.json({ ok: true, ...result });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ═══════════════════════════════════════════════════════════════
// ── Email Sequence API ────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════

// POST /api/sequence/run — manually trigger one poll cycle
app.post('/api/sequence/run', async (_req, res) => {
  try {
    await emailSequence.runOnce();
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/sequence/state — view which items have had emails sent
app.get('/api/sequence/state', (_req, res) => {
  const stateFile = path.join(__dirname, 'outputs', 'sequence-state.json');
  try {
    const state = JSON.parse(fs.readFileSync(stateFile, 'utf8'));
    res.json(state);
  } catch { res.json({}); }
});

// POST /api/email/send — send a one-off email (for testing or manual sends)
app.post('/api/email/send', async (req, res) => {
  const { to, toName, templateKey, lang, data } = req.body;
  if (!to || !templateKey) return res.status(400).json({ error: 'to and templateKey required' });
  if (!process.env.SENDGRID_API_KEY) return res.status(400).json({ error: 'SENDGRID_API_KEY not set' });
  try {
    const { send: sendEmail } = require('./src/email-sender');
    const result = await sendEmail({ to, toName, templateKey, lang: lang || 'en', data: data || {} });
    res.json({ ok: true, ...result });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── OAuth page helpers ──
function oauthSuccessPage(platform, name, pages) {
  const detail = pages
    ? `<p style="color:#8b949e;margin:0">Pages found:</p><ul style="text-align:left;color:#e6edf3;margin:8px 0">${pages.map(p => `<li><strong>${p.name}</strong> — ID: <code style="color:#00A896">${p.id}</code></li>`).join('')}</ul><p style="color:#8b949e;font-size:.82rem">Add your page ID to <code>FACEBOOK_PAGE_ID</code> in .env, then restart the server.</p>`
    : `<p style="color:#8b949e">Welcome, <strong>${name}</strong>!</p>`;
  return `<!DOCTYPE html><html><head><style>body{font-family:system-ui;display:flex;align-items:center;justify-content:center;min-height:100vh;background:#0d1117;color:#e6edf3;flex-direction:column;gap:12px;padding:24px;text-align:center}</style></head><body><h2 style="color:#3fb950">✓ ${platform} Connected</h2>${detail}<p style="color:#8b949e;font-size:.8rem">This window will close automatically.</p><script>setTimeout(()=>window.close(),4000)</script></body></html>`;
}

function oauthErrorPage(msg, hint) {
  const hintHtml = hint ? `<p style="color:#8b949e;font-size:.82rem">Go to <strong>${hint}</strong> to set up your app.</p>` : '';
  return `<!DOCTYPE html><html><head><style>body{font-family:system-ui;display:flex;align-items:center;justify-content:center;min-height:100vh;background:#0d1117;color:#e6edf3;flex-direction:column;gap:12px;padding:24px;text-align:center}</style></head><body><h2 style="color:#f85149">✗ Connection Failed</h2><p>${msg}</p>${hintHtml}</body></html>`;
}

app.listen(PORT, () => {
  console.log(`\n  VCIE Dashboard running at http://localhost:${PORT}`);

  // Auto-start email sequence engine if both keys are present
  if (process.env.MONDAY_API_KEY && process.env.SENDGRID_API_KEY && process.env.MONDAY_CRM_BOARD_ID) {
    emailSequence.start();
    console.log('  Email sequence engine active — polling Monday.com every 15 min');
  }

  // Auto-start Cloudflare tunnel if configured
  const tunnelConfig = path.join(__dirname, 'config', 'tunnel.yml');
  const cloudflared  = path.join(__dirname, 'cloudflared.exe');
  if (fs.existsSync(cloudflared) && fs.existsSync(tunnelConfig)) {
    const yml = fs.readFileSync(tunnelConfig, 'utf8');
    if (!yml.includes('TUNNEL_UUID_PLACEHOLDER')) {
      const proc = spawn(cloudflared, ['tunnel', '--config', tunnelConfig, 'run'], {
        detached: true, stdio: 'ignore'
      });
      proc.unref();
      console.log('  Cloudflare tunnel started → https://app.vcsolutions.us');
    }
  }

  console.log('');
});
