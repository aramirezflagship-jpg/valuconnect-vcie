'use strict';

const axios = require('axios');

/**
 * Mark a print job as printed (or failed) on the backend.
 *
 * @param {string} jobId
 * @param {'printed'|'failed'} status
 * @param {object} config - { backendUrl, adminSecret }
 * @param {object} logger
 * @param {string} [errorMessage] - included when status is 'failed'
 */
async function markPrinted(jobId, status, config, logger, errorMessage) {
  const url = `${config.backendUrl}/api/admin/print-queue/${jobId}`;
  const body = { status, printedAt: new Date().toISOString() };
  if (errorMessage) body.error = errorMessage;

  try {
    await axios.patch(url, body, {
      headers: { 'X-Admin-Secret': config.adminSecret },
      timeout: 8000,
    });
    logger.info(`Job ${jobId} marked as ${status}`);
    return { success: true };
  } catch (err) {
    logger.warn(`Could not mark job ${jobId} as ${status}: ${err.message}`);
    return { success: false, error: err.message };
  }
}

module.exports = { markPrinted };
