'use strict';

const express = require('express');
const { adminAuth } = require('../middleware/auth');
const templates = require('../services/templates');

const router = express.Router();

/**
 * GET /api/templates
 * Returns all available templates (built-in + custom). No auth required.
 */
router.get('/', (_req, res, next) => {
  try {
    const all = templates.listTemplates();
    return res.json({ templates: all, count: all.length });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/templates/:id
 * Returns a single template by id. No auth required.
 * 404 if not found.
 */
router.get('/:id', (req, res, next) => {
  try {
    const template = templates.getTemplate(req.params.id);
    if (!template) {
      return res.status(404).json({ error: `Template "${req.params.id}" not found.` });
    }
    return res.json(template);
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/templates
 * Save a new custom template. Admin auth required.
 *
 * Body: full template JSON object (must include "id", "printWidth", "printHeight",
 *       "photoCount", "photoSlots")
 */
router.post('/', adminAuth, (req, res, next) => {
  try {
    const body = req.body;

    if (!body || typeof body !== 'object') {
      return res.status(400).json({ error: 'Request body must be a JSON object.' });
    }
    if (!body.id || typeof body.id !== 'string' || !body.id.trim()) {
      return res.status(400).json({ error: 'Template must have a non-empty "id" string.' });
    }
    if (!Array.isArray(body.photoSlots) || body.photoSlots.length === 0) {
      return res.status(400).json({ error: 'Template must include a non-empty "photoSlots" array.' });
    }
    if (!body.printWidth || !body.printHeight) {
      return res.status(400).json({ error: 'Template must specify "printWidth" and "printHeight".' });
    }

    templates.saveCustomTemplate(body);

    const saved = templates.getTemplate(body.id);
    return res.status(201).json(saved);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
