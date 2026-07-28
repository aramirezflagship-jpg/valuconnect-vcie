#!/usr/bin/env node
require('dotenv').config();

const readline = require('readline');
const fs = require('fs');
const path = require('path');
const { generateCustomerBrief, listIndustries } = require('./src/customer-brief-generator');
const { researchCustomer, analyzeScreenshot } = require('./src/customer-researcher');
const { createProspectItem, ensureDashboard } = require('./src/monday-connector');
const { saveProspect, fromIntake } = require('./src/valuconnect-crm');
const { exportToDocx } = require('./src/brief-exporter');

const BRIEFS_DIR = process.env.BRIEFS_DIR || './outputs/briefs';

// ─── CLI helpers ──────────────────────────────────────────────────────────────

function ask(rl, question, fallback = '') {
  return new Promise(resolve =>
    rl.question(question, answer => resolve(answer.trim() || fallback))
  );
}

function parseList(str) {
  return str.split(',').map(s => s.trim()).filter(Boolean);
}

function printHeader() {
  console.log('\n══════════════════════════════════════════════════');
  console.log('  ValuConnect — Customer Brief Generator  v2');
  console.log('══════════════════════════════════════════════════\n');
}

function printIndustries() {
  console.log('Available industries:\n');
  listIndustries().forEach(i => console.log(`  ${i.id.padEnd(26)} ${i.name}`));
  console.log('');
}

function printBriefResult(mdPath, docxPath, mondayResult, opsBrief, marketingBrief, crmResult) {
  const pkg = (opsBrief?.recommended_package || '').toUpperCase();
  console.log('\n✓ Brief complete\n');
  console.log(`  Package recommended  : ${pkg}`);
  console.log(`  Time saved / week    : ${opsBrief?.time_saved_per_week || '—'}`);
  console.log(`  Best outreach channel: ${marketingBrief?.outreach_channel || '—'}`);
  console.log(`\n  Markdown : ${mdPath}`);
  if (docxPath) console.log(`  Word doc : ${docxPath}`);
  if (crmResult?.id) console.log(`  CRM      : ValuConnect CRM #${crmResult.id}`);
  else if (mondayResult?.itemUrl) console.log(`  Monday   : ${mondayResult.itemUrl}`);
  console.log('');
}

// ─── Research phase (optional) ────────────────────────────────────────────────

async function runResearch(rl, provided = {}) {
  const doResearch = await ask(rl, 'Do you have website, social URLs, or screenshots to research? (y/n): ');
  if (!doResearch.toLowerCase().startsWith('y')) return provided;

  const website   = await ask(rl, '  Website URL (or Enter to skip): ');
  const facebook  = await ask(rl, '  Facebook URL (or Enter to skip): ');
  const instagram = await ask(rl, '  Instagram URL (or Enter to skip): ');

  // Screenshots
  const screenshots = [];
  const shotRaw = await ask(rl, '  Screenshot path(s) — comma-separated (or Enter to skip): ');
  if (shotRaw) {
    shotRaw.split(',').map(s => s.trim()).filter(Boolean).forEach((p, i) => {
      screenshots.push({ path: p, label: i === 0 ? 'screenshot' : `screenshot_${i + 1}` });
    });
  }

  if (!website && !facebook && !instagram && !screenshots.length) return provided;

  console.log('\nFetching and analyzing...\n');
  const enriched = await researchCustomer({ website, facebook, instagram }, provided, screenshots);

  if (!enriched) {
    console.log('  Research returned no results — using provided data.\n');
    return provided;
  }

  // Show what was found and let the user confirm / override
  console.log('  Research found:\n');
  if (enriched.businessName) console.log(`    Business name : ${enriched.businessName}`);
  if (enriched.ownerName)    console.log(`    Owner         : ${enriched.ownerName}`);
  if (enriched.industryId)   console.log(`    Industry      : ${enriched.industryId}`);
  if (enriched.size)         console.log(`    Size          : ${enriched.size}`);
  if (enriched.currentTools) console.log(`    Tools found   : ${enriched.currentTools}`);
  if (enriched.challenges?.length) console.log(`    Challenges    : ${enriched.challenges.join('; ')}`);
  if (enriched._research?.location) console.log(`    Location      : ${enriched._research.location}`);
  console.log('');

  const ok = await ask(rl, 'Use this research data? (y/n, default y): ', 'y');
  return ok.toLowerCase().startsWith('n') ? provided : enriched;
}

// ─── Interactive mode ─────────────────────────────────────────────────────────

