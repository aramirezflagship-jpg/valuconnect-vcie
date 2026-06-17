import { useCallback } from 'react';
import { motion } from 'framer-motion';
import { t } from '../utils/i18n.js';

const ORBS = [
  { id: 'a', top: '10%',  left: '5%',  size: 320, color: 'rgba(74,143,196,0.14)',  delay: '0s',   dur: '12s' },
  { id: 'b', top: '60%',  left: '75%', size: 400, color: 'rgba(105,179,231,0.09)', delay: '-4s',  dur: '16s' },
  { id: 'c', top: '30%',  left: '50%', size: 250, color: 'rgba(74,143,196,0.10)',  delay: '-8s',  dur: '20s' },
  { id: 'd', top: '80%',  left: '20%', size: 300, color: 'rgba(15,48,96,0.25)',    delay: '-2s',  dur: '14s' },
];

export default function Welcome({ config, lang, onLangChange, onStart }) {
  const accentColor = config?.primaryColor || '#4a8fc4';

  const handleStart = useCallback((e) => {
    e.preventDefault();
    onStart();
  }, [onStart]);

  return (
    <div className="screen" style={{ background: 'var(--bg)', position: 'relative', overflow: 'hidden' }}>

      {/* ── Background orbs ── */}
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

      {/* ── EN / ES language toggle — top right ── */}
      {onLangChange && (
        <div style={{
          position: 'absolute',
          top: 20,
          right: 24,
          zIndex: 30,
          display: 'flex',
          gap: 4,
        }}>
          {['en', 'es'].map((l) => (
            <button
              key={l}
              onPointerDown={() => onLangChange(l)}
              style={{
                padding: '6px 14px',
                borderRadius: 20,
                border: lang === l ? '1px solid #4a8fc4' : '1px solid rgba(255,255,255,0.15)',
                background: lang === l ? '#4a8fc4' : 'rgba(255,255,255,0.06)',
                color: lang === l ? '#fff' : '#8ab0ce',
                fontSize: '0.8rem',
                fontWeight: 700,
                cursor: 'pointer',
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                transition: 'all .15s',
                WebkitTapHighlightColor: 'transparent',
              }}
            >
              {l.toUpperCase()}
            </button>
          ))}
        </div>
      )}

      {/* ── Content ── */}
      <div
        style={{
          position: 'relative',
          zIndex: 10,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 'clamp(16px, 4vw, 32px)',
          padding: 'clamp(20px, 5vw, 40px)',
          textAlign: 'center',
          maxWidth: 900,
          width: '100%',
        }}
      >
        {/* Flash-it wordmark (Cinzel) — small, above the big "Welcome!" */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: 'clamp(1rem, 3vw, 1.5rem)',
            fontWeight: 700,
            background: 'linear-gradient(135deg, #fff 20%, #69b3e7 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            letterSpacing: '0.1em',
          }}
        >
          ⚡ Flash-it
        </motion.div>

        {/* Big "Welcome!" heading */}
        <motion.div
          initial={{ opacity: 0, y: -30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.1, ease: 'easeOut' }}
        >
          {config?.logoUrl ? (
            <img
              src={config.logoUrl}
              alt={config.name || 'Flash-it'}
              style={{ maxHeight: 160, maxWidth: '90vw', objectFit: 'contain' }}
              draggable={false}
            />
          ) : (
            <div>
              <div
                style={{
                  fontSize: 'clamp(3rem, 14vw, 6.5rem)',
                  fontWeight: 900,
                  letterSpacing: '-0.02em',
                  background: `linear-gradient(135deg, #fff 0%, ${accentColor} 50%, #69b3e7 100%)`,
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                  lineHeight: 1,
                  filter: `drop-shadow(0 0 30px ${accentColor}80)`,
                }}
              >
                {t('welcome.title', lang)}
              </div>
              <motion.div
                initial={{ scaleX: 0 }}
                animate={{ scaleX: 1 }}
                transition={{ delay: 0.6, duration: 0.6, ease: 'easeOut' }}
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
          transition={{ delay: 0.35, duration: 0.6, ease: 'easeOut' }}
          style={{
            fontSize: 'clamp(1rem, 4vw, 1.8rem)',
            fontWeight: 400,
            color: 'var(--text-muted)',
            letterSpacing: '0.01em',
          }}
        >
          {t('welcome.subtitle', lang)}
        </motion.p>

        {/* Event name badge */}
        {config?.name && config.name !== 'Flash-it Demo' && (
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
            fontSize: 'clamp(1.2rem, 4vw, 2rem)',
            fontWeight: 800,
            padding: '0 clamp(40px, 6vw, 80px)',
            minHeight: 'clamp(64px, 10vw, 88px)',
            width: 'clamp(220px, 60vw, 380px)',
            letterSpacing: '0.06em',
            boxShadow: `0 0 60px ${accentColor}60, 0 8px 32px ${accentColor}40`,
            borderRadius: 44,
            marginTop: 8,
          }}
        >
          {t('welcome.start', lang)}
        </motion.button>

        {/* Hint */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.45 }}
          transition={{ delay: 1.2, duration: 1 }}
          style={{ fontSize: '0.95rem', color: 'var(--text-muted)', letterSpacing: '0.04em' }}
        >
          {t('welcome.hint', lang)}
        </motion.p>
      </div>
    </div>
  );
}
