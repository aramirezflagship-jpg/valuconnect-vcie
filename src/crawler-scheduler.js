require('dotenv').config();
const cron = require('node-cron');
const axios = require('axios');
const logger = require('./logger');
const { discoverLeads } = require('./lead-discovery');
const { saveProspect } = require('./valuconnect-crm');

/**
 * Scheduled lead discovery.
 *
 * The schedule is owned by the CRM (so Andres changes it in the UI, not in a
 * file), but the crawl runs here because this is where the Firecrawl key and
 * the discovery code live. Each run reports itself back so the CRM can show
 * what happened.
 */

function engineUrl() { return (process.env.LEAK_ENGINE_URL || '').replace(/\/+$/, ''); }
function auth() { return { Authorization: `Bearer ${process.env.INTERNAL_API_TOKEN || ''}` }; }

let task = null;         // the live cron task
let appliedCron = null;  // the expression that task was built from
let running = false;     // guards against overlapping runs

async function fetchSchedule() {
  if (!engineUrl() || !process.env.INTERNAL_API_TOKEN) return null;
  try {
    const res = await axios.get(`${engineUrl()}/api/sales/import/schedule`, { headers: auth(), timeout: 12000 });
    return res.data?.schedule || null;
  } catch (err) {
    logger.warn(`[CrawlerScheduler] could not read schedule: ${err.response?.status || err.code || err.message}`);
    return null;
  }
}

async function reportRunStart(industryId, city) {
  try {
    const res = await axios.post(`${engineUrl()}/api/sales/import/runs`,
      { industryId, city }, { headers: auth(), timeout: 12000 });
    return res.data?.runId ?? null;
  } catch { return null; }
}

async function reportRunEnd(runId, payload) {
  if (runId == null) return;
  try {
    await axios.patch(`${engineUrl()}/api/sales/import/runs/${runId}`, payload, { headers: auth(), timeout: 12000 });
  } catch { /* the run still happened; losing the bookkeeping is not worth failing over */ }
}

/** One industry x city sweep, start to finish. */
async function runOnce(schedule, industryId, city) {
  const runId = await reportRunStart(industryId, city);
  let found = 0, imported = 0;

  try {
    const leads = await discoverLeads({
      industryId,
      city,
      limit: Number(schedule.perRun) || 10,
      minScore: Number(schedule.minScore) || 40
    });
    found = leads.length;

    for (const lead of leads) {
      const saved = await saveProspect(lead);
      if (saved.ok) imported++;
      else logger.warn(`[CrawlerScheduler] ${lead.businessName} not saved: ${saved.reason}`);
    }

    logger.info(`[CrawlerScheduler] ${industryId} / ${city}: found ${found}, imported ${imported}`);
    await reportRunEnd(runId, { found, imported });
  } catch (err) {
    logger.warn(`[CrawlerScheduler] run failed (${industryId} / ${city}): ${err.message}`);
    await reportRunEnd(runId, { found, imported, error: err.message });
  }
}

/** Every industry x every city, sequentially - Firecrawl and Claude both bill per call. */
async function runAll(schedule) {
  if (running) {
    logger.warn('[CrawlerScheduler] previous run still going; skipping this tick');
    return;
  }
  running = true;
  try {
    const industries = schedule.industries || [];
    const cities = schedule.cities || [];
    if (!industries.length || !cities.length) {
      logger.warn('[CrawlerScheduler] enabled but no industries/cities set - nothing to crawl');
      return;
    }
    for (const industryId of industries) {
      for (const city of cities) {
        await runOnce(schedule, industryId, city);
      }
    }
  } finally {
    running = false;
  }
}

/**
 * Claim a "Run now" queued from the CRM.
 *
 * The engine cannot call this service - it is not publicly reachable - so the
 * button leaves a request and we pick it up here. Claiming clears it on the
 * engine BEFORE the crawl starts, so a long run cannot be triggered twice by
 * the next poll landing while it is still going.
 */
async function claimManualRun(schedule) {
  if (!schedule.runRequestedAt) return false;
  try {
    await axios.post(`${engineUrl()}/api/sales/import/run-claimed`, {}, { headers: auth(), timeout: 12000 });
  } catch (err) {
    logger.warn(`[CrawlerScheduler] could not claim the manual run: ${err.message}`);
    return false; // leave it queued rather than run it and lose the record
  }
  logger.info(`[CrawlerScheduler] manual run requested by ${schedule.runRequestedBy || 'the CRM'}`);
  return true;
}

/** Rebuild the cron task whenever the CRM's schedule changes. */
async function sync() {
  const schedule = await fetchSchedule();
  if (!schedule) return;

  // A manual run happens regardless of whether the cron is enabled.
  if (await claimManualRun(schedule)) {
    runAll(schedule).catch(e => logger.warn(`[CrawlerScheduler] manual run failed: ${e.message}`));
  }

  if (!schedule.enabled) {
    if (task) { task.stop(); task = null; appliedCron = null; logger.info('[CrawlerScheduler] disabled'); }
    return;
  }
  if (!cron.validate(schedule.cron)) {
    logger.warn(`[CrawlerScheduler] invalid cron "${schedule.cron}" - not scheduling`);
    return;
  }
  if (task && appliedCron === schedule.cron) return; // already on the right cadence

  if (task) task.stop();
  appliedCron = schedule.cron;
  task = cron.schedule(schedule.cron, async () => {
    const fresh = (await fetchSchedule()) || schedule;
    if (!fresh.enabled) return;
    await runAll(fresh);
  });
  logger.info(`[CrawlerScheduler] scheduled "${schedule.cron}" (${(schedule.industries || []).length} industries x ${(schedule.cities || []).length} cities)`);
}

function start() {
  if (!engineUrl() || !process.env.INTERNAL_API_TOKEN) {
    logger.warn('[CrawlerScheduler] LEAK_ENGINE_URL / INTERNAL_API_TOKEN not set - scheduler idle');
    return;
  }
  sync();
  // Poll every 60s. It is one small authenticated GET, and it is also how a
  // "Run now" from the CRM reaches this service - five minutes would feel broken.
  setInterval(sync, 60 * 1000);
}

/** Manual trigger, for the "Run now" path. */
async function runNow() {
  const schedule = await fetchSchedule();
  if (!schedule) throw new Error('Could not read the schedule from the CRM');
  await runAll(schedule);
  return true;
}

module.exports = { start, sync, runNow };
