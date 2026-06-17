import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';

export default function Gallery() {
  const { eventCode } = useParams();
  const [event, setEvent] = useState(null);
  const [photos, setPhotos] = useState([]);
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/events/${eventCode}/gallery`)
      .then((r) => r.json())
      .then((data) => {
        setEvent({ name: data.eventName });
        setPhotos(data.photos || []);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [eventCode]);

  if (loading) {
    return (
      <div style={centerStyle}>
        <p style={{ color: '#94a3b8' }}>Loading gallery…</p>
      </div>
    );
  }

  return (
    <div style={{ background: '#0d0d1a', minHeight: '100dvh', color: '#f1f5f9', fontFamily: 'system-ui,sans-serif' }}>
      {/* Header */}
      <header style={{ padding: '2rem 1.5rem', textAlign: 'center', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <div style={{
          fontSize: '1.1rem', fontWeight: 900,
          background: 'linear-gradient(135deg,#7c3aed,#a855f7)',
          WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
          marginBottom: '.5rem',
        }}>
          ⚡ Flash-it
        </div>
        <h1 style={{ fontSize: 'clamp(1.5rem,5vw,2.5rem)', fontWeight: 800, margin: 0 }}>
          {event?.name || eventCode}
        </h1>
        <p style={{ color: '#64748b', marginTop: '.5rem', fontSize: '.9rem' }}>{photos.length} photos</p>
      </header>

      {/* Photo grid */}
      <div style={{
        padding: '1.5rem',
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
        gap: '1rem',
        maxWidth: 1200,
        margin: '0 auto',
      }}>
        {photos.length === 0 && (
          <p style={{ color: '#475569', gridColumn: '1/-1', textAlign: 'center', padding: '3rem' }}>
            No photos yet
          </p>
        )}
        {photos.map((photo, i) => {
          const url = photo.url || photo.finalUrl || photo.processedUrl || photo;
          return (
            <div
              key={i}
              onClick={() => setSelected(url)}
              style={{
                aspectRatio: '3/4', overflow: 'hidden', borderRadius: 12,
                cursor: 'pointer', border: '1px solid rgba(255,255,255,0.07)',
              }}
            >
              <img
                src={url}
                alt=""
                style={{ width: '100%', height: '100%', objectFit: 'cover', transition: 'transform .3s' }}
                onMouseOver={(e) => (e.target.style.transform = 'scale(1.05)')}
                onMouseOut={(e) => (e.target.style.transform = 'scale(1)')}
              />
            </div>
          );
        })}
      </div>

      {/* Lightbox */}
      {selected && (
        <div
          onClick={() => setSelected(null)}
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.92)',
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            justifyContent: 'center', zIndex: 100, padding: '1rem',
          }}
        >
          <img
            src={selected}
            alt=""
            style={{ maxWidth: '90vw', maxHeight: '80vh', borderRadius: 12, objectFit: 'contain' }}
            onClick={(e) => e.stopPropagation()}
          />
          <div style={{ marginTop: '1rem', display: 'flex', gap: '1rem' }}>
            <a
              href={selected}
              download
              target="_blank"
              rel="noreferrer"
              onClick={(e) => e.stopPropagation()}
              style={{
                background: 'linear-gradient(135deg,#7c3aed,#a855f7)', color: '#fff',
                textDecoration: 'none', padding: '.6rem 1.5rem', borderRadius: 10,
                fontWeight: 700, fontSize: '.9rem',
              }}
            >
              ↓ Download
            </a>
            <button
              onClick={() => setSelected(null)}
              style={{
                background: 'rgba(255,255,255,0.08)', color: '#f1f5f9', border: 'none',
                padding: '.6rem 1.5rem', borderRadius: 10, fontWeight: 700, cursor: 'pointer',
              }}
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

const centerStyle = {
  minHeight: '100dvh', display: 'flex', alignItems: 'center',
  justifyContent: 'center', background: '#0d0d1a',
};
