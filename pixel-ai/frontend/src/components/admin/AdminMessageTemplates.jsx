import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  getMessageTemplates,
  createMessageTemplate,
  updateMessageTemplate,
  deleteMessageTemplate,
  sendMessageTemplate,
} from '../../utils/api.js';

/**
 * AdminMessageTemplates — the self-contained customer-messaging center (no
 * Monday.com). The admin edits bilingual email/SMS templates, previews them
 * live with sample data, and sends a test. Built-in defaults always exist;
 * editing one promotes it to an editable override on the backend.
 */

const C = {
  card: { background: '#1a1a2e', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 12, padding: '1.1rem' },
  label: { fontSize: '.72rem', color: '#94a3b8', fontWeight: 600 },
  input: {
    background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8,
    padding: '.55rem .7rem', color: '#f1f5f9', fontSize: '.85rem', outline: 'none', width: '100%', boxSizing: 'border-box',
  },
  textarea: {
    background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8,
    padding: '.55rem .7rem', color: '#f1f5f9', fontSize: '.82rem', outline: 'none', width: '100%', boxSizing: 'border-box',
    minHeight: 92, fontFamily: 'ui-monospace, monospace', lineHeight: 1.5, resize: 'vertical',
  },
  btn: (bg) => ({ background: bg, color: '#fff', border: 'none', borderRadius: 8, padding: '.5rem .9rem', fontSize: '.8rem', fontWeight: 600, cursor: 'pointer' }),
  ghost: { background: 'transparent', color: '#94a3b8', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 8, padding: '.5rem .9rem', fontSize: '.8rem', fontWeight: 600, cursor: 'pointer' },
};

const CATEGORY_COLORS = {
  transactional: { bg: 'rgba(56,189,248,0.14)', color: '#38bdf8' },
  lifecycle: { bg: 'rgba(168,85,247,0.14)', color: '#c084fc' },
  marketing: { bg: 'rgba(234,179,8,0.14)', color: '#fbbf24' },
};

const PLACEHOLDERS = ['firstName', 'name', 'eventType', 'eventDate', 'guests', 'location', 'offer', 'reviewUrl', 'businessName'];

const BLANK = {
  id: null, key: '', name: '', channel: 'email', category: 'marketing', active: true,
  subjectEn: '', subjectEs: '', bodyEn: '', bodyEs: '', isDefault: false,
};

/** Client-side {{placeholder}} merge for the live preview. */
function merge(str, ctx) {
  return String(str || '').replace(/\{\{\s*(\w+)\s*\}\}/g, (_m, k) => (ctx[k] != null && ctx[k] !== '' ? String(ctx[k]) : ''));
}

function brandWrap(inner) {
  return `<!DOCTYPE html><html><body style="margin:0;background:#eef4fb;font-family:system-ui,sans-serif;color:#1e293b;">
    <div style="max-width:560px;margin:0 auto;padding:1.5rem 1rem;">
      <div style="position:relative;background:#ffffff;border-radius:14px;padding:2rem 1.5rem;box-shadow:0 4px 24px rgba(37,99,235,0.12);overflow:hidden;">
        <div style="position:absolute;top:52%;left:50%;transform:translate(-50%,-50%);font-size:300px;line-height:1;color:rgba(37,99,235,0.06);pointer-events:none;z-index:0;">⚡</div>
        <div style="position:relative;z-index:1;">
          <div style="text-align:center;margin-bottom:1.25rem;"><span style="font-size:1.8rem;font-weight:800;color:#2563eb;">⚡ Flash-it</span></div>
          <div style="font-size:1rem;line-height:1.6;color:#334155;text-align:center;">${inner}</div>
          <p style="text-align:center;font-size:.72rem;color:#94a3b8;margin-top:1.25rem;">Flash-it by ValuConnect Solutions</p>
        </div>
      </div>
    </div></body></html>`;
}

