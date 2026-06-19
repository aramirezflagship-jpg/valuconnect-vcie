import { useState, useEffect, useCallback, useRef } from 'react';
import {
  getBackgrounds,
  adminUploadBackground,
  adminGenerateBackground,
} from '../../utils/api.js';
import FaceSlotEditor from '../dashboard/FaceSlotEditor.jsx';

/**
 * AdminBackgrounds — the ADMIN-ONLY catalogue builder.
 *
 * Only the admin (authenticated with the x-admin-secret header, stored in
 * localStorage at admin login) creates global background templates. Customers
 * and their guests merely PICK from this catalogue. This view lets the admin:
 *   1. Browse the global catalogue (GET /api/backgrounds, public).
 *   2. Manually upload a template (POST /api/backgrounds, admin-only).
 *   3. AI-generate a template with Gemini (POST /api/backgrounds/generate,
 *      admin-only; degrades gracefully on 503 when billing isn't enabled).
 *
 * Admin auth header is provided by the api.js helpers (adminUploadBackground /
 * adminGenerateBackground), which attach `x-admin-secret` — NOT a Bearer token.
 */

// Canonical occasion categories — mirrors the backend's CATEGORIES list
// (services/backgrounds.js), including the newer `kids-birthday`.
const CATEGORIES = [
  { id: 'wedding', label: 'Wedding · Boda', icon: '💍' },
  { id: 'quinceanera', label: 'Quinceañera · XV', icon: '🌸' },
  { id: 'corporate', label: 'Corporate · Corporativo', icon: '🏢' },
  { id: 'birthday', label: 'Birthday · Cumpleaños', icon: '🎂' },
  { id: 'kids-birthday', label: "Kids' Birthday · Infantil", icon: '🧸' },
  { id: 'holiday', label: 'Holiday · Fiesta', icon: '🎄' },
  { id: 'fiesta', label: 'Fiesta · Party', icon: '🎉' },
];

const MODES = [
  { id: 'natural', label: 'Natural', icon: '🖼️', hint: 'Themed frame / overlay PNG (image optional)' },
  { id: 'character', label: 'Character', icon: '🦸', hint: 'Artwork PNG — admin uploads a SOLID face circle; the backend punches the transparent face hole at the slot' },
];

// ── Dark-UI style tokens (mirror Admin.jsx) ───────────────────────────────────
const S = {
  card: {
    background: '#1a1a2e', border: '1px solid rgba(255,255,255,0.07)',
    borderRadius: 12, padding: '1.25rem',
  },
  label: { fontSize: '.75rem', color: '#94a3b8', fontWeight: 600, display: 'block', marginBottom: '.35rem' },
  input: {
    background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: 8, padding: '.6rem .8rem', color: '#f1f5f9', fontSize: '.88rem',
    outline: 'none', width: '100%', boxSizing: 'border-box', fontFamily: 'system-ui, sans-serif',
  },
  primaryBtn: {
    background: 'linear-gradient(135deg, #dc2626, #f97316)', color: '#fff',
    border: 'none', borderRadius: 10, padding: '.7rem 1.3rem',
    fontSize: '.88rem', fontWeight: 600, cursor: 'pointer',
  },
  sectionTitle: { fontSize: '1rem', fontWeight: 700, color: '#f1f5f9', margin: '0 0 1rem' },
  subTitle: { fontSize: '.85rem', fontWeight: 700, color: '#94a3b8', letterSpacing: '.04em', margin: '0 0 .75rem' },
};

function Spinner() {
  return (
    <div style={{ display: 'flex', justifyContent: 'center', padding: '2.5rem' }}>
      <div style={{ width: 34, height: 34, borderRadius: '50%', border: '3px solid #dc2626', borderTopColor: 'transparent', animation: 'spin 0.8s linear infinite' }} />
    </div>
  );
}

function Notice({ kind, children }) {
  const map = {
    error: { bg: 'rgba(239,68,68,0.12)', border: 'rgba(239,68,68,0.3)', color: '#f87171' },
    warn: { bg: 'rgba(245,158,11,0.12)', border: 'rgba(245,158,11,0.3)', color: '#fbbf24' },
    success: { bg: 'rgba(16,185,129,0.12)', border: 'rgba(16,185,129,0.3)', color: '#4ade80' },
  };
  const c = map[kind] || map.error;
  return (
    <p style={{ fontSize: '.8rem', color: c.color, background: c.bg, border: `1px solid ${c.border}`, borderRadius: 8, padding: '.6rem .85rem', margin: 0 }}>
      {children}
    </p>
  );
}

