import { useState, useEffect, useCallback } from 'react';

// ── Style tokens (mirror Admin.jsx) ──────────────────────────────────────────
const S = {
  card: {
    background: '#1a1a2e',
    border: '1px solid rgba(255,255,255,0.07)',
    borderRadius: 12,
    padding: '1.25rem',
  },
  label: {
    fontSize: '.75rem',
    color: '#94a3b8',
    fontWeight: 600,
    display: 'block',
    marginBottom: '.35rem',
  },
  input: {
    background: 'rgba(255,255,255,0.06)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: 8,
    padding: '.6rem .8rem',
    color: '#f1f5f9',
    fontSize: '.88rem',
    outline: 'none',
    width: '100%',
    boxSizing: 'border-box',
    fontFamily: 'system-ui, sans-serif',
  },
  btn: {
    borderRadius: 9,
    padding: '.55rem 1.1rem',
    fontSize: '.82rem',
    fontWeight: 700,
    cursor: 'pointer',
    border: 'none',
    fontFamily: 'system-ui, sans-serif',
  },
  btnPrimary: {
    background: 'linear-gradient(135deg, #7c3aed, #6d28d9)',
    color: '#fff',
  },
  btnGhost: {
    background: 'rgba(255,255,255,0.06)',
    color: '#94a3b8',
    border: '1px solid rgba(255,255,255,0.1)',
  },
};

const BLANK_TEMPLATE = {
  id: '',
  name: '',
  description: '',
  type: 'single',
  printWidth: 1200,
  printHeight: 1800,
  photoCount: 1,
  background: '#0d0d1a',
  photoSlots: [{ index: 0, x: 60, y: 60, width: 1080, height: 1530 }],
  logoSlot: { x: 900, y: 1640, width: 240, height: 100 },
  textSlot: { x: 60, y: 1660, maxWidth: 820, fontSize: 28, color: '#ffffff' },
};

/**
 * TemplateDesigner — Admin page for viewing and editing print templates.
 * Rendered inline inside Admin.jsx when the "Templates" tab is active.
 */
