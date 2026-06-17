/**
 * face.js — client-side face detection + crop for Character ("face in the hole")
 * mode, built on @vladmandic/face-api (already bundled).
 *
 * Models are served locally from /public/models (tiny_face_detector +
 * face_landmark_68_tiny) — the same set Props.jsx loads. We only need the
 * detector here, but we keep the loader resilient: if model loading fails the
 * caller falls back to a centered crop and the flow never hard-fails.
 */

let _faceapi = null;
let _modelsPromise = null;

/**
 * Lazily import face-api and load the tiny detector model from /models.
 * Resolves to the faceapi module, or `null` if loading failed (caller should
 * then fall back to a centered crop).
 */
export async function loadFaceModels() {
  if (_modelsPromise) return _modelsPromise;
  _modelsPromise = (async () => {
    try {
      const faceapi = await import('@vladmandic/face-api');
      await faceapi.nets.tinyFaceDetector.loadFromUri('/models');
      _faceapi = faceapi;
      return faceapi;
    } catch (err) {
      console.warn('[face] model load failed — character crop will fall back to center.', err);
      return null;
    }
  })();
  return _modelsPromise;
}

/**
 * Detect the largest face in a video/image/canvas element.
 * @param {HTMLVideoElement|HTMLImageElement|HTMLCanvasElement} source
 * @returns {Promise<{x,y,width,height}|null>} bounding box in source pixels, or null
 */
export async function detectLargestFace(source) {
  const faceapi = await loadFaceModels();
  if (!faceapi || !source) return null;
  try {
    const results = await faceapi.detectAllFaces(
      source,
      new faceapi.TinyFaceDetectorOptions({ inputSize: 320, scoreThreshold: 0.4 })
    );
    if (!results || results.length === 0) return null;
    // Largest by area.
    let best = results[0].box;
    let bestArea = best.width * best.height;
    for (const r of results) {
      const area = r.box.width * r.box.height;
      if (area > bestArea) {
        best = r.box;
        bestArea = area;
      }
    }
    return { x: best.x, y: best.y, width: best.width, height: best.height };
  } catch (err) {
    console.warn('[face] detection error — falling back to center crop.', err);
    return null;
  }
}

/**
 * Expand a face box by `pad` (fraction) for headroom/hair/chin, then clamp to
 * the source bounds. Returns an integer, square-ish box.
 *
 * @param {{x,y,width,height}} box
 * @param {number} srcW
 * @param {number} srcH
 * @param {number} [pad=0.35]  expansion fraction (~30–40% headroom)
 * @returns {{x,y,width,height}}
 */
export function expandBox(box, srcW, srcH, pad = 0.35) {
  const cx = box.x + box.width / 2;
  const cy = box.y + box.height / 2;
  // Use the larger dimension and grow it — keeps the crop square so it maps
  // cleanly into oval/rect face slots without distortion.
  const base = Math.max(box.width, box.height);
  let size = base * (1 + pad);
  // Don't exceed the source.
  size = Math.min(size, srcW, srcH);
  let x = Math.round(cx - size / 2);
  let y = Math.round(cy - size / 2);
  // Clamp.
  x = Math.max(0, Math.min(x, srcW - size));
  y = Math.max(0, Math.min(y, srcH - size));
  return { x: Math.round(x), y: Math.round(y), width: Math.round(size), height: Math.round(size) };
}

/**
 * A centered square crop covering ~60% of the smaller dimension — the fallback
 * when no face is detected. Never hard-fails the capture.
 */
export function centeredFallbackBox(srcW, srcH) {
  const size = Math.round(Math.min(srcW, srcH) * 0.6);
  const x = Math.round((srcW - size) / 2);
  // Bias slightly upward — faces sit above center in a portrait frame.
  const y = Math.round((srcH - size) / 2 - size * 0.1);
  return {
    x: Math.max(0, x),
    y: Math.max(0, Math.min(y, srcH - size)),
    width: size,
    height: size,
  };
}

/**
 * Crop a source image element/canvas to a box and return a data-URI (PNG to
 * preserve any future transparency; the backend masks it into the face slot).
 *
 * @param {HTMLImageElement|HTMLCanvasElement|HTMLVideoElement} source
 * @param {{x,y,width,height}} box
 * @param {number} [outSize=600]  output canvas size (square)
 * @returns {string} data-URI
 */
export function cropToDataURL(source, box, outSize = 600) {
  const canvas = document.createElement('canvas');
  canvas.width = outSize;
  canvas.height = outSize;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(source, box.x, box.y, box.width, box.height, 0, 0, outSize, outSize);
  return canvas.toDataURL('image/png');
}

/**
 * Convenience: from a captured photo source, detect → expand → crop → dataURL.
 * Always returns a face data-URI (uses the centered fallback if detection fails).
 *
 * @param {HTMLImageElement|HTMLCanvasElement} source  the full captured photo
 * @returns {Promise<{ faceImageBase64: string, detected: boolean }>}
 */
export async function detectAndCropFace(source) {
  const srcW = source.naturalWidth || source.videoWidth || source.width;
  const srcH = source.naturalHeight || source.videoHeight || source.height;

  const detected = await detectLargestFace(source);
  const box = detected
    ? expandBox(detected, srcW, srcH, 0.35)
    : centeredFallbackBox(srcW, srcH);

  return {
    faceImageBase64: cropToDataURL(source, box),
    detected: !!detected,
  };
}

/**
 * Decode a Blob (e.g. the captured JPEG) into an HTMLImageElement so it can be
 * fed to detection/crop. Resolves once the image is fully loaded.
 * @param {Blob} blob
 * @returns {Promise<HTMLImageElement>}
 */
export function blobToImage(blob) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = () => {
      resolve(img);
      // Revoke on next tick so callers can still draw from it.
      setTimeout(() => URL.revokeObjectURL(url), 0);
    };
    img.onerror = (e) => {
      URL.revokeObjectURL(url);
      reject(e);
    };
    img.src = url;
  });
}

/**
 * Convert a Blob to a data-URI string (for natural-mode imageBase64).
 * @param {Blob} blob
 * @returns {Promise<string>}
 */
export function blobToDataURL(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}
