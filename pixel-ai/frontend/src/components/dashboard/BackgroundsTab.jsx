import { useState, useEffect, useCallback } from 'react';
import { getBackgrounds } from '../../utils/api.js';

/**
 * BackgroundsTab — READ-ONLY catalogue browser for HOSTS.
 *
 * Hosts (customers) do NOT build backgrounds — only the admin does. This tab lets
 * a host browse the global catalogue so they know what's available, then pick from
 * it when they create an event (see EventsTab). Uploading is admin-only on the
 * backend (POST /api/backgrounds now 403s for hosts), so there is no upload form
 * here. Listing (GET /api/backgrounds) stays public.
 */

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
  { id: '', label: 'All' },
  { id: 'natural', label: 'Natural' },
  { id: 'character', label: 'Character' },
];

function Spinner() {
  return (
    <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}>
      <div style={{ width: 36, height: 36, borderRadius: '50%', border: '3px solid var(--accent)', borderTopColor: 'transparent', animation: 'spin 0.8s linear infinite' }} />
    </div>
  );
}

export default function BackgroundsTab() {
  const [category, setCategory] = useState('wedding');
  const [mode, setMode] = useState('');
  const [backgrounds, setBackgrounds] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async (cat, m) => {
    setLoading(true);
    try {
      const data = await getBackgrounds(cat, m || undefined);
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

  return (
    <div>
      <h2 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text)', marginBottom: '.5rem' }}>
        Backgrounds & Templates
      </h2>
      <p style={{ fontSize: '.85rem', color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
        Browse the available themed art. Natural frames composite over the guest's real photo;
        Character templates drop the guest's cropped face into the artwork. Pick the ones you want
        when you create an event in the <strong style={{ color: 'var(--text)' }}>Events</strong> tab.
      </p>

      {/* Mode filter */}
      <div style={{ display: 'flex', gap: '.5rem', marginBottom: '1rem' }}>
        {MODES.map((m) => {
          const active = mode === m.id;
          return (
            <button
              key={m.id || 'all'}
              onClick={() => setMode(m.id)}
              style={{
                background: active ? 'var(--accent)' : 'var(--card-bg)',
                color: active ? '#fff' : 'var(--text-muted)',
                border: active ? 'none' : '1px solid var(--border)',
                borderRadius: 99, padding: '.4rem 1rem', fontSize: '.8rem',
                fontWeight: active ? 600 : 400, cursor: 'pointer',
              }}
            >
              {m.label}
            </button>
          );
        })}
      </div>

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
                borderRadius: 99, padding: '.4rem .9rem', fontSize: '.8rem',
                fontWeight: active ? 600 : 400, cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: '.35rem',
              }}
            >
              <span>{c.icon}</span>
              {c.label}
            </button>
          );
        })}
      </div>

      {/* Read-only grid (filtered by category + mode) */}
      {loading ? (
        <Spinner />
      ) : backgrounds.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--text-muted)' }}>
          <div style={{ fontSize: '2.5rem', marginBottom: '.75rem' }}>🖼️</div>
          <p style={{ fontSize: '.9rem' }}>No templates in this category yet.</p>
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
