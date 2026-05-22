const { Jimp } = require('jimp');
const fs = require('fs');

async function removeShadow() {
  const src = 'assets/images/vcs-logo.png';
  const backup = 'assets/images/vcs-logo-original.png';

  // Back up original once
  if (!fs.existsSync(backup)) fs.copyFileSync(src, backup);

  const image = await Jimp.read(src);
  const { width, height } = image;

  image.scan(0, 0, width, height, function(x, y, idx) {
    const r = this.bitmap.data[idx];
    const g = this.bitmap.data[idx + 1];
    const b = this.bitmap.data[idx + 2];
    const a = this.bitmap.data[idx + 3];

    if (a < 20) return; // already transparent

    // Shadow = warm tan/beige: R significantly > B, and mid-range brightness
    // Text  = cold teal/navy:  B >= R (blue dominant)
    const isWarm = (r - b) > 15 && r < 245;
    if (isWarm) {
      this.bitmap.data[idx + 3] = 0; // make transparent
    }
  });

  await image.write(src);
  console.log('Done — shadow pixels removed.');
}

removeShadow().catch(console.error);