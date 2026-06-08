'use strict';

const cloudinary = require('cloudinary').v2;

// Configure Cloudinary from environment variables.
// This runs once when the module is first required.
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

/**
 * Upload a photo buffer to Cloudinary under the pixel-ai/{eventId} folder.
 *
 * @param {Buffer} buffer   - Final branded PNG buffer
 * @param {string} eventId  - Used as the Cloudinary folder name segment
 * @param {string} filename - Suggested filename (e.g. "1720000000000-abc12345.png")
 * @returns {Promise<{ url: string, publicId: string, thumbnailUrl: string }>}
 */
async function uploadPhoto(buffer, eventId, filename) {
  if (!_isConfigured()) {
    console.warn('[storage] Cloudinary not configured — returning placeholder URLs');
    return _placeholderResult(eventId, filename);
  }

  const publicId = `pixel-ai/${eventId}/${_stripExtension(filename)}`;

  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        public_id: publicId,
        resource_type: 'image',
        format: 'png',
        // Preserve metadata / DPI information
        use_filename: true,
        unique_filename: false,
        overwrite: false,
        // Eager transforms — generate the thumbnail synchronously during upload
        eager: [
          {
            width: 400,
            crop: 'scale',
            format: 'jpg',
            quality: 'auto:good',
          },
        ],
        tags: ['pixel-ai', `event-${eventId}`],
      },
      (error, result) => {
        if (error) return reject(error);

        const url = result.secure_url;
        // Use the first eager transform URL as the thumbnail
        const thumbnailUrl =
          result.eager?.[0]?.secure_url ||
          cloudinary.url(publicId, { width: 400, crop: 'scale', format: 'jpg', quality: 'auto:good', secure: true });

        resolve({ url, publicId: result.public_id, thumbnailUrl });
      }
    );

    uploadStream.end(buffer);
  });
}

/**
 * Retrieve all photos for a given event from Cloudinary.
 * Uses the search API to query by folder / tag.
 *
 * @param {string} eventId
 * @returns {Promise<Array<{ url: string, publicId: string, thumbnailUrl: string, createdAt: string }>>}
 */
async function getEventPhotos(eventId) {
  if (!_isConfigured()) {
    return [];
  }

  const result = await cloudinary.search
    .expression(`folder:pixel-ai/${eventId} AND resource_type:image`)
    .sort_by('created_at', 'desc')
    .max_results(500)
    .with_field('tags')
    .execute();

  return (result.resources || []).map((r) => ({
    publicId: r.public_id,
    url: r.secure_url,
    thumbnailUrl: cloudinary.url(r.public_id, {
      width: 400,
      crop: 'scale',
      format: 'jpg',
      quality: 'auto:good',
      secure: true,
    }),
    createdAt: r.created_at,
    bytes: r.bytes,
    width: r.width,
    height: r.height,
  }));
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function _isConfigured() {
  return (
    process.env.CLOUDINARY_CLOUD_NAME &&
    process.env.CLOUDINARY_API_KEY &&
    process.env.CLOUDINARY_API_SECRET &&
    process.env.CLOUDINARY_CLOUD_NAME !== 'your_cloud_name'
  );
}

function _stripExtension(filename) {
  return filename.replace(/\.[^/.]+$/, '');
}

/** Returns stub URLs for development when Cloudinary is not configured. */
function _placeholderResult(eventId, filename) {
  const stub = `https://placeholder.pixel-ai.dev/${eventId}/${filename}`;
  return { url: stub, publicId: `pixel-ai/${eventId}/${filename}`, thumbnailUrl: stub };
}

module.exports = { uploadPhoto, getEventPhotos };