export default function AdminMessageTemplates() {
  const [templates, setTemplates] = useState(null);
  const [error, setError] = useState('');
  const [draft, setDraft] = useState(null);
  const [original, setOriginal] = useState(null);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState('');

  // Preview controls
  const [lang, setLang] = useState('en');
  const [sampleName, setSampleName] = useState('María López');
  const [sampleEvent, setSampleEvent] = useState('Quinceañera');

  // Test send
  const [sendTo, setSendTo] = useState('');
  const [sending, setSending] = useState(false);
  const [sendResult, setSendResult] = useState(null);

  const load = useCallback(async () => {
    setError('');
    try {
      const data = await getMessageTemplates();
      setTemplates(data.templates || []);
    } catch (e) {
      setError(e?.response?.data?.error || e.message || 'Failed to load templates');
      setTemplates([]);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const dirty = useMemo(() => JSON.stringify(draft) !== JSON.stringify(original), [draft, original]);

  function select(tpl) {
    const copy = { ...BLANK, ...tpl };
    setDraft(copy);
    setOriginal(copy);
    setNotice('');
    setSendResult(null);
  }
  function newTemplate() {
    const copy = { ...BLANK, name: 'New template' };
    setDraft(copy);
    setOriginal({ ...copy, name: '' }); // mark dirty so Save is enabled
    setNotice('');
    setSendResult(null);
  }
  const set = (k) => (e) => {
    const v = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    setDraft((d) => ({ ...d, [k]: v }));
  };

  async function save() {
    if (!draft.name?.trim()) { setNotice('Name is required.'); return null; }
    setSaving(true); setNotice('');
    try {
      const payload = {
        key: draft.key || undefined, name: draft.name, channel: draft.channel,
        category: draft.category, active: draft.active,
        subjectEn: draft.subjectEn, subjectEs: draft.subjectEs, bodyEn: draft.bodyEn, bodyEs: draft.bodyEs,
      };
      const saved = draft.id
        ? await updateMessageTemplate(draft.id, payload)
        : await createMessageTemplate(payload);
      await load();
      const copy = { ...BLANK, ...saved };
      setDraft(copy); setOriginal(copy);
      setNotice('Saved ✓');
      return saved;
    } catch (e) {
      const msg = e?.response?.data?.error || e.message || 'Save failed';
      setNotice(msg);
      return null;
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    if (!draft.id || draft.isDefault) return;
    if (!window.confirm(`Delete "${draft.name}"? This can't be undone.`)) return;
    try {
      await deleteMessageTemplate(draft.id);
      setDraft(null); setOriginal(null);
      await load();
    } catch (e) {
      setNotice(e?.response?.data?.error || e.message || 'Delete failed');
    }
  }

  async function handleSend() {
    if (!sendTo.trim()) { setSendResult({ ok: false, message: 'Enter a recipient first.' }); return; }
    setSending(true); setSendResult(null);
    try {
      // Send uses the SAVED template — persist any edits first.
      let id = draft.id;
      if (dirty || !id) {
        const saved = await save();
        if (!saved) { setSending(false); return; }
        id = saved.id;
      }
      const r = await sendMessageTemplate(id, { to: sendTo.trim(), lang, contact: { name: sampleName, eventType: sampleEvent } });
      setSendResult({ ok: !!r.sent, message: r.message || (r.sent ? 'Sent.' : 'Not sent.') });
    } catch (e) {
      setSendResult({ ok: false, message: e?.response?.data?.error || e.message || 'Send failed' });
    } finally {
      setSending(false);
    }
  }

  // Live preview from the current draft (client-side merge).
  const ctx = {
    firstName: (sampleName || '').trim().split(/\s+/)[0] || 'there',
    name: sampleName, eventType: sampleEvent || 'event', eventDate: 'Aug 15, 2026',
    guests: '120', location: 'Houston, TX', offer: '10% off', reviewUrl: '#', businessName: 'Flash-it',
  };
  const isEs = lang === 'es';
  const previewSubject = draft ? merge(isEs ? draft.subjectEs : draft.subjectEn, ctx) : '';
  const previewBody = draft ? merge(isEs ? draft.bodyEs : draft.bodyEn, ctx) : '';
  const previewHtml = draft?.channel === 'sms' ? null : brandWrap(previewBody);

  if (templates === null) return <p style={{ color: '#64748b', textAlign: 'center', padding: '2rem' }}>Loading templates…</p>;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <div>
          <h2 style={{ fontSize: '1rem', fontWeight: 700, color: '#f1f5f9', margin: 0 }}>Customer Messages</h2>
          <p style={{ fontSize: '.78rem', color: '#64748b', margin: '.25rem 0 0' }}>
            Bilingual email/SMS templates the system sends to your customers. Editing a built-in default makes it your own.
          </p>
        </div>
        <button onClick={newTemplate} style={C.btn('linear-gradient(135deg,#dc2626,#f97316)')}>+ New template</button>
      </div>

      {error && <p style={{ color: '#f87171', fontSize: '.82rem' }}>{error}</p>}

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(220px, 280px) 1fr', gap: '1rem', alignItems: 'start' }}>
        {/* List */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '.5rem' }}>
          {templates.map((t) => {
            const cc = CATEGORY_COLORS[t.category] || CATEGORY_COLORS.marketing;
            const active = draft && (draft.id === t.id || (draft.key && draft.key === t.key));
            return (
              <button key={t.id} onClick={() => select(t)} style={{
                ...C.card, textAlign: 'left', cursor: 'pointer',
                borderColor: active ? '#f97316' : 'rgba(255,255,255,0.07)', padding: '.7rem .8rem',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '.4rem' }}>
                  <span style={{ fontSize: '.84rem', fontWeight: 600, color: '#f1f5f9' }}>{t.name}</span>
                  <span style={{ fontSize: '.62rem', color: '#64748b' }}>{t.channel}</span>
                </div>
                <div style={{ display: 'flex', gap: '.35rem', marginTop: '.4rem' }}>
                  <span style={{ background: cc.bg, color: cc.color, borderRadius: 5, fontSize: '.6rem', fontWeight: 700, padding: '.1rem .4rem' }}>
                    {t.category}
                  </span>
                  {t.isDefault && <span style={{ background: 'rgba(100,116,139,0.18)', color: '#94a3b8', borderRadius: 5, fontSize: '.6rem', fontWeight: 700, padding: '.1rem .4rem' }}>default</span>}
                  {t.active === false && <span style={{ background: 'rgba(239,68,68,0.14)', color: '#f87171', borderRadius: 5, fontSize: '.6rem', fontWeight: 700, padding: '.1rem .4rem' }}>off</span>}
                </div>
              </button>
            );
          })}
        </div>

        {/* Editor + preview */}
        {!draft ? (
          <div style={{ ...C.card, color: '#64748b', textAlign: 'center', padding: '3rem 1rem' }}>
            Select a template to edit, or create a new one.
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1rem' }}>
            {/* Editor */}
            <div style={C.card}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 130px 150px', gap: '.7rem', marginBottom: '.7rem' }}>
                <Field label="Name"><input style={C.input} value={draft.name} onChange={set('name')} /></Field>
                <Field label="Channel">
                  <select style={C.input} value={draft.channel} onChange={set('channel')}>
                    <option value="email">email</option>
                    <option value="sms">sms</option>
                  </select>
                </Field>
                <Field label="Category">
                  <select style={C.input} value={draft.category} onChange={set('category')}>
                    <option value="transactional">transactional</option>
                    <option value="lifecycle">lifecycle</option>
                    <option value="marketing">marketing</option>
                  </select>
                </Field>
              </div>

              {draft.channel === 'email' && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '.7rem', marginBottom: '.7rem' }}>
                  <Field label="Subject (EN)"><input style={C.input} value={draft.subjectEn} onChange={set('subjectEn')} /></Field>
                  <Field label="Subject (ES)"><input style={C.input} value={draft.subjectEs} onChange={set('subjectEs')} /></Field>
                </div>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '.7rem' }}>
                <Field label={draft.channel === 'sms' ? 'Message (EN)' : 'Body HTML (EN)'}><textarea style={C.textarea} value={draft.bodyEn} onChange={set('bodyEn')} /></Field>
                <Field label={draft.channel === 'sms' ? 'Message (ES)' : 'Body HTML (ES)'}><textarea style={C.textarea} value={draft.bodyEs} onChange={set('bodyEs')} /></Field>
              </div>

              <div style={{ marginTop: '.6rem', fontSize: '.7rem', color: '#64748b' }}>
                Placeholders:{' '}
                {PLACEHOLDERS.map((p) => (
                  <code key={p} style={{ color: '#a5b4fc', background: 'rgba(99,102,241,0.1)', borderRadius: 4, padding: '.05rem .3rem', marginRight: '.3rem' }}>{`{{${p}}}`}</code>
                ))}
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '.8rem', marginTop: '.9rem' }}>
                <button onClick={save} disabled={saving || !dirty} style={{ ...C.btn(dirty ? 'linear-gradient(135deg,#16a34a,#22c55e)' : 'rgba(255,255,255,0.08)'), opacity: saving || !dirty ? 0.6 : 1, cursor: saving || !dirty ? 'not-allowed' : 'pointer' }}>
                  {saving ? 'Saving…' : 'Save'}
                </button>
                <label style={{ display: 'flex', alignItems: 'center', gap: '.4rem', fontSize: '.78rem', color: '#94a3b8' }}>
                  <input type="checkbox" checked={draft.active} onChange={set('active')} /> Active
                </label>
                {!draft.isDefault && draft.id && (
                  <button onClick={remove} style={{ ...C.ghost, color: '#f87171', borderColor: 'rgba(239,68,68,0.3)', marginLeft: 'auto' }}>Delete</button>
                )}
                {notice && <span style={{ fontSize: '.78rem', color: notice.includes('✓') ? '#4ade80' : '#fbbf24' }}>{notice}</span>}
              </div>
            </div>

            {/* Preview + send */}
            <div style={C.card}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '.6rem', marginBottom: '.7rem', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '.8rem', fontWeight: 700, color: '#f1f5f9' }}>Live preview</span>
                <div style={{ display: 'flex', gap: '.25rem', marginLeft: '.4rem' }}>
                  {['en', 'es'].map((l) => (
                    <button key={l} onClick={() => setLang(l)} style={{ ...C.ghost, padding: '.25rem .6rem', borderColor: lang === l ? '#f97316' : 'rgba(255,255,255,0.12)', color: lang === l ? '#fb923c' : '#94a3b8' }}>{l.toUpperCase()}</button>
                  ))}
                </div>
                <input style={{ ...C.input, width: 150 }} value={sampleName} onChange={(e) => setSampleName(e.target.value)} placeholder="Sample name" />
                <input style={{ ...C.input, width: 150 }} value={sampleEvent} onChange={(e) => setSampleEvent(e.target.value)} placeholder="Sample event" />
              </div>

              {draft.channel === 'email' ? (
                <>
                  <div style={{ fontSize: '.75rem', color: '#94a3b8', marginBottom: '.4rem' }}>
                    <b style={{ color: '#cbd5e1' }}>Subject:</b> {previewSubject || <span style={{ color: '#475569' }}>(empty)</span>}
                  </div>
                  <iframe title="preview" srcDoc={previewHtml} sandbox="" style={{ width: '100%', height: 320, border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, background: '#0d0d1a' }} />
                </>
              ) : (
                <div style={{ whiteSpace: 'pre-wrap', background: '#0d0d1a', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, padding: '.8rem', fontSize: '.85rem', color: '#e2e8f0' }}>
                  {previewBody || <span style={{ color: '#475569' }}>(empty)</span>}
                </div>
              )}

              {/* Test send */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '.5rem', marginTop: '.9rem', flexWrap: 'wrap' }}>
                <input
                  style={{ ...C.input, maxWidth: 280 }}
                  value={sendTo}
                  onChange={(e) => setSendTo(e.target.value)}
                  placeholder={draft.channel === 'sms' ? 'Test phone (+1…)' : 'Test email address'}
                />
                <button onClick={handleSend} disabled={sending} style={{ ...C.btn('linear-gradient(135deg,#7c3aed,#a855f7)'), opacity: sending ? 0.6 : 1 }}>
                  {sending ? 'Sending…' : 'Send test'}
                </button>
                {sendResult && <span style={{ fontSize: '.78rem', color: sendResult.ok ? '#4ade80' : '#fbbf24' }}>{sendResult.message}</span>}
              </div>
              <p style={{ fontSize: '.68rem', color: '#475569', margin: '.5rem 0 0' }}>
                Sending uses the saved template (edits are saved first). SMS needs Twilio + A2P 10DLC; email needs SendGrid.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '.3rem' }}>
      <label style={C.label}>{label}</label>
      {children}
    </div>
  );
}
