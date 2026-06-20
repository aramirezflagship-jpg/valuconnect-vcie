'use strict';

/**
 * Customer message templates — the self-contained alternative to an external
 * CRM (no Monday.com). The admin manages bilingual email/SMS templates that the
 * system merges with contact data and sends. Built-in DEFAULTS ship with the
 * product so it works out of the box; admin edits are persisted as overrides in
 * Supabase (table `message_templates`, migration 0004) keyed by `key`.
 *
 * NOTE: distinct from services/templates.js, which is photo PRINT layouts.
 *
 * Template shape (one record, both languages so the admin edits them together):
 *   { id, key, name, channel:'email'|'sms', category, active,
 *     subjectEn, subjectEs, bodyEn, bodyEs, createdAt, updatedAt }
 *   - email: body* is the inner HTML (wrapped in the Flash-it brand shell).
 *   - sms:   body* is plain text; subject* ignored.
 *   - `key` is a stable trigger slug (e.g. 'lead-welcome'); custom templates
 *     created by the admin may have a null/empty key.
 */

const { v4: uuidv4 } = require('uuid');
const supabase = require('./supabase'); // service-role client (null when unconfigured)

const useSupabase = !!(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);

const CHANNELS = ['email', 'sms'];
const CATEGORIES = ['transactional', 'lifecycle', 'marketing'];

// ── Built-in defaults (bilingual). These always exist; DB rows override by key.
const DEFAULTS = [
  {
    key: 'lead-welcome',
    name: 'Lead — Welcome / Auto-reply',
    channel: 'email',
    category: 'transactional',
    subjectEn: 'Thanks {{firstName}} — I got your Flash-it request 🎉',
    subjectEs: '¡Gracias {{firstName}}! Recibí tu solicitud de Flash-it 🎉',
    bodyEn:
      "<p>I'm Valu, from Flash-it (ValuConnect Solutions). Your request came through and I review every one personally.</p>" +
      "<p>I'll get back to you within the next <b>24 hours</b> with the next steps for your {{eventType}}. If it's urgent, just reply to this email.</p>" +
      '<p>Talk soon!<br/>— Valu, Flash-it</p>',
    bodyEs:
      '<p>Soy Valu, de Flash-it (ValuConnect Solutions). Recibí tu solicitud y la reviso personalmente.</p>' +
      '<p>Te contactaré dentro de las próximas <b>24 horas</b> con los siguientes pasos para tu {{eventType}}. Si es urgente, simplemente responde a este correo.</p>' +
      '<p>¡Hablamos pronto!<br/>— Valu, Flash-it</p>',
  },
  {
    key: 'post-event-thankyou',
    name: 'Post-event — Thank you',
    channel: 'email',
    category: 'lifecycle',
    subjectEn: 'Thank you for celebrating with Flash-it, {{firstName}}! 📸',
    subjectEs: '¡Gracias por celebrar con Flash-it, {{firstName}}! 📸',
    bodyEn:
      '<p>Thank you for letting Flash-it be part of your {{eventType}} — it was a pleasure capturing those moments with you.</p>' +
      '<p>Your guests had a blast, and I hope the photos bring back great memories. If you have a moment, I’d love to hear how it went.</p>' +
      '<p>Warmly,<br/>— Valu, Flash-it</p>',
    bodyEs:
      '<p>Gracias por dejar que Flash-it fuera parte de tu {{eventType}} — fue un placer capturar esos momentos contigo.</p>' +
      '<p>Tus invitados se divirtieron muchísimo, y espero que las fotos te traigan grandes recuerdos. Si tienes un momento, me encantaría saber cómo te fue.</p>' +
      '<p>Con cariño,<br/>— Valu, Flash-it</p>',
  },
  {
    key: 'promo-offer',
    name: 'Marketing — Promo / Offer',
    channel: 'email',
    category: 'marketing',
    subjectEn: '{{firstName}}, a little something for your next event 🎁',
    subjectEs: '{{firstName}}, algo especial para tu próximo evento 🎁',
    bodyEn:
      '<p>Planning another celebration? I’d love to bring Flash-it back.</p>' +
      '<p>As a thank-you for being a Flash-it customer, here’s <b>{{offer}}</b> on your next booking. Just reply to this email and we’ll set it up.</p>' +
      '<p>— Valu, Flash-it</p>',
    bodyEs:
      '<p>¿Planeando otra celebración? Me encantaría llevar Flash-it de nuevo.</p>' +
      '<p>Como agradecimiento por ser cliente de Flash-it, aquí tienes <b>{{offer}}</b> en tu próxima reserva. Solo responde a este correo y lo coordinamos.</p>' +
      '<p>— Valu, Flash-it</p>',
  },
  {
    key: 'review-request',
    name: 'Lifecycle — Review request',
    channel: 'email',
    category: 'lifecycle',
    subjectEn: 'How did we do, {{firstName}}? ⭐',
    subjectEs: '¿Cómo lo hicimos, {{firstName}}? ⭐',
    bodyEn:
      '<p>It was wonderful working with you on your {{eventType}}!</p>' +
      '<p>Reviews mean the world to a small business like mine. If Flash-it made your event special, would you share a few words? <a href="{{reviewUrl}}">Leave a review here</a> — it takes 30 seconds and helps other families find us.</p>' +
      '<p>Thank you so much,<br/>— Valu, Flash-it</p>',
    bodyEs:
      '<p>¡Fue maravilloso trabajar contigo en tu {{eventType}}!</p>' +
      '<p>Las reseñas significan muchísimo para un pequeño negocio como el mío. Si Flash-it hizo tu evento especial, ¿compartirías unas palabras? <a href="{{reviewUrl}}">Deja tu reseña aquí</a> — toma 30 segundos y ayuda a otras familias a encontrarnos.</p>' +
      '<p>¡Muchas gracias!<br/>— Valu, Flash-it</p>',
  },
];

