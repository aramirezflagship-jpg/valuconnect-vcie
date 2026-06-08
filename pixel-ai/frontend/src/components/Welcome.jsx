import { useCallback, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { t } from '../utils/i18n.js';

// ─── Generate random star particles (pure CSS via inline styles) ──────────────
function generateStars(count = 80) {
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    top: `${Math.random() * 100}%`,
    left: `${Math.random() * 100}%`,
    size: `${Math.random() * 3 + 1}px`,
    delay: `${Math.random() * 8}s`,
    duration: `${Math.random() * 4 + 3}s`,
    opacity: Math.random() * 0.6 + 0.2,
  }));
}

// ─── Generate floating orbs (large glowing background circles) ───────────────
function generateOrbs() {
  return [
    { id: 'a', top: '10%',  left: '5%',  size: 320, color: 'rgba(124,58,237,0.12)', delay: '0s',   dur: '12s' },
    { id: 'b', top: '60%',  left: '75%', size: 400, color: 'rgba(168,85,247,0.08)', delay: '-4s',  dur: '16s' },
    { id: 'c', top: '30%',  left: '50%', size: 250, color: 'rgba(99,102,241,0.1)',  delay: '-8s',  dur: '20s' },
    { id: 'd', top: '80%',  left: '20%', size: 300, color: 'rgba(124,58,237,0.07)', delay: '-2s',  dur: '14s' },
  ];
}

const STARS = generateStars(90);
const ORBS = generateOrbs();

export default function Welcome({ config, lang, onStart }) {
  const canvasRef = useRef(null);

  // Use config colors if provided
  const accentColor = config?.primaryColor || '#7c3aed';

  // Prevent double-tap zoom on the button area
  const handleStart = useCallback((e) => {
    e.preventDefault();
    onStart();
  }, [onStart]);

  return (
    <div className="screen" style={{ background: 'var(--bg)', position: 'relative', overflow: 'hidden' }}>

      {/* ── Background orbs (slow pulsing glow) ── */}
      {ORBS.map((orb) => (
        <div
          key={orb.id}
          style={{
            position: 'absolute',
            top: orb.top,
            left: orb.left,
            width: orb.size,
            height: orb.size,
            borderRadius: '50%',
            background: `radial-gradient(circle, ${orb.color} 0%, transparent 70%)`,
            animation: `pulse-scale ${orb.dur} ease-in-out infinite`,
            animationDelay: orb.delay,
            pointerEvents: 'none',
            transform: 'translate(-50%, -50%)',
          }}
        />
      ))}

      {/* ── Star field ── */}
      {STARS.map((star) => (
        <div
          key={star.id}
          style={{
            position: 'absolute',
            top: star.top,
            left: star.left,
            width: star.size,
            height: star.size,
            borderRadius: '50%',
            background: '#fff',
            opacity: star.opacity,
            animation: `twinkle ${star.duration} ease-in-out infinite`,
            animationDelay: star.delay,
            pointerEvents: 'none',
          }}
        />
      ))}

      {/* ── Floating particles (6 slow-rising dots) ── */}
      {Array.from({ length: 6 }, (_, i) => (
        <div
          key={`particle-${i}`}
          style={{
            position: 'absolute',
            bottom: '-10px',
            left: `${10 + i * 15}%`,
            width: `${4 + i * 2}px`,
            height: `${4 + i * 2}px`,
            borderRadius: '50%',
            background: accentColor,
            opacity: 0,
            animation: `float-up ${8 + i * 2}s ease-in infinite`,
            animationDelay: `${i * 2.5}s`,
            pointerEvents: 'none',
          }}
        />
      ))}

      {/* ── Content ── */}
      <div
        style={{
          position: 'relative',
          zIndex: 10,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '40px',
          padding: '40px',
          textAlign: 'center',
          maxWidth: 900,
        }}
      >
        {/* Logo / Title */}
        <motion.div
          initial={{ opacity: 0, y: -30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: 'easeOut' }}
        >
          {config?.logoUrl ? (
            <img
              src={config.logoUrl}
              alt={config.name || 'Pixel AI'}
              style={{ maxHeight: 160, maxWidth: 500, objectFit: 'contain' }}
              draggable={false}
            />
          ) : (
            <div>
              <div
                style={{
                  fontSize: '5.5rem',
                  fontWeight: 900,
                  letterSpacing: '-0.02em',
                  background: `linear-gradient(135deg, #fff 0%, ${accentColor} 50%, #a855f7 100%)`,
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                  lineHeight: 1,
                  textShadow: 'none',
                  filter: `drop-shadow(0 0 30px ${accentColor}80)`,
                }}
              >
                {t('welcome.title', lang)}
              </div>
              {/* Decorative accent line */}
              <motion.div
                initial={{ scaleX: 0 }}
                animate={{ scaleX: 1 }}
                transition={{ delay: 0.5, duration: 0.6, ease: 'easeOut' }}
                style={{
                  height: 4,
                  borderRadius: 2,
                  background: `linear-gradient(90deg, transparent, ${accentColor}, transparent)`,
                  marginTop: 12,
                }}
              />
            </div>
          )}
        </motion.div>

        {/* Tagline */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.6, ease: 'easeOut' }}
          style={{
            fontSize: '2rem',
            fontWeight: 400,
            color: 'var(--text-muted)',
            letterSpacing: '0.01em',
          }}
        >
          {t('welcome.subtitle', lang)}
        </motion.p>

        {/* Event name badge (if loaded) */}
        {config?.name && config.name !== 'Pixel AI Demo' && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.5, duration: 0.5 }}
            style={{
              padding: '10px 28px',
              borderRadius: 40,
              border: '1px solid var(--border)',
              background: 'var(--card-bg)',
              backdropFilter: 'blur(12px)',
              WebkitBackdropFilter: 'blur(12px)',
              fontSize: '1.1rem',
              color: 'var(--text-muted)',
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
            }}
          >
            {config.name}
          </motion.div>
        )}

        {/* START button */}
        <motion.button
          className="btn btn-primary"
          initial={{ opacity: 0, scale: 0.85 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.6, duration: 0.5, ease: 'backOut' }}
          whileTap={{ scale: 0.94 }}
          onPointerDown={handleStart}
          style={{
            fontSize: '2rem',
            fontWeight: 800,
            padding: '0 80px',
            minHeight: 88,
            letterSpacing: '0.08em',
            boxShadow: `0 0 60px ${accentColor}60, 0 8px 32px ${accentColor}40`,
            borderRadius: 44,
            marginTop: 16,
          }}
        >
          {t('welcome.start', lang)}
        </motion.button>

        {/* Touch hint */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.4 }}
          transition={{ delay: 1.2, duration: 1 }}
          style={{
            fontSize: '1rem',
            color: 'var(--text-muted)',
            letterSpacing: '0.05em',
          }}
        >
          {lang === 'es' ? 'Toca para comenzar' : 'Tap to begin'}
        </motion.p>
      </div>
    </div>
  );
}
