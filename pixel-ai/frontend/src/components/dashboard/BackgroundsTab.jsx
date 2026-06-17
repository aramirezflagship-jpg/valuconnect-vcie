import { useState, useEffect, useCallback, useRef } from 'react';
import { getBackgrounds, uploadBackground } from '../../utils/api.js';
import FaceSlotEditor from './FaceSlotEditor.jsx';

const CATEGORIES = [
  { id: 'wedding', label: 'Wedding · Boda', icon: '💍' },
  { id: 'quinceanera', label: 'Quinceañera · XV', icon: '🌸' },
  { id: 'corporate', label: 'Corporate · Corporativo', icon: '🏢' },
  { id: 'birthday', label: 'Birthday · Cumpleaños', icon: '🎂' },
  { id: 'holiday', label: 'Holiday · Fiesta', icon: '🎄' },
  { id: 'fiesta', label: 'Fiesta · Party', icon: '🎉' },
];

const MODES = [
  { id: 'natural', label: 'Natural', icon: '🖼️', hint: 'Themed frame / overlay PNG (image optional)' },
  { id: 'character', label: 'Character', icon: '🦸', hint: 'Artwork PNG w/ transparent face hole + face slot (required)' },
];

const inputStyle = {
  background: 'rgba(255,255,255,0.06)',
  border: '1px solid var(--border)',
  borderRadius: 12,
  padding: '.7rem .9rem',
  color: 'var(--text)',
  fontSize: '.95rem',
  outline: 'none',
  width: '100%',
};

function Spinner() {
  return (
    <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}>
      <div style={{ width: 36, height: 36, borderRadius: '50%', border: '3px solid var(--accent)', borderTopColor: 'transparent', animation: 'spin 0.8s linear infinite' }} />
    </div>
  );
}