// ── Starter templates seeded INTO the database (distinct from code DEFAULTS) ──
// These are inserted as real, editable/deletable rows in message_templates on
// boot (idempotent: only if a row with the same key doesn't already exist).
const STARTERS = [
  {
    key: 'booking-confirmation',
    name: 'Booking — Confirmed',
    channel: 'email',
    category: 'transactional',
    subjectEn: "You're booked, {{firstName}}! Flash-it is confirmed 🎉",
    subjectEs: '¡Listo, {{firstName}}! Tu Flash-it está confirmado 🎉',
    bodyEn:
      '<p>Great news — your Flash-it booth for your {{eventType}} on <b>{{eventDate}}</b> is confirmed!</p>' +
      "<p>I'll be in touch before the day with setup details. If anything changes, just reply to this email.</p>" +
      "<p>Can't wait!<br/>— Valu, Flash-it</p>",
    bodyEs:
      '<p>¡Buenas noticias! Tu cabina Flash-it para tu {{eventType}} el <b>{{eventDate}}</b> está confirmada.</p>' +
      '<p>Te contactaré antes del día con los detalles de instalación. Si algo cambia, solo responde a este correo.</p>' +
      '<p>¡Con muchas ganas!<br/>— Valu, Flash-it</p>',
  },
  {
    key: 'event-reminder',
    name: 'Event — Reminder',
    channel: 'email',
    category: 'lifecycle',
    subjectEn: 'Your Flash-it event is almost here, {{firstName}}! 📸',
    subjectEs: '¡Tu evento Flash-it ya casi llega, {{firstName}}! 📸',
    bodyEn:
      '<p>Just a friendly reminder that your {{eventType}} is coming up on <b>{{eventDate}}</b>, and Flash-it will be there to capture the fun.</p>' +
      '<p>If you have any last-minute questions about location ({{location}}) or setup, reply anytime.</p>' +
      '<p>See you soon!<br/>— Valu, Flash-it</p>',
    bodyEs:
      '<p>Solo un recordatorio amistoso de que tu {{eventType}} se acerca el <b>{{eventDate}}</b>, y Flash-it estará ahí para capturar la diversión.</p>' +
      '<p>Si tienes preguntas de última hora sobre el lugar ({{location}}) o la instalación, respóndeme cuando quieras.</p>' +
      '<p>¡Nos vemos pronto!<br/>— Valu, Flash-it</p>',
  },
  {
    key: 'referral-ask',
    name: 'Marketing — Refer a friend',
    channel: 'email',
    category: 'marketing',
    subjectEn: 'Know someone planning a party, {{firstName}}? 🎉',
    subjectEs: '¿Conoces a alguien planeando una fiesta, {{firstName}}? 🎉',
    bodyEn:
      "<p>If you enjoyed Flash-it at your {{eventType}}, I'd be so grateful if you'd share us with friends or family planning their own celebration.</p>" +
      "<p>Send them my way and you'll both get <b>{{offer}}</b> on your next booking. Just reply with their name and I'll take care of the rest.</p>" +
      '<p>Thank you!<br/>— Valu, Flash-it</p>',
    bodyEs:
      '<p>Si disfrutaste Flash-it en tu {{eventType}}, te agradecería muchísimo que nos recomendaras a amigos o familiares que estén planeando su propia celebración.</p>' +
      '<p>Mándalos conmigo y ambos recibirán <b>{{offer}}</b> en su próxima reserva. Solo responde con su nombre y yo me encargo del resto.</p>' +
      '<p>¡Gracias!<br/>— Valu, Flash-it</p>',
  },
  {
    key: 'quince-season-promo',
    name: 'Marketing — Quinceañera season',
    channel: 'email',
    category: 'marketing',
    subjectEn: 'Quinceañera season is here, {{firstName}} 👑',
    subjectEs: '¡Llegó la temporada de quinceañeras, {{firstName}}! 👑',
    bodyEn:
      '<p>Quinceañera season is one of my favorite times of the year. If you or someone you love is planning a special celebration, Flash-it makes the memories unforgettable — themed backgrounds, instant photos, the works.</p>' +
      "<p>Book this season and enjoy <b>{{offer}}</b>. Reply and let's make it magical.</p>" +
      '<p>— Valu, Flash-it</p>',
    bodyEs:
      '<p>La temporada de quinceañeras es una de mis épocas favoritas del año. Si tú o alguien que quieres está planeando una celebración especial, Flash-it hace los recuerdos inolvidables — fondos temáticos, fotos al instante, todo.</p>' +
      '<p>Reserva esta temporada y disfruta <b>{{offer}}</b>. Responde y hagámoslo mágico.</p>' +
      '<p>— Valu, Flash-it</p>',
  },
];

