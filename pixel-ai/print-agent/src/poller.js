'use strict';

const axios = require('axios');

/**
 * Poll the backend print queue for pending jobs.
 *
 * @param {object} config - { backendUrl, adminSecret }
 * @param {object} logger - winston logger instance
 * @returns {Promise<Array>} Array of pending print jobs, or [] on error
 */
async function pollPrintQueue(config, logger) {
  const url = `${config.backendUrl}/api/admin/print-queue`;

  try {
    const response = await axios.get(url, {
      headers: {
        'X-Admin-Secret': config.adminSecret,
      },
      timeout: 10000, // 10 second timeout
    });

    const jobs = Array.isArray(response.data) ? response.data : [];

    if (jobs.length > 0) {
      logger.info(`Poll: ${jobs.length} job(s) pending`);
    }

    return jobs;
  } catch (err) {
    if (err.response) {
      logger.warn(`Poll failed — HTTP ${err.response.status}: ${err.response.statusText}`);
    } else if (err.code === 'ECONNREFUSED' || err.code === 'ENOTFOUND') {
      logger.warn(`Poll failed — cannot reach backend (${err.code}). Will retry next tick.`);
    } else {
      logger.warn(`Poll failed — ${err.message}. Will retry next tick.`);
    }
    return [];
  }
}

module.exports = { pollPrintQueue };
