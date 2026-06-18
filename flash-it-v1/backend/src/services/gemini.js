'use strict';

/**
 * Google Gemini image generation — ADMIN TEMPLATE CREATION ONLY.
 *
 * This is NOT used in the guest capture path (which stays AI-free / $0 per
 * photo). It lets the admin generate themed background/character artwork that
 * lands in the backgrounds catalogue.
 *
 * Uses the Gemini API image-generation model via :generateContent, which
 * returns the image inline as base64. The model id is configurable via
 * GEMINI_IMAGE_MODEL so we can point at whatever the current image-capable
 * model is without a code change.
 */

const sharp = require('sharp');

const DEFAULT_MODEL = 'gemini-2.5-flash-image';
const API_BASE = 'https://generativelanguage.googleapis.com/v1beta';

function isConfigured() {
  return !!process.env.GEMINI_API_KEY;
}

function _model() {
  return process.env.GEMINI_IMAGE_MODEL || DEFAULT_MODEL;
}

function _fetch() {
  return require('node-fetch').default || require('node-fetch');
}

/**
 * List the models the key can see + which ones support generateContent.
 * Used to discover the correct image-generation model id at runtime.
 */
async function listModels() {
  const key = process.env.GEMINI_API_KEY;
  if (!key) {
    const err = new Error('AI image generation is not configured (GEMINI_API_KEY missing).');
    err.status = 503;
    throw err;
  }
  const fetch = _fetch();
  const res = await fetch(`${API_BASE}/models?pageSize=100`, {
    headers: { 'x-goog-api-key': key },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(`Gemini models list error: ${data?.error?.message || res.status}`);
    err.status = 502;
    err.detail = data?.error || data;
    throw err;
  }
  return (data.models || []).map((m) => ({
    name: m.name,
    methods: m.supportedGenerationMethods || [],
  }));
}

/**
 * Generate an image from a text prompt. Returns a PNG/JPEG Buffer.
 * Throws an error with .status = 503 if GEMINI_API_KEY is not set.
 */
async function generateImage(prompt) {
  const key = process.env.GEMINI_API_KEY;
  if (!key) {
    const err = new Error('AI image generation is not configured (GEMINI_API_KEY missing).');
    err.status = 503;
    throw err;
  }

  const model = _model();
  const fetch = _fetch();
  const url = `${API_BASE}/models/${model}:generateContent`;
  const body = {
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    generationConfig: { responseModalities: ['TEXT', 'IMAGE'] },
  };

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    const msg = data?.error?.message || `HTTP ${res.status}`;
    const err = new Error(`Gemini image API (${model}): ${msg}`);
    err.status = res.status === 429 ? 429 : 502;
    err.detail = data?.error || data;
    throw err;
  }

  const parts =
    (data.candidates && data.candidates[0] && data.candidates[0].content && data.candidates[0].content.parts) || [];
  const imgPart = parts.find((p) => p.inlineData && p.inlineData.data);
  if (!imgPart) {
    const err = new Error('Gemini returned no image data for this prompt.');
    err.status = 502;
    err.detail = JSON.stringify(data).slice(0, 500);
    throw err;
  }
  return Buffer.from(imgPart.inlineData.data, 'base64');
}

/**
 * Punch a transparent hole at the faceSlot in an artwork buffer so a guest's
 * face shows through in character mode. Sharp "dest-out" compositing: the
 * opaque mask shape erases the matching region of the artwork.
 */
async function punchFaceHole(buffer, faceSlot, canvasWidth = 1200, canvasHeight = 1800) {
  if (!faceSlot) return buffer;
  const { x, y, width, height, shape } = faceSlot;
  const cx = x + width / 2;
  const cy = y + height / 2;
  const maskShape =
    shape === 'rect'
      ? `<rect x="${x}" y="${y}" width="${width}" height="${height}" fill="#ffffff"/>`
      : `<ellipse cx="${cx}" cy="${cy}" rx="${width / 2}" ry="${height / 2}" fill="#ffffff"/>`;
  const mask = Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${canvasWidth}" height="${canvasHeight}">${maskShape}</svg>`
  );
  return sharp(buffer)
    .ensureAlpha()
    .composite([{ input: mask, blend: 'dest-out' }])
    .png()
    .toBuffer();
}

module.exports = { isConfigured, generateImage, punchFaceHole, listModels };
