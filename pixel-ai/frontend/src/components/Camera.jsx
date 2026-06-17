import { useState, useRef, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { t } from '../utils/i18n.js';
import { useCamera } from '../hooks/useCamera.js';
import FilterStrip from './FilterStrip.jsx';
import Props from './Props.jsx';
import CaptureSelector from './CaptureSelector.jsx';
import { getFilter } from '../utils/filters.js';

const COUNTDOWN_SECONDS = 3;
const FLASH_DURATION_MS = 600;

/**
 * Camera — live camera screen with countdown, filters, and digital props.
 *
 * Props:
 *   lang         {string}    - 'en' | 'es'
 *   onCapture    {function}  - called with the captured Blob
 *   onBack       {function}  - back navigation
 *   captureMode  {string}    - 'photo' | 'gif' | 'video'
 *   onModeChange {function}  - called when mode changes
 *   photoCount   {number}    - number of photos in strip layout
 *   frameIndex   {number}    - current frame index (for strip mode display)
 */
export default function Camera({
  lang,
  onCapture,
  onBack,
  captureMode = 'photo',
  onModeChange,
  photoCount = 1,
  frameIndex = 0,
  faceGuide = false,
}) {
  const canvasRef = useRef(null);
  const propsCanvasRef = useRef(null);
  const countdownTimerRef = useRef(null);

  const [phase, setPhase] = useState('preview');
  // 'preview' | 'countdown' | 'flash' | 'done' | 'error'

  const [countdown, setCountdown] = useState(COUNTDOWN_SECONDS);
  const [showFlash, setShowFlash] = useState(false);

  // Filter & beauty state
  const [activeFilter, setActiveFilter] = useState('normal');
  const [beautyMode, setBeautyMode] = useState(false);

  // Props overlay state
  const [propsActive, setPropsActive] = useState(false);

  const { videoRef, isReady, error: cameraError } = useCamera({
    facingMode: 'user',
    width: 1920,
    height: 1080,
  });

  // Clear countdown timer on unmount
  useEffect(() => () => { if (countdownTimerRef.current) clearInterval(countdownTimerRef.current); }, []);

  // ── Capture photo from video stream ──────────────────────────────────────
  const captureSnapshot = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return null;

    canvas.width = video.videoWidth || 1920;
    canvas.height = video.videoHeight || 1080;

    const ctx = canvas.getContext('2d');

    // Build CSS filter string (filter + optional beauty layer)
    const filterDef = getFilter(activeFilter);
    let cssFilter = filterDef.css || '';
    if (beautyMode) {
      cssFilter = (cssFilter + ' brightness(1.08) contrast(0.9)').trim();
    }

    ctx.save();
    // Mirror front-camera image for actual capture (CSS mirrors the preview)
    ctx.translate(canvas.width, 0);
    ctx.scale(-1, 1);

    if (cssFilter) ctx.filter = cssFilter;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    ctx.filter = 'none';
    ctx.restore();

    return new Promise((resolve) => {
      canvas.toBlob((blob) => resolve(blob), 'image/jpeg', 0.92);
    });
  }, [videoRef, activeFilter, beautyMode]);

  // ── Start the countdown ───────────────────────────────────────────────────
  const startCountdown = useCallback(() => {
    if (phase !== 'preview' || !isReady) return;

    setPhase('countdown');
    setCountdown(COUNTDOWN_SECONDS);

    let current = COUNTDOWN_SECONDS;

    countdownTimerRef.current = setInterval(() => {
      current -= 1;

      if (current <= 0) {
        clearInterval(countdownTimerRef.current);
        setPhase('flash');
        setShowFlash(true);

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
  }, [phase, isReady, captureSnapshot, onCapture]);

  // ── Reset to preview state ─────────────────────────────────────────────────
  const handleReset = useCallback(() => {
    if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
    setPhase('preview');
    setCountdown(COUNTDOWN_SECONDS);
    setShowFlash(false);
  }, []);

  // Strip progress label
  const stripLabel = photoCount > 1
    ? (lang === 'es' ? `Foto ${frameIndex + 1} de ${photoCount}` : `Photo ${frameIndex + 1} of ${photoCount}`)
    : null;

  // Live filter string for video preview
  const liveFilter = [
    getFilter(activeFilter).css || '',
    beautyMode ? 'brightness(1.08) contrast(0.9)' : '',
  ].filter(Boolean).join(' ') || undefined;

  // ── Render ────────────────────────────────────────────────────────────────
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
      {/* Hidden canvas for capture */}
      <canvas ref={canvasRef} style={{ display: 'none' }} />

      {/* Camera error state */}
      {cameraError && (
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
          <p style={{ color: 'var(--text-muted)', fontSize: '1rem' }}>{cameraError}</p>
          <button className="btn btn-ghost" onPointerDown={onBack}>
            ← {lang === 'es' ? 'Volver' : 'Go back'}
          </button>
        </motion.div>
      )}

      {/* Video preview */}
      {!cameraError && (
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
              transform: 'scaleX(-1)',
              filter: liveFilter,
            }}
          />

          {/* Strip frame counter — large overlay when in multi-photo mode */}
          {photoCount > 1 && phase === 'preview' && (
            <div style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              zIndex: 25,
              pointerEvents: 'none',
              textAlign: 'center',
            }}>
              <div style={{
                background: 'rgba(0,0,0,0.6)',
                backdropFilter: 'blur(12px)',
                borderRadius: 20,
                padding: '1rem 2.5rem',
                border: '2px solid rgba(255,255,255,0.15)',
              }}>
                <div style={{ fontSize: '1rem', color: '#69b3e7', fontWeight: 700, letterSpacing: '.1em', textTransform: 'uppercase', fontFamily: 'system-ui', marginBottom: '.25rem' }}>
                  {lang === 'es' ? 'Foto' : 'Photo'}
                </div>
                <div style={{ fontSize: '4rem', fontWeight: 900, color: '#fff', lineHeight: 1, fontFamily: 'system-ui' }}>
                  {frameIndex + 1}
                </div>
                <div style={{ fontSize: '1rem', color: '#94a3b8', fontWeight: 600, fontFamily: 'system-ui' }}>
                  {lang === 'es' ? `de ${photoCount}` : `of ${photoCount}`}
                </div>
              </div>
            </div>
          )}

          {/* Props overlay canvas */}
          <canvas
            ref={propsCanvasRef}
            style={{
              position: 'absolute',
              inset: 0,
              width: '100%',
              height: '100%',
              pointerEvents: 'none',
              zIndex: 15,
            }}
          />

          {/* Grid overlay — hidden in face-guide (character) mode */}
          {!faceGuide && (
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
          )}

          {/* Face-alignment oval guide — Character mode only */}
          {faceGuide && phase !== 'flash' && (
            <div style={{ position: 'absolute', inset: 0, zIndex: 16, pointerEvents: 'none', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
              <div
                style={{
                  width: 'min(58vw, 42vh)',
                  height: 'min(76vw, 56vh)',
                  borderRadius: '50%',
                  border: '4px dashed rgba(255,255,255,0.85)',
                  boxShadow: '0 0 0 9999px rgba(0,0,0,0.35)',
                }}
              />
              <div style={{ marginTop: 18, background: 'rgba(0,0,0,0.55)', borderRadius: 16, padding: '8px 20px', color: '#fff', fontSize: '1rem', fontWeight: 600, backdropFilter: 'blur(8px)' }}>
                {t('face.guide', lang)}
              </div>
            </div>
          )}

          {/* Top bar: Back + status + mode selector */}
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              zIndex: 20,
              background: 'linear-gradient(rgba(0,0,0,0.65), transparent)',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '20px 32px 8px',
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
                  color: 'rgba(255,255,255,0.85)',
                  fontSize: '1rem',
                  fontWeight: 600,
                  background: 'rgba(0,0,0,0.4)',
                  padding: '8px 20px',
                  borderRadius: 20,
                  fontFamily: 'system-ui, sans-serif',
                }}
              >
                {stripLabel
                  ? stripLabel
                  : !isReady
                  ? (lang === 'es' ? 'Iniciando cámara...' : 'Starting camera...')
                  : phase === 'preview'
                  ? t('camera.ready', lang)
                  : phase === 'countdown'
                  ? t('camera.countdown', lang)
                  : t('camera.smile', lang)}
              </div>

              {/* Props toggle */}
              <button
                onPointerDown={() => setPropsActive((v) => !v)}
                style={{
                  minHeight: 52,
                  padding: '0 16px',
                  fontSize: '1.5rem',
                  background: propsActive ? 'rgba(74,143,196,0.45)' : 'rgba(0,0,0,0.5)',
                  border: propsActive ? '1px solid #4a8fc4' : '1px solid rgba(255,255,255,0.2)',
                  borderRadius: 12,
                  cursor: 'pointer',
                  WebkitTapHighlightColor: 'transparent',
                  outline: 'none',
                  transition: 'all .15s',
                  boxShadow: propsActive ? '0 0 12px rgba(74,143,196,0.5)' : 'none',
                }}
              >
                🎭
              </button>
            </div>

            {/* Mode selector row */}
            {onModeChange && (
              <CaptureSelector
                mode={captureMode}
                onChange={onModeChange}
                photoCount={photoCount}
              />
            )}
          </div>

          {/* Digital props overlay (renders the prop selector UI) */}
          <Props
            videoRef={videoRef}
            canvasRef={propsCanvasRef}
            active={propsActive}
            onToggle={() => setPropsActive((v) => !v)}
          />

          {/* Countdown number overlay */}
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
                    textShadow: '0 0 80px rgba(74,143,196,0.8), 0 0 20px rgba(0,0,0,0.8)',
                    filter: 'drop-shadow(0 4px 24px rgba(0,0,0,0.7))',
                  }}
                >
                  {countdown}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Camera flash overlay */}
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

          {/* Filter strip — sits above shutter controls */}
          <FilterStrip
            videoRef={videoRef}
            activeFilter={activeFilter}
            onFilterChange={setActiveFilter}
            beautyMode={beautyMode}
            onBeautyToggle={() => setBeautyMode((v) => !v)}
          />

          {/* Bottom controls */}
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
            {phase === 'preview' && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                style={{ display: 'flex', gap: 24, alignItems: 'center' }}
              >
                <motion.button
                  whileTap={{ scale: 0.92 }}
                  onPointerDown={startCountdown}
                  disabled={!isReady}
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
                    opacity: isReady ? 1 : 0.4,
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
