'use strict';

const { S3Client, PutObjectCommand, ListObjectsV2Command, GetObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const sharp = require('sharp');

function _getClient() {
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;

  if (!accountId || !accessKeyId || !secretAccessKey) return null;

  return new S3Client({
    region: 'auto',
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId, secretAccessKey },
  });
}

const _bucket = () => process.env.R2_BUCKET_NAME || 'flash-it';
const _publicBase = () => (process.env.R2_PUBLIC_URL || '').replace(/\/$/, '');

/**
 * Upload a photo buffer to R2 under flash-it/{eventId}/.
 * Also generates and uploads a 400px thumbnail.
 *
 * @param {Buffer} buffer   - Final branded PNG buffer
 * @param {string} eventId
 * @param {string} filename - e.g. "1720000000000-abc12345.png"
 * @returns {Promise<{ url: string, publicId: string, thumbnailUrl: string }>}
 */
async function uploadPhoto(buffer, eventId, filename) {
  const client = _getClient();

  if (!client) {
    console.warn('[storage] R2 not configured — returning placeholder URLs');
    return _placeholderResult(eventId, filename);
  }

  const base = filename.replace(/\.[^/.]+$/, '');
  const key = `flash-it/${eventId}/${filename}`;
  const thumbKey = `flash-it/${eventId}/thumb_${base}.jpg`;

  const thumbBuffer = await sharp(buffer)
    .resize(400, null, { withoutEnlargement: true })
    .jpeg({ quality: 85 })
    .toBuffer();

  await Promise.all([
    client.send(new PutObjectCommand({
      Bucket: _bucket(),
      Key: key,
      Body: buffer,
      ContentType: 'image/png',
      Metadata: { eventId },
    })),
    client.send(new PutObjectCommand({
      Bucket: _bucket(),
      Key: thumbKey,
      Body: thumbBuffer,
      ContentType: 'image/jpeg',
      Metadata: { eventId },
    })),
  ]);

  const url = await _resolveUrl(client, key);
  const thumbnailUrl = await _resolveUrl(client, thumbKey);

  return { url, publicId: key, thumbnailUrl };
}

/**
 * List all photos for an event from R2.
 *
 * @param {string} eventId
 * @returns {Promise<Array<{ url, publicId, thumbnailUrl, createdAt, bytes }>>}
 */
async function getEventPhotos(eventId) {
  const client = _getClient();
  if (!client) return [];

  const result = await client.send(new ListObjectsV2Command({
    Bucket: _bucket(),
    Prefix: `flash-it/${eventId}/`,
  }));

  const originals = (result.Contents || []).filter(
    (o) => !o.Key.includes('/thumb_')
  );

  const photos = await Promise.all(
    originals.map(async (o) => {
      const base = o.Key.replace(/\.[^/.]+$/, '').split('/').pop();
      const thumbKey = `flash-it/${eventId}/thumb_${base}.jpg`;
      return {
        publicId: o.Key,
        url: await _resolveUrl(client, o.Key),
        thumbnailUrl: await _resolveUrl(client, thumbKey),
        createdAt: o.LastModified?.toISOString(),
        bytes: o.Size,
      };
    })
  );

  return photos.sort((a, b) => (b.createdAt > a.createdAt ? 1 : -1));
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Return a public URL if R2_PUBLIC_URL is set, otherwise a 24-hour presigned URL.
 */
async function _resolveUrl(client, key) {
  const base = _publicBase();
  if (base) return `${base}/${key}`;

  return getSignedUrl(
    client,
    new GetObjectCommand({ Bucket: _bucket(), Key: key }),
    { expiresIn: 86400 }
  );
}

function _placeholderResult(eventId, filename) {
  const stub = `https://placeholder.flash-it.dev/${eventId}/${filename}`;
  return { url: stub, publicId: `flash-it/${eventId}/${filename}`, thumbnailUrl: stub };
}

/**
 * Upload a raw Buffer to R2 at the given key with the specified content type.
 * Returns the public (or presigned) URL of the uploaded object.
 *
 * @param {Buffer} buffer
 * @param {string} key      - Full R2 object key, e.g. "gifs/event-id/uuid.gif"
 * @param {string} contentType - MIME type, e.g. "image/gif"
 * @returns {Promise<string>} Resolved URL
 */
async function uploadBuffer(buffer, key, contentType) {
  const client = _getClient();

  if (!client) {
    console.warn('[storage] R2 not configured — returning placeholder URL for buffer upload');
    const base = _publicBase();
    return base ? `${base}/${key}` : `https://placeholder.flash-it.dev/${key}`;
  }

  await client.send(new PutObjectCommand({
    Bucket: _bucket(),
    Key: key,
    Body: buffer,
    ContentType: contentType,
  }));

  return _resolveUrl(client, key);
}

module.exports = { uploadPhoto, getEventPhotos, uploadBuffer };