function ModeToggle({ mode, setMode }) {
  return (
    <div style={{ display: 'flex', gap: '.5rem', marginBottom: '.75rem' }}>
      {MODES.map((m) => {
        const active = mode === m.id;
        return (
          <button
            key={m.id}
            type="button"
            onClick={() => setMode(m.id)}
            title={m.hint}
            style={{
              flex: 1,
              background: active ? 'linear-gradient(135deg, #dc2626, #f97316)' : 'rgba(255,255,255,0.06)',
              color: active ? '#fff' : '#94a3b8',
              border: active ? 'none' : '1px solid rgba(255,255,255,0.1)',
              borderRadius: 10, padding: '.55rem .9rem', fontSize: '.85rem', fontWeight: 600,
              cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '.4rem',
            }}
          >
            <span>{m.icon}</span>
            {m.label}
          </button>
        );
      })}
    </div>
  );
}

function CategorySelect({ value, onChange }) {
  return (
    <select style={S.input} value={value} onChange={(e) => onChange(e.target.value)}>
      {CATEGORIES.map((c) => (
        <option key={c.id} value={c.id}>
          {c.icon} {c.label}
        </option>
      ))}
    </select>
  );
}

// ── Manual upload form ────────────────────────────────────────────────────────

function ManualUpload({ category, onUploaded }) {
  const [mode, setMode] = useState('natural');
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [name, setName] = useState('');
  const [faceSlot, setFaceSlot] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const fileRef = useRef(null);

  // Reset face slot when leaving character mode.
  useEffect(() => {
    if (mode !== 'character') setFaceSlot(null);
  }, [mode]);

  function handleFile(e) {
    const f = e.target.files?.[0] || null;
    setFile(f);
    setPreview(f ? URL.createObjectURL(f) : null);
    setFaceSlot(null);
    setSuccess('');
    if (f && !name) setName(f.name.replace(/\.[^.]+$/, ''));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (mode === 'character' && !file) {
      setError('Character templates require an artwork PNG (upload a SOLID face circle — the backend punches the hole).');
      return;
    }
    if (mode === 'character' && (!faceSlot || !faceSlot.width || !faceSlot.height)) {
      setError('Define the face slot — drag a box over the face on the preview.');
      return;
    }
    if (mode === 'natural' && !file) {
      setError('Natural frames need a transparent overlay PNG to composite.');
      return;
    }

    setUploading(true);
    try {
      await adminUploadBackground({
        image: file,
        category,
        mode,
        name: name.trim() || category,
        faceSlot: mode === 'character' ? faceSlot : undefined,
      });
      setFile(null);
      setPreview(null);
      setName('');
      setFaceSlot(null);
      if (fileRef.current) fileRef.current.value = '';
      setSuccess('Template added to the global catalogue.');
      onUploaded();
    } catch (err) {
      setError(err?.response?.data?.error || err?.message || 'Upload failed. Please try again.');
    } finally {
      setUploading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} style={{ ...S.card, display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <h3 style={{ ...S.subTitle, margin: 0 }}>📤 MANUAL UPLOAD</h3>

      <ModeToggle mode={mode} setMode={setMode} />
      <p style={{ fontSize: '.74rem', color: '#64748b', margin: 0 }}>
        {MODES.find((m) => m.id === mode)?.hint}
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: preview && mode !== 'character' ? 'auto 1fr' : '1fr', gap: '1rem', alignItems: 'start' }}>
        {preview && mode !== 'character' && (
          <img src={preview} alt="preview" style={{ width: 90, height: 120, objectFit: 'cover', borderRadius: 10, border: '1px solid rgba(255,255,255,0.1)' }} />
        )}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '.7rem' }}>
          <input ref={fileRef} type="file" accept="image/png,image/*" onChange={handleFile} style={{ ...S.input, padding: '.5rem .8rem' }} />
          <input style={S.input} value={name} onChange={(e) => setName(e.target.value)} placeholder="Template name (e.g. Fiesta Hero)" />
        </div>
      </div>

      {mode === 'character' && preview && (
        <div style={{ ...S.card, background: 'rgba(255,255,255,0.03)' }}>
          <div style={{ fontSize: '.8rem', fontWeight: 600, color: '#f1f5f9', marginBottom: '.75rem' }}>
            Define the face slot
          </div>
          <FaceSlotEditor src={preview} value={faceSlot} onChange={setFaceSlot} />
        </div>
      )}

      {error && <Notice kind="error">{error}</Notice>}
      {success && <Notice kind="success">{success}</Notice>}

      <button type="submit" disabled={uploading} style={{ ...S.primaryBtn, alignSelf: 'flex-start', opacity: uploading ? 0.7 : 1, cursor: uploading ? 'not-allowed' : 'pointer' }}>
        {uploading ? 'Uploading…' : `⬆ Upload ${mode === 'character' ? 'Character' : 'Natural'} Template`}
      </button>
    </form>
  );
}

