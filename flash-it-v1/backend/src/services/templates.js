'use strict';

const fs = require('fs');
const path = require('path');

// Resolve paths relative to the repo root (two levels up from src/services/)
const BUILTIN_DIR = path.resolve(__dirname, '../../../config/templates');
const CUSTOM_DIR = path.resolve(__dirname, '../../../config/templates/custom');

/**
 * Ensure the custom templates directory exists.
 */
function _ensureCustomDir() {
  if (!fs.existsSync(CUSTOM_DIR)) {
    fs.mkdirSync(CUSTOM_DIR, { recursive: true });
    console.log('[templates] created custom templates dir:', CUSTOM_DIR);
  }
}

/**
 * Load all .json files from a directory and return parsed objects.
 * Skips files that fail to parse.
 *
 * @param {string} dir
 * @returns {object[]}
 */
function _loadFromDir(dir) {
  if (!fs.existsSync(dir)) return [];

  let files;
  try {
    files = fs.readdirSync(dir).filter((f) => f.endsWith('.json'));
  } catch (err) {
    console.warn(`[templates] could not read dir ${dir}:`, err.message);
    return [];
  }

  const results = [];
  for (const file of files) {
    try {
      const raw = fs.readFileSync(path.join(dir, file), 'utf8');
      results.push(JSON.parse(raw));
    } catch (err) {
      console.warn(`[templates] failed to parse ${file}:`, err.message);
    }
  }
  return results;
}

/**
 * Return a single template by id, checking built-ins then custom.
 *
 * @param {string} id
 * @returns {object|null}
 */
function getTemplate(id) {
  const all = listTemplates();
  return all.find((t) => t.id === id) || null;
}

/**
 * Return all templates: built-ins first, then custom.
 * Custom templates with the same id as a built-in override the built-in.
 *
 * @returns {object[]}
 */
function listTemplates() {
  _ensureCustomDir();

  const builtins = _loadFromDir(BUILTIN_DIR);
  const custom = _loadFromDir(CUSTOM_DIR);

  // Merge: custom overrides built-in by id
  const map = new Map();
  for (const t of builtins) {
    if (t.id) map.set(t.id, t);
  }
  for (const t of custom) {
    if (t.id) map.set(t.id, t);
  }

  return Array.from(map.values());
}

/**
 * Persist a custom template to config/templates/custom/<id>.json.
 * Will overwrite an existing file with the same id.
 *
 * @param {object} template  - Must have an `id` field
 * @throws {Error} if template has no id
 */
function saveCustomTemplate(template) {
  if (!template || !template.id) {
    throw new Error('Template must have an "id" field');
  }

  _ensureCustomDir();

  const file = path.join(CUSTOM_DIR, `${template.id}.json`);
  fs.writeFileSync(file, JSON.stringify(template, null, 2), 'utf8');
  console.log(`[templates] saved custom template: ${file}`);
}

module.exports = { getTemplate, listTemplates, saveCustomTemplate };
