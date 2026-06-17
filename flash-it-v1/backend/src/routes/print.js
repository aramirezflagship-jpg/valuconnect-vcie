'use strict';
const express = require('express');
const router = express.Router();

/**
 * GET /api/print?url=PHOTO_URL&eventName=NAME
 * Returns a minimal HTML page optimized for printing (auto-triggers print dialog).
 */
router.get('/', (req, res) => {
  const { url, eventName } = req.query;
  if (!url) return res.status(400).send('url parameter required');

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Print — ${eventName || 'Flash-it'}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { background: #fff; display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 100vh; font-family: system-ui, sans-serif; }
    .photo { max-width: 100%; max-height: 80vh; object-fit: contain; border-radius: 8px; }
    .footer { margin-top: 12px; font-size: 11px; color: #999; text-align: center; }
    @media print {
      body { margin: 0; }
      .photo { max-height: 95vh; }
      .no-print { display: none; }
    }
  </style>
</head>
<body>
  <img class="photo" src="${url.replace(/"/g, '&quot;')}" />
  <div class="footer">${eventName ? `${eventName} · ` : ''}Powered by Flash-it</div>
  <script>window.onload = () => window.print();</script>
</body>
</html>`;

  res.setHeader('Content-Type', 'text/html');
  res.send(html);
});

module.exports = router;