// ── AI generate form ──────────────────────────────────────────────────────────

function AiGenerate({ category, onGenerated }) {
  const [mode, setMode] = useState('natural');
  const [prompt, setPrompt] = useState('');
  const [name, setName] = useState('');
  const [faceSlot, setFaceSlot] = useState(null);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState('');
  const [warn, setWarn] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    if (mode !== 'character') setFaceSlot(null);
  }, [mode]);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setWarn('');
    setSuccess('');

    if (!prompt.trim()) {
      setError('Enter a prompt describing the artwork.');
      return;
    }
    if (mode === 'character' && (!faceSlot || !faceSlot.width || !faceSlot.height)) {
      setError('Character mode needs a face slot. Enter x / y / width / height (in 1200×1800 artwork pixels).');
      return;
    }

    setGenerating(true);
    try {
      await adminGenerateBackground({
        prompt: prompt.trim(),
        category,
        mode,
        name: name.trim() || category,
        faceSlot: mode === 'character' ? faceSlot : undefined,
      });
      setPrompt('');
      setName('');
      setFaceSlot(null);
      setSuccess('AI template generated and added to the catalogue.');
      onGenerated();
    } catch (err) {
      // 503 → Gemini billing isn't enabled. Degrade gracefully; manual upload still works.
      if (err?.response?.status === 503) {
        setWarn('AI generation needs billing enabled on the Gemini project. Manual upload still works — use the form on the left.');
      } else {
        setError(err?.response?.data?.error || err?.message || 'Generation failed. Please try again.');
      }
    } finally {
      setGenerating(false);
    }
  }

  // Lightweight numeric face-slot inputs (no preview image exists pre-generation).
  function setSlotField(key, raw) {
    const num = Math.max(0, Math.round(Number(raw) || 0));
    setFaceSlot((prev) => ({ x: 0, y: 0, width: 0, height: 0, shape: 'oval', ...(prev || {}), [key]: num }));
  }

  return (
    <form onSubmit={handleSubmit} style={{ ...S.card, display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <h3 style={{ ...S.subTitle, margin: 0 }}>✨ AI GENERATE (GEMINI)</h3>

      <ModeToggle mode={mode} setMode={setMode} />

      <div>
        <label style={S.label}>Prompt</label>
        <textarea
          style={{ ...S.input, minHeight: 80, resize: 'vertical' }}
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="e.g. festive papel picado banners over a warm sunset, vibrant Mexican fiesta theme"
        />
      </div>

      <div>
        <label style={S.label}>Template name</label>
        <input style={S.input} value={name} onChange={(e) => setName(e.target.value)} placeholder="Optional — defaults to the category" />
      </div>

      {mode === 'character' && (
        <div style={{ ...S.card, background: 'rgba(255,255,255,0.03)' }}>
          <div style={{ fontSize: '.78rem', color: '#94a3b8', marginBottom: '.6rem' }}>
            Face slot (artwork is normalized to 1200×1800). The backend punches the transparent hole here.
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '.5rem' }}>
            {['x', 'y', 'width', 'height'].map((k) => (
              <label key={k} style={{ display: 'flex', flexDirection: 'column', gap: '.25rem', fontSize: '.7rem', color: '#94a3b8' }}>
                {k}
                <input
                  type="number"
                  min="0"
                  value={faceSlot?.[k] ?? ''}
                  onChange={(e) => setSlotField(k, e.target.value)}
                  style={{ ...S.input, padding: '.4rem .5rem' }}
                />
              </label>
            ))}
          </div>
        </div>
      )}

      {error && <Notice kind="error">{error}</Notice>}
      {warn && <Notice kind="warn">{warn}</Notice>}
      {success && <Notice kind="success">{success}</Notice>}

      <button type="submit" disabled={generating} style={{ ...S.primaryBtn, alignSelf: 'flex-start', opacity: generating ? 0.7 : 1, cursor: generating ? 'not-allowed' : 'pointer' }}>
        {generating ? 'Generating…' : '✨ Generate Template'}
      </button>
    </form>
  );
}

