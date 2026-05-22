const { Jimp } = require('jimp');

async function analyze() {
  const image = await Jimp.read('assets/images/vcs-logo.png');
  const width = image.width;
  const height = image.height;

  console.log(`Size: ${width}x${height}`);

  const buckets = {};
  image.scan(0, 0, width, height, function(x, y, idx) {
    const r = this.bitmap.data[idx];
    const g = this.bitmap.data[idx + 1];
    const b = this.bitmap.data[idx + 2];
    const a = this.bitmap.data[idx + 3];
    if (a < 10) return;
    const key = `r${Math.round(r/15)*15} g${Math.round(g/15)*15} b${Math.round(b/15)*15} a${Math.round(a/50)*50}`;
    buckets[key] = (buckets[key] || 0) + 1;
  });

  Object.entries(buckets)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 30)
    .forEach(([k, v]) => console.log(`  ${v.toString().padStart(6)} px — ${k}`));
}

analyze().catch(console.error);