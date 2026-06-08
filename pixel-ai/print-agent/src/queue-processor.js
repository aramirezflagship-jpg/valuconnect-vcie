'use strict';

const path = require('path');
const fsExtra = require('fs-extra');
const { pollPrintQueue } = require('./poller');
const { downloadPhoto } = require('./downloader');
const { printFile } = require('./printer');
const { markPrinted } = require('./reporter');

/**
 * One full poll-and-print cycle.
 * Fetches pending jobs, downloads + prints each, marks as done.
 *
 * @param {object} config
 * @param {object} logger
 * @returns {Promise<{ printed: number, failed: number }>}
 */
async function pollAndPrint(config, logger) {
  const jobs = await pollPrintQueue(config, logger);
  if (jobs.length === 0) return { printed: 0, failed: 0 };

  let printed = 0;
  let failed = 0;

  for (const job of jobs) {
    const { id, photoUrl, copies = 1 } = job;
    let localPath = null;

    try {
      logger.info(`Processing job ${id} — ${photoUrl}`);

      // 1. Download photo to temp dir
      localPath = await downloadPhoto(photoUrl, id, config.tempDir, logger);

      // 2. Send to printer
      await printFile(localPath, config.printerName, copies, logger);

      // 3. Report success
      await markPrinted(id, 'printed', config, logger);
      printed++;
    } catch (err) {
      logger.error(`Job ${id} failed: ${err.message}`);
      await markPrinted(id, 'failed', config, logger, err.message);
      failed++;
    } finally {
      // Clean up temp file regardless of outcome
      if (localPath) {
        fsExtra.remove(localPath).catch(() => {});
      }
    }
  }

  if (printed > 0 || failed > 0) {
    logger.info(`Cycle complete — printed: ${printed}, failed: ${failed}`);
  }

  return { printed, failed };
}

module.exports = { pollAndPrint };
