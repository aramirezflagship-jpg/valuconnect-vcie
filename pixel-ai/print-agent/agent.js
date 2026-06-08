'use strict';

require('dotenv').config();

const path = require('path');
const fsExtra = require('fs-extra');
const { createLogger, format, transports } = require('winston');
const { pollAndPrint } = require('./src/queue-processor');

// ── Config ────────────────────────────────────────────────────────────────────

const config = {
  backendUrl: process.env.PIXEL_AI_BACKEND_URL || 'http://localhost:3000',
  adminSecret: process.env.ADMIN_SECRET || '',
  pollIntervalSeconds: parseInt(process.env.POLL_INTERVAL_SECONDS || '5', 10),
  printerName: process.env.PRINTER_NAME || 'DNP DS-RX1HS',
  tempDir: process.env.TEMP_DIR || 'C:\\PixelAI\\temp',
  logDir: process.env.LOG_DIR || 'C:\\PixelAI\\logs',
};

// ── Logger ────────────────────────────────────────────────────────────────────

fsExtra.ensureDirSync(config.logDir);

const logger = createLogger({
  level: 'info',
  format: format.combine(
    format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    format.printf(({ timestamp, level, message }) => `[${timestamp}] ${level.toUpperCase()}: ${message}`)
  ),
  transports: [
    new transports.Console(),
    new transports.File({
      filename: path.join(config.logDir, 'print-agent.log'),
      maxsize: 5 * 1024 * 1024, // 5 MB
      maxFiles: 5,
      tailable: true,
    }),
  ],
});

// Export logger so other modules can use it
module.exports.logger = logger;

// ── Startup ───────────────────────────────────────────────────────────────────

console.log('');
console.log('╔══════════════════════════════════════════════╗');
console.log('║     Pixel AI Print Agent v1.0                ║');
console.log('║     Press Ctrl+C to stop                     ║');
console.log('╚══════════════════════════════════════════════╝');
console.log('');

logger.info(`Printer : ${config.printerName}`);
logger.info(`Backend : ${config.backendUrl}`);
logger.info(`Poll    : every ${config.pollIntervalSeconds}s`);
logger.info(`Temp dir: ${config.tempDir}`);
logger.info(`Log dir : ${config.logDir}`);
logger.info('Agent started — polling for print jobs...');

// ── Poll loop ─────────────────────────────────────────────────────────────────

let running = false; // prevent overlapping poll cycles

const interval = setInterval(async () => {
  if (running) return; // skip tick if previous cycle still in progress
  running = true;
  try {
    await pollAndPrint(config, logger);
  } catch (err) {
    logger.error(`Unexpected error in poll cycle: ${err.message}`);
  } finally {
    running = false;
  }
}, config.pollIntervalSeconds * 1000);

// ── Graceful shutdown ─────────────────────────────────────────────────────────

process.on('SIGINT', async () => {
  logger.info('Shutting down — cleaning up temp files...');
  clearInterval(interval);

  try {
    await fsExtra.emptyDir(config.tempDir);
    logger.info('Temp directory cleared.');
  } catch (err) {
    logger.warn(`Could not clear temp dir: ${err.message}`);
  }

  logger.info('Goodbye.');
  process.exit(0);
});