// ── Placeholder merge ─────────────────────────────────────────────────────────
/**
 * Replace {{placeholders}} from ctx. Unknown placeholders render empty.
 * @param {string} str
 * @param {object} ctx
 * @returns {string}
 */
function merge(str, ctx = {}) {
  return String(str || '').replace(/\{\{\s*([\w]+)\s*\}\}/g, (_m, k) =>
    ctx[k] != null && ctx[k] !== '' ? String(ctx[k]) : ''
  );
}

/**
 * Wrap inner email HTML in the Flash-it brand shell: a white card on a light
 * background with a large faint blue thunderbolt (⚡) watermark behind the
 * content and a blue Flash-it wordmark on top.
 */
function wrapEmail(innerHtml) {
  return `<!DOCTYPE html><html><body style="margin:0;padding:0;background:#eef4fb;font-family:system-ui,'Segoe UI',sans-serif;color:#1e293b;">
    <div style="max-width:560px;margin:0 auto;padding:2rem 1rem;">
      <div style="position:relative;background:#ffffff;border-radius:16px;padding:2.5rem 2rem;box-shadow:0 4px 24px rgba(37,99,235,0.12);overflow:hidden;">
        <!-- blue thunder watermark -->
        <div style="position:absolute;top:52%;left:50%;transform:translate(-50%,-50%);font-size:340px;line-height:1;color:rgba(37,99,235,0.06);pointer-events:none;z-index:0;">⚡</div>
        <div style="position:relative;z-index:1;">
          <div style="text-align:center;margin-bottom:1.5rem;">
            <span style="font-size:2rem;font-weight:800;color:#2563eb;">⚡ Flash-it</span>
          </div>
          <div style="font-size:1rem;line-height:1.6;color:#334155;text-align:center;">${innerHtml}</div>
          <p style="text-align:center;font-size:.75rem;color:#94a3b8;margin-top:1.75rem;">Flash-it by ValuConnect Solutions</p>
        </div>
      </div>
    </div></body></html>`;
}

/**
 * Build the standard merge context for a contact/lead.
 * @param {object} contact { name, email, phone, eventType, eventDate, estimatedGuests, location }
 * @param {object} [extra] additional placeholders (offer, reviewUrl, ...)
 */