export default function TemplateDesigner({ adminHeaders }) {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState(null); // null = list view, object = form view
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // ── Load templates ──────────────────────────────────────────────────────────
  const loadTemplates = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/templates');
      if (res.ok) {
        const body = await res.json();
        setTemplates(body.templates || []);
      }
    } catch (e) {
      console.warn('[TemplateDesigner] loadTemplates error', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadTemplates(); }, [loadTemplates]);

  // ── Save template ───────────────────────────────────────────────────────────
  async function handleSave(e) {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!editing.id?.trim()) { setError('Template ID is required.'); return; }
    if (!editing.name?.trim()) { setError('Template name is required.'); return; }

    setSaving(true);
    try {
      const headers = adminHeaders
        ? adminHeaders()
        : { 'Content-Type': 'application/json' };

      const res = await fetch('/api/templates', {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify(editing),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || 'Save failed');
      setSuccess('Template saved!');
      await loadTemplates();
      setTimeout(() => setEditing(null), 1200);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  function set(k) {
    return (e) => setEditing((prev) => ({ ...prev, [k]: e.target.value }));
  }

  // ── List view ───────────────────────────────────────────────────────────────
  if (!editing) {
    return (
      <div style={{ fontFamily: 'system-ui, sans-serif' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
          <h2 style={{ fontSize: '1rem', fontWeight: 700, color: '#f1f5f9', margin: 0 }}>
            Print Templates ({templates.length})
          </h2>
          <button
            style={{ ...S.btn, ...S.btnPrimary }}
            onClick={() => setEditing({ ...BLANK_TEMPLATE })}
          >
            + New Template
          </button>
        </div>

        {loading && <p style={{ color: '#64748b', textAlign: 'center', padding: '2rem' }}>Loading…</p>}

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '1rem' }}>
          {templates.map((t) => (
            <TemplateCard key={t.id} template={t} onEdit={() => setEditing({ ...t })} />
          ))}
          {!loading && templates.length === 0 && (
            <p style={{ color: '#475569', gridColumn: '1/-1', textAlign: 'center', padding: '2rem' }}>
              No templates found. Create one to get started.
            </p>
          )}
        </div>
      </div>
    );
  }

  // ── Edit / New form ─────────────────────────────────────────────────────────
  return (
    <div style={{ maxWidth: 600, fontFamily: 'system-ui, sans-serif' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
        <button
          style={{ ...S.btn, ...S.btnGhost }}
          onClick={() => { setEditing(null); setError(''); setSuccess(''); }}
        >
          Back
        </button>
        <h2 style={{ fontSize: '1rem', fontWeight: 700, color: '#f1f5f9', margin: 0 }}>
          {editing.id && templates.find((t) => t.id === editing.id) ? 'Edit Template' : 'New Template'}
        </h2>
      </div>

      <div style={S.card}>
        <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>

          {/* Identity */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '.75rem' }}>
            <FormField label="Template ID *" value={editing.id} onChange={set('id')} placeholder="my-custom-layout" />
            <FormField label="Display Name *" value={editing.name} onChange={set('name')} placeholder="My Custom Layout" />
          </div>

          <FormField label="Description" value={editing.description || ''} onChange={set('description')} placeholder="Brief description" />

          {/* Type + dimensions */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '.75rem' }}>
            <div>
              <label style={S.label}>Type</label>
              <select
                value={editing.type || 'single'}
                onChange={set('type')}
                style={{ ...S.input }}
              >
                {['single', 'strip', 'collage'].map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
            <FormField label="Print Width (px)" value={editing.printWidth} onChange={set('printWidth')} type="number" />
            <FormField label="Print Height (px)" value={editing.printHeight} onChange={set('printHeight')} type="number" />
          </div>

          <FormField label="Photo Count" value={editing.photoCount} onChange={set('photoCount')} type="number" />

          {/* Colors */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '.75rem' }}>
            <div>
              <label style={S.label}>Background Color</label>
              <div style={{ display: 'flex', gap: '.5rem', alignItems: 'center' }}>
                <input
                  type="color"
                  value={editing.background || '#0d0d1a'}
                  onChange={set('background')}
                  style={{ width: 40, height: 36, border: 'none', borderRadius: 6, cursor: 'pointer', background: 'none', padding: 0 }}
                />
                <input
                  type="text"
                  value={editing.background || '#0d0d1a'}
                  onChange={set('background')}
                  style={{ ...S.input, flex: 1 }}
                  placeholder="#0d0d1a"
                />
              </div>
            </div>
            <div>
              <label style={S.label}>Text Color</label>
              <div style={{ display: 'flex', gap: '.5rem', alignItems: 'center' }}>
                <input
                  type="color"
                  value={editing.textSlot?.color || '#ffffff'}
                  onChange={(e) => setEditing((prev) => ({
                    ...prev,
                    textSlot: { ...(prev.textSlot || {}), color: e.target.value },
                  }))}
                  style={{ width: 40, height: 36, border: 'none', borderRadius: 6, cursor: 'pointer', background: 'none', padding: 0 }}
                />
                <input
                  type="text"
                  value={editing.textSlot?.color || '#ffffff'}
                  onChange={(e) => setEditing((prev) => ({
                    ...prev,
                    textSlot: { ...(prev.textSlot || {}), color: e.target.value },
                  }))}
                  style={{ ...S.input, flex: 1 }}
                  placeholder="#ffffff"
                />
              </div>
            </div>
          </div>

          {/* Logo position */}
          <fieldset style={{ border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, padding: '1rem', margin: 0 }}>
            <legend style={{ color: '#64748b', fontSize: '.75rem', fontWeight: 700, padding: '0 .4rem' }}>Logo Position</legend>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '.5rem' }}>
              {['x', 'y', 'width', 'height'].map((k) => (
                <div key={k}>
                  <label style={S.label}>{k}</label>
                  <input
                    type="number"
                    value={editing.logoSlot?.[k] ?? ''}
                    onChange={(e) => setEditing((prev) => ({
                      ...prev,
                      logoSlot: { ...(prev.logoSlot || {}), [k]: Number(e.target.value) },
                    }))}
                    style={S.input}
                  />
                </div>
              ))}
            </div>
          </fieldset>

          {/* Text slot position */}
          <fieldset style={{ border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, padding: '1rem', margin: 0 }}>
            <legend style={{ color: '#64748b', fontSize: '.75rem', fontWeight: 700, padding: '0 .4rem' }}>Text Position</legend>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '.5rem' }}>
              {['x', 'y', 'maxWidth', 'fontSize'].map((k) => (
                <div key={k}>
                  <label style={S.label}>{k}</label>
                  <input
                    type="number"
                    value={editing.textSlot?.[k] ?? ''}
                    onChange={(e) => setEditing((prev) => ({
                      ...prev,
                      textSlot: { ...(prev.textSlot || {}), [k]: Number(e.target.value) },
                    }))}
                    style={S.input}
                  />
                </div>
              ))}
            </div>
          </fieldset>

          {error && <p style={{ color: '#f87171', fontSize: '.8rem', margin: 0 }}>{error}</p>}
          {success && <p style={{ color: '#4ade80', fontSize: '.8rem', margin: 0 }}>{success}</p>}

          <button
            type="submit"
            disabled={saving}
            style={{
              ...S.btn,
              ...S.btnPrimary,
              padding: '.8rem',
              fontSize: '.95rem',
              opacity: saving ? 0.6 : 1,
              cursor: saving ? 'not-allowed' : 'pointer',
            }}
          >
            {saving ? 'Saving…' : 'Save Template'}
          </button>
        </form>
      </div>
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function TemplateCard({ template, onEdit }) {
  const MOCK_W = 100;
  const MOCK_H = template.printHeight > template.printWidth
    ? 140
    : Math.round(MOCK_W * (template.printHeight / template.printWidth));
  const scaleX = MOCK_W / template.printWidth;
  const scaleY = MOCK_H / template.printHeight;

  return (
    <div
      style={{
        background: '#1a1a2e',
        border: '1px solid rgba(255,255,255,0.07)',
        borderRadius: 12,
        padding: '1rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '.75rem',
        fontFamily: 'system-ui, sans-serif',
      }}
    >
      {/* Mockup */}
      <div style={{ display: 'flex', justifyContent: 'center' }}>
        <svg width={MOCK_W} height={MOCK_H} style={{ borderRadius: 6 }}>
          <rect width={MOCK_W} height={MOCK_H} fill={template.background || '#0d0d1a'} rx={4} />
          {(template.photoSlots || []).map((slot, i) => (
            <rect
              key={i}
              x={slot.x * scaleX}
              y={slot.y * scaleY}
              width={slot.width * scaleX}
              height={slot.height * scaleY}
              fill="rgba(124,58,237,0.5)"
              rx={2}
            />
          ))}
        </svg>
      </div>

      {/* Info */}
      <div>
        <p style={{ color: '#f1f5f9', fontWeight: 700, fontSize: '.88rem', margin: '0 0 .2rem' }}>{template.name}</p>
        <p style={{ color: '#64748b', fontSize: '.74rem', margin: 0 }}>
          {template.photoCount} photo{template.photoCount !== 1 ? 's' : ''} · {template.printWidth}×{template.printHeight}
        </p>
      </div>

      <button
        onClick={onEdit}
        style={{
          background: 'rgba(124,58,237,0.12)',
          color: '#a78bfa',
          border: '1px solid rgba(124,58,237,0.25)',
          borderRadius: 8,
          padding: '.4rem .75rem',
          fontSize: '.78rem',
          fontWeight: 600,
          cursor: 'pointer',
          fontFamily: 'system-ui, sans-serif',
        }}
      >
        Edit
      </button>
    </div>
  );
}

function FormField({ label, value, onChange, type = 'text', placeholder = '' }) {
  return (
    <div>
      <label style={S.label}>{label}</label>
      <input
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        style={S.input}
        onFocus={(e) => (e.target.style.borderColor = '#7c3aed')}
        onBlur={(e) => (e.target.style.borderColor = 'rgba(255,255,255,0.1)')}
      />
    </div>
  );
}
