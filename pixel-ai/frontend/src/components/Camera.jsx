import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { t } from '../utils/i18n.js';

const COUNTDOWN_SECONDS = 3;
const FLASH_DURATION_MS = 600;

// ─── Camera constraints (front-facing, full HD) ───────────────────────────────
const VIDEO_CONSTRAINTS = {
  facingMode: 'user',
  width: { ideal: 1920 },
  height: { ideal: 1080 },
};

export default function Camera({ lang, onCapture, onBack }) {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const canvasRef = useRef(null);
  const countdownTimerRef = useRef(null);

  const [phase, setPhase] = useState('preview');
  // 'preview' | 'countdown' | 'flash' | 'done' | 'error'

  const [countdown, setCountdown] = useState(COUNTDOWN_SECONDS);
  const [showFlash, setShowFlash] = useState(false);
  const [cameraError, setCameraError] = useState(null);
  const [cameraReady, setCameraReady] = useState(false);

  // ─── Start camera stream ─────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;

    async function startCamera() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: VIDEO_CONSTRAINTS,
          audio: false,
        });

        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }

        streamRef.current = stream;

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().catch(console.error);
        }

        setCameraReady(true);
      } catch (err) {
        if (!cancelled) {
          console.error('[Camera] getUserMedia error:', err);
          setCameraError(err.message || 'Camera unavailable');
          setPhase('error');
        }
      }
    }

    startCamera();

    return () => {
      cancelled = true;
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }
      if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
    };
  }, []);

  // ─── Capture photo from video stream ─────────────────────────────────────
  const captureSnapshot = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return null;

    canvas.width = video.videoWidth || 1920;
    canvas.height = video.videoHeight || 1080;

    const ctx = canvas.getContext('2d');
    // Mirror the image (front camera is already mirrored in CSS, undo for actual capture)
    ctx.save();
    ctx.translate(canvas.width, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    ctx.restore();

    return new Promise((resolve) => {
      canvas.toBlob((blob) => resolve(blob), 'image/jpeg', 0.92);
    });
  }, []);

  // ─── Start the countdown ─────────────────────────────────────────────────
  const startCountdown = useCallback(() => {
    if (phase !== 'preview' || !cameraReady) return;

    setPhase('countdown');
    setCountdown(COUNTDOWN_SECONDS);

    let current = COUNTDOWN_SECONDS;

    countdownTimerRef.current = setInterval(() => {
      current -= 1;

      if (current <= 0) {
        clearInterval(countdownTimerRef.current);
        setPhase('flash');
        setShowFlash(true);

        // Capture during the flash
        captureSnapshot().then((blob) => {
          setTimeout(() => {
            setShowFlash(false);
            setPhase('done');
            if (blob) onCapture(blob);
          }, FLASH_DURATION_MS);
        });
      } else {
        setCountdown(current);
      }
    }, 1000);
  }, [phase, cameraReady, captureSnapshot, onCapture]);

  // ─── Reset to preview state ──────────────────────────────────────────────
  const handleReset = useCallback(() => {
    if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
    setPhase('preview');
    setCountdown(COUNTDOWN_SECONDS);
    setShowFlash(false);
  }, []);

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: '#000',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
      }}
    >
      {/* ── Hidden canvas for capture ── */}
      <canvas ref={canvasRef} style={{ display: 'none' }} />

      {/* ── Camera error state ── */}
      {phase === 'error' && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 24,
            padding: 48,
            textAlign: 'center',
            background: 'var(--bg)',
            borderRadius: 24,
            maxWidth: 500,
          }}
        >
          <div style={{ fontSize: '4rem' }}>📷</div>
          <p style={{ color: 'var(--danger)', fontSize: '1.2rem', fontWeight: 600 }}>
            {t('errors.camera', lang)}
          </p>
          <p style={{ color: 'var(--text-muted)', fontSize: '1rem' }}>
            {cameraError}
          </p>
          <button className="btn btn-ghost" onPointerDown={onBack}>
            ← {lang === 'es' ? 'Volver' : 'Go back'}
          </button>
        </motion.div>
      )}

      {/* ── Video preview ── */}
      {phase !== 'error' && (
        <>
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            style={{
              position: 'absolute',
              inset: 0,
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              // Mirror front camera for natural selfie feel
              transform: 'scaleX(-1)',
            }}
          />

          {/* ── Camera grid overlay (rule-of-thirds) ── */}
          <div
            style={{
              position: 'absolute',
              inset: 0,
              backgroundImage:
                'linear-gradient(rgba(255,255,255,0.07) 1px, transparent 1px), ' +
                'linear-gradient(90deg, rgba(255,255,255,0.07) 1px, transparent 1px)',
              backgroundSize: '33.33% 33.33%',
              pointerEvents: 'none',
            }}
          />

          {/* ── Top bar: Back + status ── */}
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '20px 32px',
              background: 'linear-gradient(rgba(0,0,0,0.6), transparent)',
              zIndex: 20,
            }}
          >
            <button
              className="btn btn-ghost"
              onPointerDown={onBack}
              style={{
                minHeight: 52,
                padding: '0 20px',
                fontSize: '1rem',
                background: 'rgba(0,0,0,0.5)',
                border: '1px solid rgba(255,255,255,0.2)',
              }}
              disabled={phase === 'countdown' || phase === 'flash'}
            >
              ← {lang === 'es' ? 'Atrás' : 'Back'}
            </button>

            <div
              style={{
                color: 'rgba(255,255,255,0.8)',
                fontSize: '1.1rem',
                fontWeight: 600,
                letterSpacing: '0.05em',
                background: 'rgba(0,0,0,0.4)',
                padding: '8px 20px',
                borderRadius: 20,
              }}
            >
              {!cameraReady
                ? (lang === 'es' ? 'Iniciando cámara...' : 'Starting camera...')
                : phase === 'preview'
                ? t('camera.ready', lang)
                : phase === 'countdown'
                ? t('camera.countdown', lang)
                : t('camera.smile', lang)}
            </div>

            {/* Spacer */}
            <div style={{ width: 100 }} />
          </div>

          {/* ── Countdown number overlay ── */}
          <AnimatePresence mode="wait">
            {phase === 'countdown' && (
              <motion.div
                key={countdown}
                initial={{ scale: 1.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.6, opacity: 0 }}
                transition={{ duration: 0.45, ease: 'easeOut' }}
                style={{
                  position: 'absolute',
                  zIndex: 30,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <div
                  style={{
                    fontSize: '18rem',
                    fontWeight: 900,
                    color: '#fff',
                    lineHeight: 1,
                    textShadow: '0 0 80px rgba(124,58,237,0.8), 0 0 20px rgba(0,0,0,0.8)',
                    filter: 'drop-shadow(0 4px 24px rgba(0,0,0,0.7))',
                  }}
                >
                  {countdown}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* ── Camera flash overlay ── */}
          <AnimatePresence>
            {showFlash && (
              <motion.div
                key="flash"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
                style={{
                  position: 'absolute',
                  inset: 0,
                  background: '#fff',
                  zIndex: 50,
                  pointerEvents: 'none',
                }}
              />
            )}
          </AnimatePresence>

          {/* ── Bottom controls ── */}
          <div
            style={{
              position: 'absolute',
              bottom: 0,
              left: 0,
              right: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '32px 48px',
              gap: 32,
              background: 'linear-gradient(transparent, rgba(0,0,0,0.7))',
              zIndex: 20,
            }}
          >
            {/* Retake / Reset (visible in preview mode) */}
            {phase === 'preview' && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                style={{ display: 'flex', gap: 24, alignItems: 'center' }}
              >
                {/* Shutter button */}
                <motion.button
                  whileTap={{ scale: 0.92 }}
                  onPointerDown={startCountdown}
                  disabled={!cameraReady}
                  style={{
                    width: 100,
                    height: 100,
                    borderRadius: '50%',
                    border: '5px solid #fff',
                    background: 'rgba(255,255,255,0.9)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 0 0 8px rgba(255,255,255,0.2), 0 4px 20px rgba(0,0,0,0.5)',
                    touchAction: 'manipulation',
                    WebkitTapHighlightColor: 'transparent',
                    outline: 'none',
                    transition: 'opacity 0.2s',
                    opacity: cameraReady ? 1 : 0.4,
                  }}
                >
                  <div
                    style={{
                      width: 72,
                      height: 72,
                      borderRadius: '50%',
                      background: 'var(--accent)',
                    }}
                  />
                </motion.button>
              </motion.div>
            )}

            {/* Countdown in progress — show cancel */}
            {phase === 'countdown' && (
              <motion.button
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="btn btn-ghost"
                onPointerDown={handleReset}
                style={{
                  background: 'rgba(0,0,0,0.5)',
                  border: '1px solid rgba(255,255,255,0.3)',
                  color: '#fff',
                  fontSize: '1.1rem',
                  minHeight: 60,
                }}
              >
                {lang === 'es' ? 'Cancelar' : 'Cancel'}
              </motion.button>
            )}
          </div>
        </>
      )}
    </div>
  );
}