async function interactiveMode() {
  printHeader();
  printIndustries();

  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

  // Start with optional research
  let customer = await runResearch(rl, {});

  // Fill in / override any missing fields manually
  customer.businessName = await ask(rl, `Business name${customer.businessName ? ` (found: "${customer.businessName}", Enter to keep)` : ''}: `, customer.businessName);
  customer.ownerName    = await ask(rl, `Owner name${customer.ownerName ? ` (found: "${customer.ownerName}", Enter to keep)` : ' (optional)'}: `, customer.ownerName || '');
  customer.industryId   = await ask(rl, `Industry ID${customer.industryId ? ` (found: "${customer.industryId}", Enter to keep)` : ''}: `, customer.industryId || '');
  customer.size         = await ask(rl, `Size e.g. "5 employees"${customer.size ? ` (found: "${customer.size}", Enter to keep)` : ''}: `, customer.size || '');
  customer.currentTools = await ask(rl, `Current tools (Enter to keep "${customer.currentTools || 'paper-based'}"): `, customer.currentTools || 'paper-based');

  const extraChallenges = await ask(rl, 'Additional challenges to add (comma-separated, or Enter to skip): ');
  if (extraChallenges) customer.challenges = [...(customer.challenges || []), ...parseList(extraChallenges)];

  const extraGoals = await ask(rl, 'Business goals (comma-separated, or Enter to skip): ');
  if (extraGoals) customer.goals = [...(customer.goals || []), ...parseList(extraGoals)];

  const notes = await ask(rl, 'Additional notes (optional): ');
  if (notes) customer.notes = [customer.notes, notes].filter(Boolean).join(' | ');

  rl.close();

  if (!customer.businessName || !customer.industryId) {
    console.error('\nError: business name and industry ID are required.\n');
    process.exit(1);
  }

  await runBriefPipeline(customer);
}

// ─── File mode ────────────────────────────────────────────────────────────────

async function fileMode(filePath) {
  if (!fs.existsSync(filePath)) { console.error(`Error: file not found — ${filePath}`); process.exit(1); }
  const customer = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  printHeader();
  console.log(`Processing: ${customer.businessName} (${customer.industryId})\n`);
  await runBriefPipeline(customer);
}

// ─── Batch mode ───────────────────────────────────────────────────────────────

async function batchMode(filePath) {
  if (!fs.existsSync(filePath)) { console.error(`Error: file not found — ${filePath}`); process.exit(1); }
  const customers = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  if (!Array.isArray(customers)) { console.error('Error: batch file must be a JSON array.'); process.exit(1); }

  printHeader();
  console.log(`Batch mode — ${customers.length} customer(s)\n`);

  for (let i = 0; i < customers.length; i++) {
    const c = customers[i];
    console.log(`[${i + 1}/${customers.length}] ${c.businessName} (${c.industryId})`);
    try {
      await runBriefPipeline(c, true);
    } catch (err) {
      console.error(`  ✗ Failed: ${err.message}\n`);
    }
  }

  console.log('Batch complete. All briefs saved in outputs/briefs/\n');
}

// ─── Core pipeline: brief → Word → ValuConnect CRM ───────────────────────────

async function runBriefPipeline(customer, silent = false) {
  if (!silent) console.log('Generating brief — this takes ~30 seconds...\n');

  // 1. Generate brief (markdown + JSON)
  const briefResult = await generateCustomerBrief(customer);
  const { filepath: mdPath, opsBrief, marketingBrief, industryData } = briefResult;

  // 2. Export Word document
  let docxPath = null;
  try {
    docxPath = await exportToDocx(customer, industryData, opsBrief, marketingBrief, BRIEFS_DIR);
  } catch (err) {
    console.warn(`  Word export skipped: ${err.message}`);
  }

  // 3. File the prospect in the ValuConnect CRM
  let mondayResult = null;
  let crmResult = null;
  const saved = await saveProspect({
    ...fromIntake(customer),
    source: 'brief generator',
    why_valuconnect: opsBrief?.current_state_summary || null,
    opening_message: marketingBrief?.opening_hook || null,
    challenge_signals: (opsBrief?.top_pain_points || []).map(p => p?.pain).filter(Boolean)
  });
  if (saved.ok) {
    crmResult = saved;
  } else if (process.env.MONDAY_API_KEY && process.env.MONDAY_CRM_BOARD_ID) {
    // CRM not reachable yet - keep the prospect somewhere rather than dropping it
    try {
      mondayResult = await createProspectItem(customer, briefResult);
      console.warn(`  CRM unavailable (${saved.reason}); saved to Monday.com instead`);
    } catch (err) {
      console.warn(`  Prospect not saved: ${saved.reason} / ${err.message}`);
    }
  } else {
    console.warn(`  Prospect not saved: ${saved.reason}`);
  }

  if (!silent) printBriefResult(mdPath, docxPath, mondayResult, opsBrief, marketingBrief, crmResult);
  else {
    const pkg = (opsBrief?.recommended_package || '').toUpperCase();
    const dest = crmResult ? ' → CRM ✓' : (mondayResult ? ' → Monday ✓' : '');
    console.log(`  ✓ ${path.basename(mdPath)}${docxPath ? ' + .docx' : ''} — ${pkg}${dest}\n`);
  }

  return { mdPath, docxPath, mondayResult, crmResult };
}

