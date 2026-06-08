'use strict';

const path = require('path');
const fs = require('fs');
const fsExtra = require('fs-extra');
const axios = require('axios');

/**
 * Download a photo from a URL to a local temp file.
 *
 * @param {string} photoUrl  - Remote URL of the photo
 * @param {string} jobId     - Print job ID (used as filename)
 * @param {string} tempDir   - Local directory to save to
 * @returns {Promise<string>} Local file path of the downloaded image
 */
async function downloadPhoto(photoUrl, jobId, tempDir) {
  await fsExtra.ensureDir(tempDir);

  const localPath = path.join(tempDir, `${jobId}.jpg`);

  const response = await axios.get(photoUrl, {
    responseType: 'stream',
    timeout: 30000, // 30 second timeout for image downloads
  });

  await new Promise((resolve, reject) => {
    const writer = fs.createWriteStream(localPath);
    response.data.pipe(writer);
    writer.on('finish', resolve);
    writer.on('error', reject);
  });

  return localPath;
}

module.exports = { downloadPhoto };
