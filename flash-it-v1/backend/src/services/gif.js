'use strict';
const GIFEncoder = require('gif-encoder-2');
const sharp = require('sharp');

const GIF_WIDTH = 800;
const GIF_HEIGHT = 600;

/**
 * Create an animated GIF from an array of image Buffers or URLs.
 * @param {Buffer[]|string[]} frames - image Buffers or http(s) URLs
 * @param {object} opts
 * @param {number} opts.delay - ms per frame (default 500)
 * @param {boolean} opts.boomerang - ping-pong frames (default false)
 * @returns {Promise<Buffer>} GIF buffer
 */
async function createGif(frames, opts = {}) {
  const { delay = 500, boomerang = false } = opts;

  // Normalize: download URLs or decode base64 data URIs → Buffers
  const buffers = await Promise.all(
    frames.map(async (f) => {
      if (typeof f === 'string') {
        if (f.startsWith('data:')) {
          const base64 = f.replace(/^data:image\/\w+;base64,/, '');
          return Buffer.from(base64, 'base64');
        }
        const { default: fetch } = require('node-fetch');
        const res = await fetch(f);
        return Buffer.from(await res.arrayBuffer());
      }
      return f;
    })
  );

  // Resize all frames to consistent size and get raw RGBA pixels
  const rawFrames = await Promise.all(
    buffers.map((buf) =>
      sharp(buf)
        .resize(GIF_WIDTH, GIF_HEIGHT, { fit: 'cover' })
        .ensureAlpha()
        .raw()
        .toBuffer()
    )
  );

  // Boomerang: append reversed frames (excluding first and last to avoid freeze)
  const allFrames = boomerang
    ? [...rawFrames, ...rawFrames.slice(1, -1).reverse()]
    : rawFrames;

  const encoder = new GIFEncoder(GIF_WIDTH, GIF_HEIGHT, 'neuquant', true);
  encoder.setDelay(delay);
  encoder.setRepeat(0); // loop forever
  encoder.start();

  for (const rawBuf of allFrames) {
    encoder.addFrame(rawBuf);
  }
  encoder.finish();

  return encoder.out.getData();
}

module.exports = { createGif };