// ─── Help ─────────────────────────────────────────────────────────────────────

function showHelp() {
  printHeader();
  console.log('Usage:\n');
  console.log('  node generate-brief.js                       Interactive (asks questions + optional URL research)');
  console.log('  node generate-brief.js --file <path>         Single customer from JSON file');
  console.log('  node generate-brief.js --batch <path>        Multiple customers from JSON array');
  console.log('  node generate-brief.js --industries          List available industry IDs');
  console.log('  node generate-brief.js --setup-monday        Create Monday.com CRM dashboard');
  console.log('  node generate-brief.js --help                This help\n');
  console.log('Customer JSON schema:\n');
  console.log(`  {
    "businessName":  "Maria's Kitchen",           // required
    "industryId":    "restaurants",               // required — see --industries
    "ownerName":     "Maria Gonzalez",            // optional
    "size":          "8 employees",               // optional
    "currentTools":  "paper invoices, binders",   // optional
    "challenges":    ["lost invoices"],           // optional array
    "goals":         ["save time"],              // optional array
    "notes":         "opening 2nd location"       // optional
  }\n`);
  console.log('Optional URL research fields (for --file / --batch):\n');
  console.log(`  {
    ...
    "_urls": {
      "website":   "https://theirbiz.com",
      "facebook":  "https://facebook.com/theirbiz",
      "instagram": "https://instagram.com/theirbiz"
    }
  }\n`);
  console.log('Required .env for Monday.com:\n');
  console.log('  MONDAY_API_KEY=<your monday api token>');
  console.log('  MONDAY_CRM_BOARD_ID=<board id from setup-monday.js output>\n');
}

// ─── Entry point ──────────────────────────────────────────────────────────────

async function main() {
  const args = process.argv.slice(2);

  if (args.includes('--help') || args.includes('-h')) { showHelp(); return; }
  if (args.includes('--industries')) { printHeader(); printIndustries(); return; }

  // Monday.com dashboard setup
  if (args.includes('--setup-monday')) {
    const boardId = process.env.MONDAY_CRM_BOARD_ID;
    if (!boardId) { console.error('MONDAY_CRM_BOARD_ID not set in .env'); process.exit(1); }
    console.log('Creating Monday.com dashboard...');
    const result = await ensureDashboard(boardId);
    if (result?.dashUrl) console.log(`Dashboard created: ${result.dashUrl}`);
    else console.log('Dashboard setup complete (may already exist — check Monday.com)');
    return;
  }

  const fileIdx  = args.indexOf('--file');
  const batchIdx = args.indexOf('--batch');

  // Support URL + screenshot flags when using --file mode
  const websiteIdx = args.indexOf('--website');
  const fbIdx      = args.indexOf('--fb');
  const igIdx      = args.indexOf('--ig');

  try {
    if (fileIdx !== -1 && args[fileIdx + 1]) {
      let customer = JSON.parse(fs.readFileSync(args[fileIdx + 1], 'utf8'));

      const urls = {
        website:   (websiteIdx !== -1 && args[websiteIdx + 1]) || customer._urls?.website,
        facebook:  (fbIdx !== -1 && args[fbIdx + 1])           || customer._urls?.facebook,
        instagram: (igIdx !== -1 && args[igIdx + 1])           || customer._urls?.instagram
      };

      // Collect all --screenshot flags (can pass multiple)
      const screenshots = [];
      for (let i = 0; i < args.length; i++) {
        if (args[i] === '--screenshot' && args[i + 1]) {
          screenshots.push({ path: args[i + 1], label: path.basename(args[i + 1], path.extname(args[i + 1])) });
        }
      }

      if (urls.website || urls.facebook || urls.instagram || screenshots.length) {
        console.log('Researching online presence...\n');
        const enriched = await researchCustomer(urls, customer, screenshots);
        if (enriched) customer = enriched;
      }

      await fileMode(args[fileIdx + 1]);
    } else if (batchIdx !== -1 && args[batchIdx + 1]) {
      await batchMode(args[batchIdx + 1]);
    } else {
      await interactiveMode();
    }
  } catch (err) {
    console.error(`\nError: ${err.message}\n`);
    process.exit(1);
  }
}

main();