'use strict';

const { exec } = require('child_process');

/**
 * Wait for a given number of milliseconds.
 */
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Run a shell command and return { stdout, stderr }.
 * Resolves on exit code 0, rejects otherwise.
 */
function runCommand(cmd) {
  return new Promise((resolve, reject) => {
    exec(cmd, { timeout: 30000 }, (err, stdout, stderr) => {
      if (err) {
        reject(Object.assign(err, { stdout, stderr }));
      } else {
        resolve({ stdout, stderr });
      }
    });
  });
}

/**
 * Send a file to the printer.
 *
 * Tries mspaint /pt first (simplest, no extra dependencies).
 * Falls back to PowerShell Start-Process -Verb PrintTo if mspaint fails.
 *
 * @param {string} filePath    - Absolute path to the image file
 * @param {string} printerName - Windows printer name (e.g. "DNP DS-RX1HS")
 * @param {number} copies      - Number of copies to print
 * @param {object} logger      - winston logger instance
 * @returns {Promise<{ success: boolean, method: string }>}
 */
async function printFile(filePath, printerName, copies, logger) {
  const numCopies = copies && copies > 0 ? copies : 1;

  for (let i = 0; i < numCopies; i++) {
    const copyLabel = numCopies > 1 ? ` (copy ${i + 1}/${numCopies})` : '';

    // ── Attempt 1: mspaint /pt ────────────────────────────────────────────────
    const mspaintCmd = `mspaint /pt "${filePath}" "${printerName}"`;
    logger.info(`Printing${copyLabel} via mspaint: ${mspaintCmd}`);

    let mspaintErrMsg = null;
    try {
      await runCommand(mspaintCmd);
      // Give the spooler a moment to receive the job before continuing
      await sleep(2000);
      logger.info(`Print spooled${copyLabel} via mspaint`);
      continue; // next copy
    } catch (mspaintErr) {
      mspaintErrMsg = mspaintErr.message;
      logger.warn(`mspaint failed${copyLabel}: ${mspaintErrMsg} — trying PowerShell fallback`);
    }

    // ── Attempt 2: PowerShell Start-Process -Verb PrintTo ────────────────────
    const psCmd =
      `powershell -Command "Start-Process -FilePath '${filePath}' -Verb PrintTo -ArgumentList '${printerName}'"`;
    logger.info(`Printing${copyLabel} via PowerShell: ${psCmd}`);

    try {
      await runCommand(psCmd);
      await sleep(2000);
      logger.info(`Print spooled${copyLabel} via PowerShell`);
    } catch (psErr) {
      // Both methods failed — bubble up so the job can be marked failed
      throw new Error(`Both print methods failed. mspaint: ${mspaintErrMsg} | PowerShell: ${psErr.message}`);
    }
  }

  // Determine which method ultimately succeeded (rough heuristic: if we got here, success)
  return { success: true, method: 'mspaint/powershell' };
}

module.exports = { printFile };
