const { Jimp } = require('jimp');

async function sharpenAndScale() {
  const src = 'assets/images/vcs-logo.png';
  const image = await Jimp.read('assets/images/vcs-logo-original.png');
  const { width, height } = image;

  // ── Step 1: remove shadow (warm-tone pixels) ──────────────────────────────
  image.scan(0, 0, width, height, function(x, y, idx) {
    const r = this.bitmap.data[idx];
    const b = this.bitmap.data[idx + 2];
    const a = this.bitmap.data[idx + 3];
    if (a < 20) return;
    if ((r - b) > 20 && r > 130) {
      this.bitmap.data[idx + 3] = 0;
    }
  });

  // ── Step 2: unsharp mask (3×3 convolution) ────────────────────────────────
  const srcData = Buffer.from(image.bitmap.data);
  const kernel = [
    [0, -0.35, 0],
    [-0.35, 2.4, -0.35],
    [0, -0.35, 0],
  ];

  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const idx = (y * width + x) * 4;
      if (srcData[idx + 3] < 20) continue;
      for (let c = 0; c < 3; c++) {
        let val = 0;
        for (let ky = -1; ky <= 1; ky++) {
          for (let kx = -1; kx <= 1; kx++) {
            val += srcData[((y + ky) * width + (x + kx)) * 4 + c] * kernel[ky + 1][kx + 1];
          }
        }
        image.bitmap.data[idx + c] = Math.min(255, Math.max(0, Math.round(val)));
      }
    }
  }

  // ── Step 3: scale 2× with bilinear interpolation ──────────────────────────
  const W2 = width * 2;
  const H2 = height * 2;
  const out = Buffer.alloc(W2 * H2 * 4);

  for (let y = 0; y < H2; y++) {
    for (let x = 0; x < W2; x++) {
      const sx = x / 2, sy = y / 2;
      const x1 = Math.floor(sx), y1 = Math.floor(sy);
      const x2 = Math.min(x1 + 1, width - 1);
      const y2 = Math.min(y1 + 1, height - 1);
      const dx = sx - x1, dy = sy - y1;
      const di = (y * W2 + x) * 4;
      for (let c = 0; c < 4; c++) {
        const i11 = (y1 * width + x1) * 4 + c;
        const i21 = (y1 * width + x2) * 4 + c;
        const i12 = (y2 * width + x1) * 4 + c;
        const i22 = (y2 * width + x2) * 4 + c;
        out[di + c] = Math.round(
          image.bitmap.data[i11] * (1 - dx) * (1 - dy) +
          image.bitmap.data[i21] * dx * (1 - dy) +
          image.bitmap.data[i12] * (1 - dx) * dy +
          image.bitmap.data[i22] * dx * dy
        );
      }
    }
  }

  image.bitmap.data = out;
  image.bitmap.width = W2;
  image.bitmap.height = H2;

  await image.write(src);
  console.log(`Done — logo sharpened & scaled to ${W2}×${H2} (2× retina).`);
}

sharpenAndScale().catch(console.error);