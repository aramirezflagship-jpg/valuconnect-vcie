const fs = require('fs');
const path = require('path');

const LOG_FILE = process.env.LOG_FILE || './logs/run-history.jsonl';

function log(entry) {
  const line = JSON.stringify({ timestamp: new Date().toISOString(), ...entry }) + '\n';
  fs.mkdirSync(path.dirname(LOG_FILE), { recursive: true });
  fs.appendFileSync(LOG_FILE, line, 'utf8');
}

function info(message, data = {}) {
  log({ level: 'info', message, ...data });
  console.log(`[INFO] ${message}`, data);
}

function warn(message, data = {}) {
  log({ level: 'warn', message, ...data });
  console.warn(`[WARN] ${message}`, data);
}

function error(message, data = {}) {
  log({ level: 'error', message, ...data });
  console.error(`[ERROR] ${message}`, data);
}

function runStart(runId) {
  log({ level: 'run', event: 'start', runId });
  console.log(`\n=== VCIE Run Started: ${runId} ===`);
}

function runEnd(runId, summary) {
  log({ level: 'run', event: 'end', runId, summary });
  console.log(`=== VCIE Run Complete: ${runId} ===\n`, summary);
}

module.exports = { info, warn, error, runStart, runEnd };
