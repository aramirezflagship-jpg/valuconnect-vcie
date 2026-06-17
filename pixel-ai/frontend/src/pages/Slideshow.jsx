import { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';

export default function Slideshow() {
  const { eventCode } = useParams();
  const [photos, setPhotos] = useState([]);
  const [eventName, setEventName] = useState('');
  const [index, setIndex] = useState(0);
  const [fade, setFade] = useState(true);
  const timerRef = useRef(null);

  useEffect(() => {
    loadPhotos();
    const pollInterval = setInterval(loadPhotos, 6000);
    return () => clearInterval(pollInterval);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function loadPhotos() {
    try {
      const res = await fetch(`/api/events/${eventCode}/gallery`);
      const data = await res.json();
      setEventName(data.eventName || eventCode);
      setPhotos(data.photos || []);
    } catch {
      // silently ignore poll errors
    }
  }

  useEffect(() => {
    if (photos.length < 2) return;
    timerRef.current = setInterval(() => {
      setFade(false);
      setTimeout(() => {
        setIndex((i) => (i + 1) % photos.length);
        setFade(true);
      }, 500);
    }, 5000);
    return () => clearInterval(timerRef.current);
  }, [photos.length]);

  const photo = photos[index];
  const url = photo?.url || photo?.finalUrl || photo?.processedUrl || photo;

  return (
    <div style={{ position: 'fixed', inset: 0, background: '#000', overflow: 'hidden' }}>
      {url && (
        <img
          src={url}
          alt=""
          style={{
            width: '100%', height: '100%', objectFit: 'contain',
            opacity: fade ? 1 : 0, transition: 'opacity .5s ease',
          }}
        />
      )}
      {!url && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#475569' }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>⚡</div>
          <p>Waiting for photos…</p>
        </div>
      )}

      {/* Overlay info bar */}
      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0,
        background: 'linear-gradient(transparent,rgba(0,0,0,0.7))',
        padding: '2rem 1.5rem 1.5rem',
        display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end',
      }}>
        <div>
          <div style={{ fontWeight: 900, fontSize: '1.25rem', color: '#fff' }}>{eventName}</div>
          <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '.8rem' }}>{photos.length} photos</div>
        </div>
        <div style={{
          fontWeight: 900, fontSize: '1rem',
          background: 'linear-gradient(135deg,#7c3aed,#a855f7)',
          WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
        }}>
          ⚡ Flash-it
        </div>
      </div>

      {/* Dot indicators */}
      {photos.length > 1 && photos.length <= 20 && (
        <div style={{
          position: 'absolute', bottom: '4.5rem', left: '50%', transform: 'translateX(-50%)',
          display: 'flex', gap: '.4rem',
        }}>
          {photos.map((_, i) => (
            <div
              key={i}
              style={{
                width: 6, height: 6, borderRadius: '50%',
                background: i === index ? '#a855f7' : 'rgba(255,255,255,0.3)',
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