function contextFor(contact = {}, extra = {}) {
  const name = String(contact.name || '').trim();
  return {
    name,
    firstName: name.split(/\s+/)[0] || 'there',
    email: contact.email || '',
    eventType: contact.eventType || contact.event_type || 'event',
    eventDate: contact.eventDate || contact.event_date || '',
    guests: contact.estimatedGuests != null ? contact.estimatedGuests : (contact.estimated_guests ?? ''),
    location: contact.location || '',
    businessName: 'Flash-it',
    offer: '10% off',
    reviewUrl: process.env.REVIEW_URL || '#',
    ...extra,
  };
}

/**
 * Render a template for a given language + context into a sendable payload.
 * @returns {{channel:string, subject?:string, html?:string, text?:string}}
 */
function render(tpl, { lang = 'en', context = {} } = {}) {
  const es = String(lang).toLowerCase().startsWith('es');
  if (tpl.channel === 'sms') {
    return { channel: 'sms', text: merge(es ? tpl.bodyEs : tpl.bodyEn, context) };
  }
  return {
    channel: 'email',
    subject: merge(es ? tpl.subjectEs : tpl.subjectEn, context),
    html: wrapEmail(merge(es ? tpl.bodyEs : tpl.bodyEn, context)),
  };
}

// ── Supabase row mapping ──────────────────────────────────────────────────────
function _rowToRecord(row) {
  if (!row) return null;
  return {
    id: row.id,
    key: row.key || null,
    name: row.name || 'Template',
    channel: CHANNELS.includes(row.channel) ? row.channel : 'email',
    category: CATEGORIES.includes(row.category) ? row.category : 'marketing',
    active: row.active !== false,
    subjectEn: row.subject_en || '',
    subjectEs: row.subject_es || '',
    bodyEn: row.body_en || '',
    bodyEs: row.body_es || '',
    createdAt: row.created_at || null,
    updatedAt: row.updated_at || null,
    isDefault: false,
  };
}
function _recordToRow(rec) {
  return {
    id: rec.id,
    key: rec.key || null,
    name: rec.name || 'Template',
    channel: CHANNELS.includes(rec.channel) ? rec.channel : 'email',
    category: CATEGORIES.includes(rec.category) ? rec.category : 'marketing',
    active: rec.active !== false,
    subject_en: rec.subjectEn || '',
    subject_es: rec.subjectEs || '',
    body_en: rec.bodyEn || '',
    body_es: rec.bodyEs || '',
  };
}

/** The built-in defaults as full records (stable synthetic ids). */
function _defaultRecords() {
  return DEFAULTS.map((d) => ({
    id: `default-${d.key}`,
    ...d,
    active: true,
    createdAt: null,
    updatedAt: null,
    isDefault: true,
  }));
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * List templates: built-in defaults merged with DB overrides/customs. A DB row
 * sharing a default's `key` replaces that default. Never throws (falls back to
 * defaults if the table is missing/unconfigured).
 * @returns {Promise<object[]>}
 */
async function listTemplates() {
  const defaults = _defaultRecords();
  if (!(useSupabase && supabase)) return defaults;

  try {
    const { data, error } = await supabase.from('message_templates').select('*').order('created_at', { ascending: true });
    if (error) throw error;
    const rows = (data || []).map(_rowToRecord);
    const overriddenKeys = new Set(rows.filter((r) => r.key).map((r) => r.key));
    const keptDefaults = defaults.filter((d) => !overriddenKeys.has(d.key));
    return [...keptDefaults, ...rows];
  } catch (err) {
    console.warn('[messageTemplates] list fell back to defaults:', err.message);
    return defaults;
  }
}

/** Get one template by id (default-* synthetic ids supported). */
async function getTemplate(id) {
  if (!id) return null;
  if (String(id).startsWith('default-')) {
    return _defaultRecords().find((d) => d.id === id) || null;
  }
  if (useSupabase && supabase) {
    try {
      const { data, error } = await supabase.from('message_templates').select('*').eq('id', id).maybeSingle();
      if (error) throw error;
      return _rowToRecord(data);
    } catch (err) {
      console.warn('[messageTemplates] getTemplate error:', err.message);
      return null;
    }
  }
  return null;
}

/** Resolve a template by stable key: DB override wins, else built-in default. */
async function getByKey(key) {
  if (!key) return null;
  if (useSupabase && supabase) {
    try {
      const { data, error } = await supabase
        .from('message_templates')
        .select('*')
        .eq('key', key)
        .eq('active', true)
        .maybeSingle();
      if (error) throw error;
      if (data) return _rowToRecord(data);
    } catch (err) {
      console.warn('[messageTemplates] getByKey error, using default:', err.message);
    }
  }
  const d = _defaultRecords().find((x) => x.key === key);
  return d || null;
}