// ── Catalogue grid ────────────────────────────────────────────────────────────

function CatalogueGrid({ backgrounds, loading }) {
  if (loading) return <Spinner />;
  if (!backgrounds.length) {
    return (
      <div style={{ textAlign: 'center', padding: '3rem 1rem', color: '#64748b' }}>
        <div style={{ fontSize: '2.5rem', marginBottom: '.75rem' }}>🖼️</div>
        <p style={{ fontSize: '.9rem' }}>No templates match this filter yet.</p>
      </div>
    );
  }
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '1rem' }}>
      {backgrounds.map((bg) => (
        <div key={bg.id} style={{ ...S.card, overflow: 'hidden', padding: 0 }}>
          <div style={{ position: 'relative', paddingBottom: '133%', background: 'rgba(255,255,255,0.04)' }}>
            <img
              src={bg.thumbnailUrl || bg.url}
              alt={bg.name}
              loading="lazy"
              style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
            />
            <span style={{
              position: 'absolute', top: 6, left: 6,
              background: bg.mode === 'character' ? 'rgba(124,58,237,0.9)' : 'rgba(220,38,38,0.85)',
              color: '#fff', fontSize: '.62rem', fontWeight: 700, padding: '.15rem .5rem', borderRadius: 99,
            }}>
              {bg.mode === 'character' ? '🦸 Character' : '🖼️ Natural'}
            </span>
          </div>
          <div style={{ padding: '.55rem .7rem' }}>
            <div style={{ fontSize: '.78rem', color: '#f1f5f9', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {bg.name}
            </div>
            <div style={{ fontSize: '.66rem', color: '#64748b', marginTop: '.2rem', textTransform: 'capitalize' }}>
              {bg.category?.replace('-', ' ')}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────

export default function AdminBackgrounds() {
  const [category, setCategory] = useState('wedding');
  const [modeFilter, setModeFilter] = useState(''); // '' = all, 'natural', 'character'
  const [backgrounds, setBackgrounds] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async (cat, m) => {
    setLoading(true);
    try {
      const data = await getBackgrounds(cat, m || undefined);
      setBackgrounds(Array.isArray(data?.backgrounds) ? data.backgrounds : []);
    } catch (err) {
      console.error('[AdminBackgrounds]', err);
      setBackgrounds([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load(category, modeFilter);
  }, [category, modeFilter, load]);

  const reload = useCallback(() => load(category, modeFilter), [load, category, modeFilter]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div>
        <h2 style={S.sectionTitle}>Backgrounds Catalogue</h2>
        <p style={{ fontSize: '.85rem', color: '#94a3b8', margin: '-.5rem 0 0' }}>
          You build the global catalogue here. Customers and their guests only pick from it — they can't upload.
        </p>
      </div>

      {/* Category + mode filters */}
      <div style={{ ...S.card, display: 'flex', flexWrap: 'wrap', gap: '1rem', alignItems: 'flex-end' }}>
        <div style={{ flex: '1 1 240px' }}>
          <label style={S.label}>Category</label>
          <CategorySelect value={category} onChange={setCategory} />
        </div>
        <div style={{ flex: '1 1 200px' }}>
          <label style={S.label}>Mode</label>
          <select style={S.input} value={modeFilter} onChange={(e) => setModeFilter(e.target.value)}>
            <option value="">All modes</option>
            <option value="natural">Natural only</option>
            <option value="character">Character only</option>
          </select>
        </div>
      </div>

      {/* Create — manual upload + AI generate side by side */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.25rem', alignItems: 'start' }}>
        <ManualUpload category={category} onUploaded={reload} />
        <AiGenerate category={category} onGenerated={reload} />
      </div>

      {/* Catalogue */}
      <div>
        <h3 style={{ ...S.subTitle }}>
          GLOBAL CATALOGUE — {CATEGORIES.find((c) => c.id === category)?.label}
          {modeFilter ? ` · ${modeFilter}` : ''}
        </h3>
        <CatalogueGrid backgrounds={backgrounds} loading={loading} />
      </div>
    </div>
  );
}
