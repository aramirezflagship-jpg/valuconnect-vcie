'use strict';

require('dotenv').config();

const express = require('express');
const cors = require('cors');
const path = require('path');

const captureRouter = require('./routes/capture');
const eventsRouter = require('./routes/events');
const adminRouter = require('./routes/admin');
const paymentsRouter = require('./routes/payments');
const notificationsRouter = require('./routes/notifications');
const pushRouter = require('./routes/push');
const addonsRouter = require('./routes/addons');
const accountsRouter = require('./routes/accounts');
const deliverRouter = require('./routes/deliver');
const gifRouter = require('./routes/gif');
const virtualBoothRouter = require('./routes/virtualBooth');
const surveysRouter = require('./routes/surveys');
const printRouter = require('./routes/print');
const stripsRouter    = require('./routes/strips');
const templatesRouter = require('./routes/templates');
const backgroundsRouter = require('./routes/backgrounds');
const framesRouter    = require('./routes/frames');
const videosRouter    = require('./routes/videos');
const contactRouter   = require('./routes/contact');

const app = express();
const PORT = process.env.PORT || 3000;

// ── CORS ──────────────────────────────────────────────────────────────────────
// FRONTEND_URL can be a comma-separated list for multiple origins
const allowedOrigins = process.env.FRONTEND_URL
  ? process.env.FRONTEND_URL.split(',').map((u) => u.trim()).filter(Boolean)
  : ['http://localhost:3001', 'http://localhost:8080'];

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) return callback(null, true);
      if (process.env.NODE_ENV !== 'production' && /^https?:\/\/localhost(:\d+)?$/.test(origin)) {
        return callback(null, true);
      }
      callback(new Error(`CORS: origin ${origin} not allowed`));
    },
    methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Admin-Secret'],
    credentials: true,
  })
);

// ── Routes that need raw body MUST be mounted BEFORE express.json() ───────────
// Both payments webhook and add-on webhook use express.raw() per-route, so they
// need to be registered before the JSON body parser intercepts the stream.
app.use('/api/payments', paymentsRouter);
app.use('/api/events/:eventId/add-on', addonsRouter);

// ── Body parsing ──────────────────────────────────────────────────────────────
app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ extended: true, limit: '20mb' }));

// ── Health check (no auth) ────────────────────────────────────────────────────
app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    service: 'flash-it-backend',
    version: require('../package.json').version,
    timestamp: new Date().toISOString(),
  });
});

// ── Admin dashboard (static HTML, served at /admin) ──────────────────────────
app.use('/admin', express.static(path.join(__dirname, 'admin')));

// ── Public guest gallery page (served at /gallery?event=ID) ──────────────────
app.use('/gallery', express.static(path.join(__dirname, 'public')));
app.get('/gallery', (_req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'gallery.html'));
});

// ── Routes ────────────────────────────────────────────────────────────────────
app.use('/api/capture', captureRouter);
app.use('/api/events', eventsRouter);
app.use('/api/admin', adminRouter);
app.use('/api/notifications', notificationsRouter);
app.use('/api/push', pushRouter);
app.use('/api/accounts', accountsRouter);
app.use('/api/deliver', deliverRouter);
app.use('/api/gif', gifRouter);
app.use('/api/virtual-booth', virtualBoothRouter);
app.use('/api/surveys', surveysRouter);
app.use('/api/print', printRouter);
app.use('/api/strips',    stripsRouter);
app.use('/api/templates', templatesRouter);
app.use('/api/backgrounds', backgroundsRouter);
app.use('/api/frames',    framesRouter);
app.use('/api/videos',    videosRouter);
app.use('/api/contact',   contactRouter);

// /api/gallery/:eventId — convenience alias redirecting to the events gallery handler
app.get('/api/gallery/:eventId', (req, res) => {
  res.redirect(307, `/api/events/${req.params.eventId}/gallery`);
});

// ── 404 handler ───────────────────────────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// ── Global error handler ──────────────────────────────────────────────────────
// eslint-disable-next-line no-unused-vars
app.use((err, _req, res, _next) => {
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(413).json({ error: 'File too large. Maximum size is 15 MB.' });
  }
  if (err.code === 'LIMIT_UNEXPECTED_FILE') {
    return res.status(400).json({ error: 'Unexpected file field.' });
  }

  const status = err.status || err.statusCode || 500;
  const message =
    process.env.NODE_ENV === 'production' && status === 500
      ? 'Internal server error'
      : err.message || 'Internal server error';

  if (status >= 500) {
    console.error('[ERROR]', err);
  }

  res.status(status).json({ error: message });
});

// ── Start ─────────────────────────────────────────────────────────────────────
const localAuth = require('./services/localAuth');
if (!process.env.SUPABASE_URL) {
  localAuth.seedDemoAccounts();
}

// Ensure the starter NATURAL frame catalogue exists (idempotent upsert). Runs in
// both stores so a fresh Supabase project / JSON store is never empty.
const { seedPresetFrames } = require('./services/backgrounds');
seedPresetFrames()
  .then((ids) => console.log(`[flash-it] seeded ${ids.length} preset frame(s): ${ids.join(', ')}`))
  .catch((err) => console.error('[flash-it] seedPresetFrames failed:', err.message));

app.listen(PORT, () => {
  console.log(`[flash-it] Backend running on port ${PORT} (${process.env.NODE_ENV || 'development'})`);
});

module.exports = app; // for testing