async function createTemplate(input) {
  if (!(useSupabase && supabase)) {
    throw new Error('Template editing needs Supabase configured (apply migration 0004_message_templates.sql).');
  }
  const rec = {
    id: uuidv4(),
    key: input.key || null,
    name: input.name || 'New template',
    channel: input.channel || 'email',
    category: input.category || 'marketing',
    active: input.active !== false,
    subjectEn: input.subjectEn || '',
    subjectEs: input.subjectEs || '',
    bodyEn: input.bodyEn || '',
    bodyEs: input.bodyEs || '',
  };
  const { data, error } = await supabase.from('message_templates').insert(_recordToRow(rec)).select().single();
  if (error) throw new Error(`Failed to create template: ${error.message}`);
  return _rowToRecord(data);
}

/**
 * Update a template. If `id` is a built-in default (default-*), this PROMOTES it
 * to a real DB override row (so editing a default just works for the admin).
 */
async function updateTemplate(id, patch) {
  if (!(useSupabase && supabase)) {
    throw new Error('Template editing needs Supabase configured (apply migration 0004_message_templates.sql).');
  }

  if (String(id).startsWith('default-')) {
    const base = _defaultRecords().find((d) => d.id === id);
    if (!base) throw new Error('Unknown default template.');
    return createTemplate({ ...base, ...patch, key: base.key }); // override keyed to the default
  }

  const row = {};
  const map = { name: 'name', channel: 'channel', category: 'category', active: 'active', key: 'key', subjectEn: 'subject_en', subjectEs: 'subject_es', bodyEn: 'body_en', bodyEs: 'body_es' };
  for (const [k, col] of Object.entries(map)) if (patch[k] !== undefined) row[col] = patch[k];
  if (Object.keys(row).length === 0) return getTemplate(id);

  const { data, error } = await supabase.from('message_templates').update(row).eq('id', id).select().single();
  if (error) throw new Error(`Failed to update template: ${error.message}`);
  return _rowToRecord(data);
}

async function deleteTemplate(id) {
  if (String(id).startsWith('default-')) {
    throw new Error('Built-in default templates cannot be deleted (edit them instead).');
  }
  if (!(useSupabase && supabase)) return false;
  const { error, count } = await supabase.from('message_templates').delete({ count: 'exact' }).eq('id', id);
  if (error) throw new Error(`Failed to delete template: ${error.message}`);
  return (count || 0) > 0;
}

/**
 * Seed the STARTERS into the database as real, editable rows. Idempotent:
 * skips any key that already exists. No-op (returns []) when Supabase is
 * unconfigured or the table doesn't exist yet (migration 0004 not applied).
 * @returns {Promise<string[]>} keys inserted this run
 */
async function seedStarterTemplates() {
  if (!(useSupabase && supabase)) return null; // can't use the DB at all
  const seeded = [];
  for (const t of STARTERS) {
    try {
      const { data: existing, error: selErr } = await supabase
        .from('message_templates')
        .select('id')
        .eq('key', t.key)
        .maybeSingle();
      if (selErr) throw selErr;
      if (existing) continue; // already present — leave admin edits untouched
      const { error: insErr } = await supabase.from('message_templates').insert(_recordToRow({ id: uuidv4(), active: true, ...t }));
      if (insErr) throw insErr;
      seeded.push(t.key);
    } catch (err) {
      // Table missing (migration 0004 not applied) → signal "retry later" (null)
      // so a lazy caller tries again once the table exists.
      if (/does not exist|message_templates|schema cache/i.test(err.message)) {
        console.warn('[messageTemplates] seedStarterTemplates deferred — message_templates table not found (apply 0004).');
        return null;
      }
      console.warn(`[messageTemplates] seedStarterTemplates: '${t.key}' skipped — ${err.message}`);
    }
  }
  return seeded; // array (possibly empty) once the table exists
}

module.exports = {
  CHANNELS,
  CATEGORIES,
  DEFAULTS,
  STARTERS,
  seedStarterTemplates,
  merge,
  wrapEmail,
  contextFor,
  render,
  listTemplates,
  getTemplate,
  getByKey,
  createTemplate,
  updateTemplate,
  deleteTemplate,
};
