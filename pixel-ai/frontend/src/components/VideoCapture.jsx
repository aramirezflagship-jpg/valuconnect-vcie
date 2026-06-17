import { useState, useRef, useEffect, useCallback } from 'react';
import { useCamera } from '../hooks/useCamera.js';

const MAX_DURATION_MS = 15000;

/**
 * VideoCapture — records a short video clip, previews it, and uploads it.
 *
 * Props:
 *   eventId       {string}    - event identifier
 *   eventName     {string}    - display name for the event
 *   onVideoReady  {function}  - called with { videoUrl, duration } on success
 *   onCancel      {function}  - called when guest taps Cancel
 */
export default function VideoCapture({ eventId, eventName, onVideoReady, onCancel }) {
  const [phase, setPhase] = useState('preview'); // preview | recording | review | uploading | error
  const [elapsed, setElapsed] = useState(0);
  const [videoBlob, setVideoBlob] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');

  const recorderRef = useRef(null);
  const chunksRef = useRef([]);
  const timerRef = useRef(null);
  const reviewVideoRef = useRef(null);
  const elapsedRef = useRef(0);

  const { videoRef, streamRef, isReady, error: cameraError } = useCamera({
    facingMode: 'user',
    width: 1280,
    height: 960,
  });

  // Cleanup blob URL on unmount
  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      clearInterval(timerRef.current);
    };
  }, [previewUrl]);

  // ── Start recording ────────────────────────────────────────────────────────
  const startRecording = useCallback(() => {
    const stream = streamRef.current;
    if (!stream) return;

    const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9')
      ? 'video/webm;codecs=vp9'
      : MediaRecorder.isTypeSupported('video/mp4')
      ? 'video/mp4'
      : 'video/webm';

    chunksRef.current = [];
    let recorder;
    try {
      recorder = new MediaRecorder(stream, { mimeType, videoBitsPerSecond: 2_500_000 });
    } catch {
      recorder = new MediaRecorder(stream);
    }
    recorderRef.current = recorder;

    recorder.ondataavailable = (e) => {
      if (e.data && e.data.size > 0) chunksRef.current.push(e.data);
    };

    recorder.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: mimeType });
      const url = URL.createObjectURL(blob);
      setVideoBlob(blob);
      setPreviewUrl(url);
      setPhase('review');
    };

    recorder.start(250); // collect in 250ms chunks
    setPhase('recording');
    setElapsed(0);
    elapsedRef.current = 0;

    timerRef.current = setInterval(() => {
      elapsedRef.current += 100;
      setElapsed(elapsedRef.current);
      if (elapsedRef.current >= MAX_DURATION_MS) {
        stopRecording();
      }
    }, 100);
  }, [streamRef]);

  const stopRecording = useCallback(() => {
    clearInterval(timerRef.current);
    if (recorderRef.current && recorderRef.current.state !== 'inactive') {
      recorderRef.current.stop();
    }
  }, []);

  // ── Upload ─────────────────────────────────────────────────────────────────
  const handleUseThis = useCallback(async () => {
    if (!videoBlob) return;

    setPhase('uploading');
    const duration = Math.round(elapsedRef.current / 1000);
    const token = localStorage.getItem('flash_it_token') || '';

    const formData = new FormData();
    formData.append('video', videoBlob, `flash-it-${Date.now()}.webm`);
    formData.append('eventId', eventId);
    formData.append('duration', String(duration));

    try {
      const res = await fetch('/api/videos/upload', {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Upload failed');
      onVideoReady({ videoUrl: data.videoUrl, duration });
    } catch (err) {
      setErrorMsg(err.message || 'Upload failed. Try again.');
      setPhase('error');
    }
  }, [videoBlob, eventId, onVideoReady]);

  const handleReRecord = useCallback(() => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    setVideoBlob(null);
    setElapsed(0);
    elapsedRef.current = 0;
    setPhase('preview');
  }, [previewUrl]);

  // ── Format timer ──────────────────────────────────────────────────────────
  const formatTime = (ms) => {
    const s = Math.floor(ms / 1000);
    return `0:${String(s).padStart(2, '0')}`;
  };

  const progressPct = Math.min((elapsed / MAX_DURATION_MS) * 100, 100);

  // ── Render: uploading ──────────────────────────────────────────────────────
  if (phase === 'uploading') {
    return (
      <div style={styles.root}>
        <div style={styles.spinner} />
        <p style={styles.label}>Uploading your video…</p>
      </div>
    );
  }

  // ── Render: error ──────────────────────────────────────────────────────────
  if (phase === 'error') {
    return (
      <div style={styles.root}>
        <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>⚠️</div>
        <p style={{ color: '#f87171', marginBottom: '1.5rem' }}>{errorMsg}</p>
        <button style={styles.primaryBtn} onPointerDown={handleReRecord}>Try Again</button>
        <button style={styles.ghostBtn} onPointerDown={onCancel}>Cancel</button>
      </div>
    );
  }

  // ── Render: review ─────────────────────────────────────────────────────────
  if (phase === 'review') {
    return (
      <div style={{ ...styles.root, background: '#000', justifyContent: 'center' }}>
        <video
          ref={reviewVideoRef}
          src={previewUrl}
          controls
          loop
          autoPlay
          playsInline
          style={{ maxWidth: '100%', maxHeight: '70vh', borderRadius: 12, marginBottom: '2rem' }}
        />
        <div style={{ display: 'flex', gap: 16 }}>
          <button style={styles.primaryBtn} onPointerDown={handleUseThis}>
            Use This ✓
          </button>
          <button style={styles.dangerBtn} onPointerDown={handleReRecord}>
            Re-record ↺
          </button>
        </div>
        <button style={{ ...styles.ghostBtn, marginTop: '1rem' }} onPointerDown={onCancel}>
          Cancel
        </button>
      </div>
    );
  }

  // ── Render: camera error ───────────────────────────────────────────────────
  if (cameraError) {
    return (
      <div style={styles.root}>
        <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📷</div>
        <p style={{ color: '#f87171', marginBottom: '1.5rem' }}>{cameraError}</p>
        <button style={styles.ghostBtn} onPointerDown={onCancel}>← Back</button>
      </div>
    );
  }

  // ── Render: preview / recording ────────────────────────────────────────────
  return (
    <div style={{ position: 'fixed', inset: 0, background: '#000', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '20px 24px',
        background: 'linear-gradient(rgba(0,0,0,0.65), transparent)',
        zIndex: 20,
      }}>
        <button style={styles.ghostBtn} onPointerDown={onCancel} disabled={phase === 'recording'}>
          ← Cancel
        </button>

        <div style={{
          background: 'rgba(0,0,0,0.5)', color: '#f1f5f9',
          borderRadius: 20, padding: '6px 16px', fontSize: '.85rem', fontWeight: 600,
          fontFamily: 'system-ui, sans-serif',
        }}>
          {phase === 'preview' ? '0:15 max' : (
            <span style={{ color: phase === 'recording' ? '#f87171' : '#f1f5f9' }}>
              {phase === 'recording' && (
                <span style={{
                  display: 'inline-block', width: 8, height: 8,
                  borderRadius: '50%', background: '#f87171',
                  marginRight: 6, verticalAlign: 'middle',
                  animation: 'pulse 1s ease-in-out infinite',
                }} />
              )}
              {formatTime(elapsed)}
            </span>
          )}
        </div>

        <div style={{ width: 80 }} />
      </div>

      {/* Video preview */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        style={{
          position: 'absolute', inset: 0,
          width: '100%', height: '100%',
          objectFit: 'cover',
          transform: 'scaleX(-1)',
        }}
      />

      {/* Progress bar (recording only) */}
      {phase === 'recording' && (
        <div style={{
          position: 'absolute', bottom: 140, left: 24, right: 24,
          height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.2)', zIndex: 25,
        }}>
          <div style={{
            height: '100%', borderRadius: 2,
            background: '#f87171',
            width: `${progressPct}%`,
            transition: 'width .1s linear',
          }} />
        </div>
      )}

      {/* Bottom controls */}
      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '32px 48px',
        background: 'linear-gradient(transparent, rgba(0,0,0,0.7))',
        zIndex: 20,
      }}>
        {phase === 'preview' && (
          <button
            onPointerDown={startRecording}
            disabled={!isReady}
            style={{
              width: 100, height: 100,
              borderRadius: '50%',
              border: '5px solid #f87171',
              background: isReady ? '#f87171' : 'rgba(248,113,113,0.4)',
              cursor: isReady ? 'pointer' : 'not-allowed',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 0 0 8px rgba(248,113,113,0.2), 0 4px 20px rgba(0,0,0,0.5)',
              transition: 'opacity .2s',
              opacity: isReady ? 1 : 0.5,
              WebkitTapHighlightColor: 'transparent', outline: 'none',
            }}
          >
            <div style={{
              width: 36, height: 36, borderRadius: 4, background: '#fff',
            }} />
          </button>
        )}

        {phase === 'recording' && (
          <button
            onPointerDown={stopRecording}
            style={{
              width: 100, height: 100,
              borderRadius: '50%',
              border: '5px solid #fff',
              background: 'rgba(248,113,113,0.85)',
              cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 0 0 8px rgba(248,113,113,0.25), 0 4px 20px rgba(0,0,0,0.5)',
              WebkitTapHighlightColor: 'transparent', outline: 'none',
            }}
          >
            <div style={{
              width: 30, height: 30, borderRadius: 4, background: '#fff',
            }} />
          </button>
        )}
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.2; }
        }
      `}</style>
    </div>
  );
}

const styles = {
  root: {
    position: 'fixed', inset: 0,
    background: '#0d0d1a',
    display: 'flex', flexDirection: 'column',
    alignItems: 'center', justifyContent: 'center',
    padding: '2rem', textAlign: 'center',
    fontFamily: 'system-ui, sans-serif',
  },
  label: { color: '#94a3b8', fontSize: '1rem', marginTop: '1.5rem' },
  spinner: {
    width: 56, height: 56,
    borderRadius: '50%',
    border: '4px solid #7c3aed',
    borderTopColor: 'transparent',
    animation: 'spin 0.8s linear infinite',
  },
  primaryBtn: {
    background: 'linear-gradient(135deg,#7c3aed,#a855f7)',
    color: '#fff', border: 'none', borderRadius: 14,
    padding: '.9rem 2.5rem', fontSize: '1.05rem', fontWeight: 700,
    cursor: 'pointer', minWidth: 160, minHeight: 52,
    WebkitTapHighlightColor: 'transparent', outline: 'none',
  },
  dangerBtn: {
    background: 'rgba(239,68,68,0.12)',
    color: '#f87171', border: '1px solid rgba(239,68,68,0.3)',
    borderRadius: 14, padding: '.9rem 2rem', fontSize: '1.05rem', fontWeight: 600,
    cursor: 'pointer', minWidth: 140, minHeight: 52,
    WebkitTapHighlightColor: 'transparent', outline: 'none',
  },
  ghostBtn: {
    background: 'transparent', color: '#94a3b8', border: 'none',
    fontSize: '.9rem', fontWeight: 600, cursor: 'pointer', padding: '.5rem 1rem',
    minHeight: 44, WebkitTapHighlightColor: 'transparent', outline: 'none',
  },
};
