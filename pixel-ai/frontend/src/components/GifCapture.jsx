import { useState } from 'react';
import { useCamera } from '../hooks/useCamera.js';

const FRAME_COUNT = 3;
const COUNTDOWN_SECS = 3;

export default function GifCapture({ eventId, onGifReady, onCancel }) {
  const [phase, setPhase] = useState('preview'); // preview | countdown | capturing | processing | done
  const [countdown, setCountdown] = useState(COUNTDOWN_SECS);
  const [currentFrame, setCurrentFrame] = useState(1);
  const [capturedFrames, setCapturedFrames] = useState([]); // base64 data URLs
  const [error, setError] = useState('');

  // Shared camera hook — handles start/stop automatically
  const { videoRef, error: cameraError } = useCamera({ facingMode: 'user', width: 1280, height: 960 });

  function captureFrame() {
    const canvas = document.createElement('canvas');
    const video = videoRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext('2d').drawImage(video, 0, 0);
    return canvas.toDataURL('image/jpeg', 0.85);
  }

  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  async function startCapture() {
    setPhase('countdown');
    const frames = [];
    for (let i = 0; i < FRAME_COUNT; i++) {
      setCurrentFrame(i + 1);
      // countdown
      for (let c = COUNTDOWN_SECS; c > 0; c--) {
        setCountdown(c);
        await sleep(1000);
      }
      setPhase('capturing');
      const frame = captureFrame();
      frames.push(frame);
      setCapturedFrames([...frames]);
      await sleep(400);
      setPhase('countdown');
    }
    // All frames captured — stitch GIF
    setPhase('processing');
    try {
      const res = await fetch('/api/gif/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ frames, eventId, boomerang: true, delay: 400 }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setPhase('done');
      onGifReady(data.gifUrl);
    } catch (err) {
      setError(err.message || 'GIF creation failed');
      setPhase('preview');
    }
  }

  if (phase === 'processing') {
    return (
      <div style={centerStyle}>
        <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>✨</div>
        <h2 style={titleStyle}>Creating your GIF…</h2>
        <p style={{ color: '#94a3b8' }}>Stitching {FRAME_COUNT} frames into magic</p>
      </div>
    );
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: '#0d0d1a', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <div style={{ padding: '1rem 1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ background: 'linear-gradient(135deg,#7c3aed,#a855f7)', color: '#fff', borderRadius: 8, padding: '.3rem .8rem', fontSize: '.8rem', fontWeight: 800 }}>
          GIF MODE
        </span>
        <span style={{ color: '#64748b', fontSize: '.85rem' }}>
          {phase === 'preview' ? `${FRAME_COUNT} photos → 1 GIF` : `Photo ${currentFrame} of ${FRAME_COUNT}`}
        </span>
        <button onClick={onCancel} style={{ background: 'none', border: 'none', color: '#64748b', fontSize: '.85rem', cursor: 'pointer', minHeight: 44, padding: '0 8px' }}>
          Cancel
        </button>
      </div>

      {/* Camera */}
      <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
        {cameraError ? (
          <div style={{ ...centerStyle, position: 'absolute', inset: 0 }}>
            <p style={{ color: '#f87171' }}>{cameraError}</p>
          </div>
        ) : (
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            style={{ width: '100%', height: '100%', objectFit: 'cover', transform: 'scaleX(-1)' }}
          />
        )}

        {/* Frame strip */}
        <div style={{ position: 'absolute', top: '1rem', left: '50%', transform: 'translateX(-50%)', display: 'flex', gap: '.5rem' }}>
          {Array.from({ length: FRAME_COUNT }, (_, i) => (
            <div
              key={i}
              style={{
                width: 48, height: 48, borderRadius: 8, overflow: 'hidden',
                border: `2px solid ${i < capturedFrames.length ? '#a855f7' : 'rgba(255,255,255,0.2)'}`,
              }}
            >
              {capturedFrames[i] && (
                <img src={capturedFrames[i]} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              )}
            </div>
          ))}
        </div>

        {/* Countdown overlay */}
        {phase === 'countdown' && countdown > 0 && (
          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.3)' }}>
            <div style={{ fontSize: '8rem', fontWeight: 900, color: '#fff', textShadow: '0 0 40px rgba(168,85,247,0.8)', lineHeight: 1 }}>
              {countdown}
            </div>
          </div>
        )}

        {/* Flash on capture */}
        {phase === 'capturing' && (
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(255,255,255,0.9)' }} />
        )}
      </div>

      {/* Start button */}
      {phase === 'preview' && (
        <div style={{ padding: '1.5rem', textAlign: 'center' }}>
          {(error || cameraError) && <p style={{ color: '#f87171', marginBottom: '1rem' }}>{error || cameraError}</p>}
          <button
            onClick={startCapture}
            style={{
              background: 'linear-gradient(135deg,#7c3aed,#a855f7)', color: '#fff', border: 'none',
              borderRadius: 16, padding: '1rem 3rem', fontSize: '1.1rem', fontWeight: 800,
              cursor: 'pointer', boxShadow: '0 0 24px rgba(124,58,237,0.4)',
              minHeight: 56,
            }}
          >
            Start GIF ✨
          </button>
        </div>
      )}
    </div>
  );
}

const centerStyle = {
  position: 'fixed', inset: 0, display: 'flex', flexDirection: 'column',
  alignItems: 'center', justifyContent: 'center', background: '#0d0d1a',
  textAlign: 'center', padding: '2rem',
};
const titleStyle = { fontSize: '1.75rem', fontWeight: 800, color: '#f1f5f9', marginBottom: '.5rem' };
