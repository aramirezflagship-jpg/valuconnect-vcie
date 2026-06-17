import { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import SharingMenu from '../components/SharingMenu.jsx';

export default function VirtualBooth() {
  const { eventCode } = useParams();
  const [step, setStep] = useState('loading'); // loading | theme-select | camera | processing | share | error
  const [event, setEvent] = useState(null);
  const [selectedTheme, setSelectedTheme] = useState(null);
  const [photoUrl, setPhotoUrl] = useState(null);
  const [error, setError] = useState('');
  const videoRef = useRef(null);
  const streamRef = useRef(null);

  useEffect(() => {
    fetch(`/api/virtual-booth/${eventCode}`)
      .then(r => r.json())
      .then(data => {
        if (data.error) { setError(data.error); setStep('error'); return; }
        setEvent(data);
        // Skip theme select if only one/no theme
        if (!data.themes || data.themes.length <= 1) {
          setSelectedTheme(data.themes?.[0] || 'galaxy');
          setStep('camera');
        } else {
          setStep('theme-select');
        }
      })
      .catch(() => { setError('Could not load event'); setStep('error'); });
  }, [eventCode]);

  async function startCamera() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 960 } }
      });
      streamRef.current = stream;
      if (videoRef.current) videoRef.current.srcObject = stream;
    } catch {
      setError('Camera access required. Please allow camera in your browser settings.');
      setStep('error');
    }
  }

  useEffect(() => {
    if (step === 'camera') startCamera();
    return () => { if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop()); };
  }, [step]); // eslint-disable-line react-hooks/exhaustive-deps

  async function captureAndProcess() {
    const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    canvas.getContext('2d').drawImage(videoRef.current, 0, 0);
    const photoBase64 = canvas.toDataURL('image/jpeg', 0.85);

    if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
    setStep('processing');

    try {
      const res = await fetch(`/api/virtual-booth/${eventCode}/capture`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ photoBase64, themeId: selectedTheme }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setPhotoUrl(data.photoUrl);
      setStep('share');
    } catch (err) {
      setError(err.message || 'Processing failed. Try again.');
      setStep('camera');
      startCamera();
    }
  }

  // ── Render steps ──────────────────────────────────────────────────────────

  if (step === 'loading') return <Screen><Spinner /><p style={muted}>Loading…</p></Screen>;

  if (step === 'error') return (
    <Screen>
      <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>😕</div>
      <h2 style={title}>Oops</h2>
      <p style={muted}>{error}</p>
      <button style={primaryBtn} onClick={() => window.location.reload()}>Try Again</button>
    </Screen>
  );

  if (step === 'theme-select') return (
    <Screen>
      <Logo />
      <h2 style={title}>Choose Your Theme</h2>
      <p style={muted}>Pick a background for your photo</p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '.75rem', width: '100%', maxWidth: 360, margin: '1.5rem 0' }}>
        {event.themes.map(theme => (
          <button key={theme} onClick={() => { setSelectedTheme(theme); setStep('camera'); }}
            style={{ background: '#1a1a2e', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, padding: '1.25rem .75rem', color: '#f1f5f9', fontWeight: 600, fontSize: '.9rem', cursor: 'pointer', textTransform: 'capitalize' }}>
            {theme}
          </button>
        ))}
      </div>
    </Screen>
  );

  if (step === 'camera') return (
    <div style={{ position: 'fixed', inset: 0, background: '#000', display: 'flex', flexDirection: 'column' }}>
      <div style={{ padding: '.75rem 1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(0,0,0,0.5)' }}>
        <Logo small />
        <span style={{ color: '#94a3b8', fontSize: '.8rem' }}>{event?.eventName}</span>
      </div>
      <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
        <video ref={videoRef} autoPlay playsInline muted style={{ width: '100%', height: '100%', objectFit: 'cover', transform: 'scaleX(-1)' }} />
      </div>
      {error && <p style={{ color: '#f87171', textAlign: 'center', padding: '.5rem', fontSize: '.85rem' }}>{error}</p>}
      <div style={{ padding: '1.5rem', display: 'flex', justifyContent: 'center', background: 'rgba(0,0,0,0.7)' }}>
        <button onClick={captureAndProcess} style={{ width: 72, height: 72, borderRadius: '50%', background: '#fff', border: '4px solid rgba(255,255,255,0.3)', cursor: 'pointer', boxShadow: '0 0 0 4px rgba(255,255,255,0.15)' }} />
      </div>
    </div>
  );

  if (step === 'processing') return (
    <Screen>
      <div style={{ fontSize: '3rem', marginBottom: '1.5rem', animation: 'spin 1s linear infinite' }}>✨</div>
      <h2 style={title}>Creating your photo…</h2>
      <p style={muted}>AI magic in progress</p>
      <style>{`@keyframes spin { from { transform: rotate(0deg) } to { transform: rotate(360deg) } }`}</style>
    </Screen>
  );

  if (step === 'share') return (
    <div style={{ minHeight: '100dvh', background: '#0d0d1a', display: 'flex', flexDirection: 'column' }}>
      <div style={{ padding: '.75rem 1rem', borderBottom: '1px solid rgba(255,255,255,0.06)' }}><Logo small /></div>
      {photoUrl && <img src={photoUrl} alt="" style={{ width: '100%', maxHeight: '45vh', objectFit: 'contain', background: '#000' }} />}
      <div style={{ flex: 1 }}>
        <SharingMenu
          photoUrl={photoUrl}
          eventName={event?.eventName}
          eventId={eventCode}
          onDone={() => setStep('camera')}
        />
      </div>
    </div>
  );

  return null;
}

// ── Shared sub-components ─────────────────────────────────────────────────────

function Screen({ children }) {
  return <div style={{ minHeight: '100dvh', background: '#0d0d1a', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '2rem 1.5rem', textAlign: 'center', fontFamily: 'system-ui,sans-serif', color: '#f1f5f9' }}>{children}</div>;
}

function Logo({ small }) {
  return <div style={{ fontWeight: 900, fontSize: small ? '1rem' : '1.5rem', background: 'linear-gradient(135deg,#7c3aed,#a855f7)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', marginBottom: small ? 0 : '1.5rem' }}>⚡ Flash-it</div>;
}

function Spinner() {
  return <div style={{ width: 40, height: 40, border: '3px solid rgba(255,255,255,0.1)', borderTop: '3px solid #7c3aed', borderRadius: '50%', animation: 'spin 1s linear infinite', marginBottom: '1rem' }}>
    <style>{`@keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }`}</style>
  </div>;
}

const title = { fontSize: '1.5rem', fontWeight: 800, color: '#f1f5f9', marginBottom: '.5rem', letterSpacing: '-.02em' };
const muted = { color: '#94a3b8', fontSize: '.9rem', marginBottom: '1.5rem' };
const primaryBtn = { background: 'linear-gradient(135deg,#7c3aed,#a855f7)', color: '#fff', border: 'none', borderRadius: 12, padding: '.85rem 2rem', fontSize: '1rem', fontWeight: 700, cursor: 'pointer' };
