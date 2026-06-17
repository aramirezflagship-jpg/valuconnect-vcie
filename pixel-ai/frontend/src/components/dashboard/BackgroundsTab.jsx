import { useState, useEffect, useCallback, useRef } from 'react';
import { getBackgrounds, uploadBackground } from '../../utils/api.js';

const CATEGORIES = [
  { id: 'wedding', label: 'Wedding · Boda', icon: '💍' },
  { id: 'quinceanera', label: 'Quinceañera · XV', icon: '🌸' },
  { id: 'corporate', label: 'Corporate · Corporativo', icon: '🏢' },
  { id: 'birthday', label: 'Birthday · Cumpleaños', icon: '🎂' },
  { id: 'holiday', label: 'Holiday · Fiesta', icon: '🎄' },
  { id: 'fiesta', label: 'Fiesta · Party', icon: '🎉' },
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
      <div
        style={{
          width: 36,
          height: 36,
          borderRadius: '50%',
          border: '3px solid var(--accent)',
          borderTopColor: 'transparent',
          animation: 'spin 0.8s linear infinite',
        }}
      />
    </div>
  );
}

export default function BackgroundsTab({ token }) {
  const [category, setCategory] = useState('wedding');
  const [backgrounds, setBackgrounds] = useState([]);
  const [loading, setLoading] = useState(true);

  // Upload form state
  const [file, setFile] = useState(null);
  const [name, setName] = useState('');
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [preview, setPreview] = useState(null);
  const fileRef = useRef(null);

  const load = useCallback(async (cat) => {
    setLoading(true);
    try {
      const data = await getBackgrounds(cat);
      setBackgrounds(Array.isArray(data?.backgrounds) ? data.backgrounds : []);
    } catch (err) {
      console.error('[BackgroundsTab]', err);
      setBackgrounds([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load(category);
  }, [category, load]);

  function handleFile(e) {
    const f = e.target.files?.[0] || null;
    setFile(f);
    setPreview(f ? URL.createObjectURL(f) : null);
    if (f && !name) setName(f.name.replace(/\.[^.]+$/, ''));
  }

  async function handleUpload(e) {
    e.preventDefault();
    setError('');
    if (!file) {
      setError('Please choose an image to upload.');
      return;
    }
    setUploading(true);
    try {
      // multipart fields: image (file) + category + name
      await uploadBackground(file, category, name.trim() || category, token);
      setFile(null);
      setPreview(null);
      setName('');
      if (fileRef.current) fileRef.current.value = '';
      await load(category);
    } catch (err) {
      setError(err?.response?.data?.error || err?.message || 'Upload failed. Please try again.');
    } finally {
      setUploading(false);
    }
  }

  return (
    <div>
      <h2 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text)', marginBottom: '.5rem' }}>
        Backgrounds
      </h2>
      <p style={{ fontSize: '.85rem', color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
        Load themed art per occasion. Guests pick from these in the kiosk.
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
          Upload to {CATEGORIES.find((c) => c.id === category)?.label}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: preview ? 'auto 1fr' : '1fr', gap: '1rem', alignItems: 'start' }}>
          {preview && (
            <img
              src={preview}
              alt="preview"
              style={{ width: 90, height: 120, objectFit: 'cover', borderRadius: 10, border: '1px solid var(--border)' }}
            />
          )}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '.75rem' }}>
            <input ref={fileRef} type="file" accept="image/*" onChange={handleFile} style={{ ...inputStyle, padding: '.55rem .9rem' }} />
            <input style={inputStyle} value={name} onChange={(e) => setName(e.target.value)} placeholder="Background name (e.g. Garden Arch)" />
          </div>
        </div>

        {error && (
          <p style={{ fontSize: '.8rem', color: 'var(--danger)', background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 8, padding: '.6rem .875rem' }}>
            {error}
          </p>
        )}

        <button type="submit" disabled={uploading} className="btn btn-primary" style={{ minHeight: 46, borderRadius: 10, alignSelf: 'flex-start', padding: '0 1.5rem' }}>
          {uploading ? 'Uploading…' : '⬆ Upload Background'}
        </button>
      </form>

      {/* Existing grid */}
      {loading ? (
        <Spinner />
      ) : backgrounds.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--text-muted)' }}>
          <div style={{ fontSize: '2.5rem', marginBottom: '.75rem' }}>🖼️</div>
          <p style={{ fontSize: '.9rem' }}>No backgrounds in this category yet.</p>
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