export default function BackgroundsTab({ token }) {
  const [category, setCategory] = useState('wedding');
  const [mode, setMode] = useState('natural');
  const [backgrounds, setBackgrounds] = useState([]);
  const [loading, setLoading] = useState(true);

  // Upload form state
  const [file, setFile] = useState(null);
  const [name, setName] = useState('');
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [preview, setPreview] = useState(null);
  const [faceSlot, setFaceSlot] = useState(null);
  const fileRef = useRef(null);

  const load = useCallback(async (cat, m) => {
    setLoading(true);
    try {
      const data = await getBackgrounds(cat, m);
      setBackgrounds(Array.isArray(data?.backgrounds) ? data.backgrounds : []);
    } catch (err) {
      console.error('[BackgroundsTab]', err);
      setBackgrounds([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load(category, mode);
  }, [category, mode, load]);

  // Reset the face slot when switching away from character mode.
  useEffect(() => {
    if (mode !== 'character') setFaceSlot(null);
  }, [mode]);

  function handleFile(e) {
    const f = e.target.files?.[0] || null;
    setFile(f);
    setPreview(f ? URL.createObjectURL(f) : null);
    setFaceSlot(null);
    if (f && !name) setName(f.name.replace(/\.[^.]+$/, ''));
  }

  async function handleUpload(e) {
    e.preventDefault();
    setError('');

    // Validation per mode.
    if (mode === 'character' && !file) {
      setError('Character templates require an artwork PNG with a transparent face hole.');
      return;
    }
    if (mode === 'character' && (!faceSlot || !faceSlot.width || !faceSlot.height)) {
      setError('Define the face slot — drag a box over the face hole on the preview.');
      return;
    }
    if (mode === 'natural' && !file) {
      setError('Natural frames need a transparent overlay PNG to composite.');
      return;
    }

    setUploading(true);
    try {
      await uploadBackground(
        {
          image: file,
          category,
          mode,
          name: name.trim() || category,
          faceSlot: mode === 'character' ? faceSlot : undefined,
        },
        token
      );
      setFile(null);
      setPreview(null);
      setName('');
      setFaceSlot(null);
      if (fileRef.current) fileRef.current.value = '';
      await load(category, mode);
    } catch (err) {
      setError(err?.response?.data?.error || err?.message || 'Upload failed. Please try again.');
    } finally {
      setUploading(false);
    }
  }

  return (
    <div>
      <h2 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text)', marginBottom: '.5rem' }}>
        Backgrounds & Templates
      </h2>
      <p style={{ fontSize: '.85rem', color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
        Natural frames composite over the guest's real photo. Character templates drop the guest's
        cropped face into the artwork's face hole. Guests pick from these in the kiosk.
      </p>

      {/* Mode toggle */}
      <div style={{ display: 'flex', gap: '.5rem', marginBottom: '1rem' }}>
        {MODES.map((m) => {
          const active = mode === m.id;
          return (
            <button
              key={m.id}
              onClick={() => setMode(m.id)}
              title={m.hint}
              style={{
                flex: 1,
                background: active ? 'var(--accent)' : 'var(--card-bg)',
                color: active ? '#fff' : 'var(--text-muted)',
                border: active ? 'none' : '1px solid var(--border)',
                borderRadius: 12,
                padding: '.6rem .9rem',
                fontSize: '.9rem',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '.4rem',
              }}
            >
              <span>{m.icon}</span>
              {m.label}
            </button>
          );
        })}
      </div>
      <p style={{ fontSize: '.75rem', color: 'var(--text-muted)', marginBottom: '1.25rem' }}>
        {MODES.find((m) => m.id === mode)?.hint}
      </p>

      {/* Category tabs */}
      <div style={{ display: 'flex', gap: '.5rem', flexWrap: 'wrap', marginBottom: '1.5rem' }}>
        {CATEGORIES.map((c) => {
          const active = category === c.id;
          return (
            <button
              key={c.id}
              onClick={() => setCategory(c.id)}
              style={{
                background: active ? 'var(--accent)' : 'var(--card-bg)',
                color: active ? '#fff' : 'var(--text-muted)',
                border: active ? 'none' : '1px solid var(--border)',
                borderRadius: 99,
                padding: '.4rem .9rem',
                fontSize: '.8rem',
                fontWeight: active ? 600 : 400,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '.35rem',
              }}
            >
              <span>{c.icon}</span>
              {c.label}
            </button>
          );
        })}
      </div>

      {/* Upload form */}
      <form
        onSubmit={handleUpload}
        className="card"
        style={{ padding: '1.25rem', marginBottom: '1.75rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}
      >
        <div style={{ fontSize: '.85rem', fontWeight: 600, color: 'var(--text)' }}>
          Upload {mode === 'character' ? 'Character' : 'Natural'} template to{' '}
          {CATEGORIES.find((c) => c.id === category)?.label}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: preview && mode !== 'character' ? 'auto 1fr' : '1fr', gap: '1rem', alignItems: 'start' }}>
          {preview && mode !== 'character' && (
            <img src={preview} alt="preview" style={{ width: 90, height: 120, objectFit: 'cover', borderRadius: 10, border: '1px solid var(--border)' }} />
          )}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '.75rem' }}>
            <input ref={fileRef} type="file" accept="image/png,image/*" onChange={handleFile} style={{ ...inputStyle, padding: '.55rem .9rem' }} />
            <input style={inputStyle} value={name} onChange={(e) => setName(e.target.value)} placeholder="Template name (e.g. Fiesta Hero)" />
          </div>
        </div>

        {/* Face slot editor — character mode only, once an artwork is chosen */}
        {mode === 'character' && preview && (
          <div className="card" style={{ padding: '1rem', background: 'rgba(255,255,255,0.03)' }}>
            <div style={{ fontSize: '.8rem', fontWeight: 600, color: 'var(--text)', marginBottom: '.75rem' }}>
              Define the face slot
            </div>
            <FaceSlotEditor src={preview} value={faceSlot} onChange={setFaceSlot} />
          </div>
        )}

        {error && (
          <p style={{ fontSize: '.8rem', color: 'var(--danger)', background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 8, padding: '.6rem .875rem' }}>
            {error}
          </p>
        )}

        <button type="submit" disabled={uploading} className="btn btn-primary" style={{ minHeight: 46, borderRadius: 10, alignSelf: 'flex-start', padding: '0 1.5rem' }}>
          {uploading ? 'Uploading…' : `⬆ Upload ${mode === 'character' ? 'Character' : 'Natural'} Template`}
        </button>
      </form>

      {/* Existing grid (filtered by category + mode) */}
      {loading ? (
        <Spinner />
      ) : backgrounds.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--text-muted)' }}>
          <div style={{ fontSize: '2.5rem', marginBottom: '.75rem' }}>🖼️</div>
          <p style={{ fontSize: '.9rem' }}>No {mode} templates in this category yet.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '1rem' }}>
          {backgrounds.map((bg) => (
            <div key={bg.id} className="card" style={{ overflow: 'hidden', padding: 0 }}>
              <div style={{ position: 'relative', paddingBottom: '133%', background: 'rgba(255,255,255,0.04)' }}>
                <img
                  src={bg.thumbnailUrl || bg.url}
                  alt={bg.name}
                  loading="lazy"
                  style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
                />
                {bg.mode === 'character' && (
                  <span style={{ position: 'absolute', top: 6, left: 6, background: 'rgba(74,143,196,0.9)', color: '#fff', fontSize: '.65rem', fontWeight: 700, padding: '.15rem .5rem', borderRadius: 99 }}>
                    🦸 Character
                  </span>
                )}
              </div>
              <div style={{ padding: '.6rem .75rem', fontSize: '.78rem', color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {bg.name}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
