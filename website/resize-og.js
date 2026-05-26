const { Jimp } = require('jimp');

async function resizeOG() {
  const src = 'assets/images/og-image.jpg';
  const orig = await Jimp.read(src);
  const oW = orig.width, oH = orig.height;

  const W = 1200, H = 630;

  // Scale original to fit within H×H, centered on a 1200×630 navy canvas
  const scale = H / oH;
  const sW = Math.round(oW * scale); // ~630
  const sH = H;

  // Bilinear scale
  const scaled = Buffer.alloc(sW * sH * 4);
  for (let y = 0; y < sH; y++) {
    for (let x = 0; x < sW; x++) {
      const sx = x / scale, sy = y / scale;
      const x1 = Math.floor(sx), y1 = Math.floor(sy);
      const x2 = Math.min(x1 + 1, oW - 1), y2 = Math.min(y1 + 1, oH - 1);
      const dx = sx - x1, dy = sy - y1;
      const di = (y * sW + x) * 4;
      for (let c = 0; c < 4; c++) {
        scaled[di + c] = Math.round(
          orig.bitmap.data[(y1 * oW + x1) * 4 + c] * (1-dx)*(1-dy) +
          orig.bitmap.data[(y1 * oW + x2) * 4 + c] * dx*(1-dy) +
          orig.bitmap.data[(y2 * oW + x1) * 4 + c] * (1-dx)*dy +
          orig.bitmap.data[(y2 * oW + x2) * 4 + c] * dx*dy
        );
      }
    }
  }

  // Navy background canvas 1200×630
  const bg = Buffer.alloc(W * H * 4);
  for (let i = 0; i < W * H; i++) {
    bg[i*4]=13; bg[i*4+1]=27; bg[i*4+2]=62; bg[i*4+3]=255;
  }

  // Composite scaled image centered horizontally
  const ox = Math.round((W - sW) / 2);
  for (let y = 0; y < sH; y++) {
    for (let x = 0; x < sW; x++) {
      const si = (y * sW + x) * 4;
      const di = (y * W + (x + ox)) * 4;
      bg[di]=scaled[si]; bg[di+1]=scaled[si+1];
      bg[di+2]=scaled[si+2]; bg[di+3]=scaled[si+3];
    }
  }

  const out = Jimp.fromBitmap({ data: bg, width: W, height: H });
  await out.write(src);
  console.log(`Done — resized to ${W}×${H}`);
}

resizeOG().catch(console.error);
