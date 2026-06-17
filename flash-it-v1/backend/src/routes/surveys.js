'use strict';
const express = require('express');
const router = express.Router();
const { adminAuth } = require('../middleware/auth');
const fs = require('fs');
const path = require('path');

const SURVEYS_PATH = path.join(__dirname, '../../../config/surveys.json');
const RESPONSES_PATH = path.join(__dirname, '../../../config/survey-responses.json');

function readJson(filePath) {
  if (!fs.existsSync(filePath)) return {};
  try { return JSON.parse(fs.readFileSync(filePath, 'utf8')); } catch { return {}; }
}
function writeJson(filePath, data) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}

/**
 * GET /api/surveys/:eventCode — get survey config for an event (public)
 */
router.get('/:eventCode', (req, res) => {
  const surveys = readJson(SURVEYS_PATH);
  const survey = surveys[req.params.eventCode] || null;
  res.json({ survey });
});

/**
 * PUT /api/surveys/:eventCode — set survey questions for event (admin only)
 * Body: { questions: [{ id, type: 'text'|'choice', label, options?: string[] }] }
 */
router.put('/:eventCode', adminAuth, (req, res) => {
  const { questions } = req.body;
  if (!Array.isArray(questions)) return res.status(400).json({ error: 'questions array required' });
  const surveys = readJson(SURVEYS_PATH);
  surveys[req.params.eventCode] = { questions, updatedAt: new Date().toISOString() };
  writeJson(SURVEYS_PATH, surveys);
  res.json({ success: true, survey: surveys[req.params.eventCode] });
});

/**
 * POST /api/surveys/:eventCode/respond — guest submits survey response (public)
 * Body: { responses: { [questionId]: answer }, guestEmail? }
 */
router.post('/:eventCode/respond', (req, res) => {
  const { responses, guestEmail } = req.body;
  if (!responses) return res.status(400).json({ error: 'responses required' });
  const all = readJson(RESPONSES_PATH);
  if (!all[req.params.eventCode]) all[req.params.eventCode] = [];
  all[req.params.eventCode].push({
    id: require('crypto').randomUUID(),
    responses,
    guestEmail: guestEmail || null,
    submittedAt: new Date().toISOString(),
  });
  writeJson(RESPONSES_PATH, all);
  res.json({ success: true });
});

/**
 * GET /api/surveys/:eventCode/responses — get all responses (admin only)
 */
router.get('/:eventCode/responses', adminAuth, (req, res) => {
  const all = readJson(RESPONSES_PATH);
  const responses = all[req.params.eventCode] || [];
  res.json({ responses, count: responses.length });
});

/**
 * GET /api/surveys/:eventCode/export — CSV export of responses (admin only)
 */
router.get('/:eventCode/export', adminAuth, (req, res) => {
  const surveys = readJson(SURVEYS_PATH);
  const all = readJson(RESPONSES_PATH);
  const survey = surveys[req.params.eventCode];
  const responses = all[req.params.eventCode] || [];

  const questions = survey?.questions || [];
  const headers = ['submitted_at', 'guest_email', ...questions.map(q => q.label)];
  const rows = responses.map(r => [
    r.submittedAt,
    r.guestEmail || '',
    ...questions.map(q => r.responses[q.id] || ''),
  ]);

  const csv = [headers, ...rows].map(row => row.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename="survey-${req.params.eventCode}.csv"`);
  res.send(csv);
});

module.exports = router;
