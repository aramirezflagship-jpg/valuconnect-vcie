import { useCallback } from 'react';
import { motion } from 'framer-motion';
import { t } from '../utils/i18n.js';

export default function Preview({ lang, imageUrl, error, onApprove, onRetake }) {
  // Prevent accidental taps on the background from navigating
  const handleBackdropPointerDown = useCallback((e) => {
    // Only stop propagation — don't call any navigation handler
    e.stopPropagation();
  }, []);

  return (
    <div
      className="screen"
      style={{
        background: '#000',
        flexDirection: 'row',
        gap: 0,
        overflow: 'hidden',
      }}
      onPointerDown={handleBackdropPointerDown}
    >
      {/* ── Photo area (left / center) ── */}
      <div
        style={{
          flex: 1,
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
          position: 'relative',
        }}
      >
        {error === 'demo' ? (
          /* Demo mode — show the original photo with a banner */
          <>
            <motion.img
              key={imageUrl}
              src={imageUrl}
              alt="Demo capture"
              initial={{ opacity: 0, scale: 0.88 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.55, ease: 'backOut' }}
              style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', borderRadius: 8 }}
              draggable={false}
            />
            <div style={{
              position: 'absolute', bottom: 12, left: '50%', transform: 'translateX(-50%)',
              background: 'rgba(124,58,237,0.85)', backdropFilter: 'blur(8px)',
              color: '#fff', fontSize: '0.85rem', padding: '6px 16px', borderRadius: 20,
              fontWeight: 600, whiteSpace: 'nowrap',
            }}>
              ✨ Demo — sin fondo IA (backend no conectado)
            </div>
          </>
        ) : error ? (
          /* Error state */
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4 }}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 20,
              padding: 48,
              textAlign: 'center',
            }}
          >
            <div style={{ fontSize: '5rem' }}>⚠️</div>
            <p
              style={{
                color: 'var(--danger)',
                fontSize: '1.4rem',
                fontWeight: 700,
              }}
            >
              {t('errors.generic', lang)}
            </p>
            <p
              style={{
                color: 'var(--text-muted)',
                fontSize: '1rem',
                maxWidth: 380,
              }}
            >
              {error}
            </p>
          </motion.div>
        ) : imageUrl ? (
          /* Transformed photo */
          <motion.img
            key={imageUrl}
            src={imageUrl}
            alt="Transformed photo"
            initial={{ opacity: 0, scale: 0.88 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.55, ease: 'backOut' }}
            style={{
              maxWidth: '100%',
              maxHeight: '100%',
              objectFit: 'contain',
              display: 'block',
              borderRadius: 8,
            }}
            draggable={false}
          />
        ) : (
          /* Loading fallback (should not normally appear) */
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: '50%',
              border: '4px solid var(--accent)',
              borderTopColor: 'transparent',
              animation: 'spin 0.8s linear infinite',
            }}
          />
        )}
      </div>

      {/* ── Action panel (right sidebar) ── */}
      <motion.div
        initial={{ opacity: 0, x: 60 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.2, duration: 0.5, ease: 'easeOut' }}
        style={{
          width: 320,
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 24,
          padding: '48px 32px',
          background: 'rgba(13,13,26,0.95)',
          borderLeft: '1px solid var(--border)',
          backdropFilter: 'blur(24px)',
          WebkitBackdropFilter: 'blur(24px)',
          flexShrink: 0,
        }}
      >
        {/* Title */}
        <motion.h2
          initial={{ opacity: 0, y: -16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35, duration: 0.4 }}
          style={{
            fontSize: '1.8rem',
            fontWeight: 800,
            color: 'var(--text)',
            textAlign: 'center',
          }}
        >
          {t('preview.title', lang)}
        </motion.h2>

        {/* Decorative divider */}
        <div
          style={{
            width: 60,
            height: 3,
            borderRadius: 2,
            background: 'linear-gradient(90deg, var(--accent), var(--accent-light))',
          }}
        />

        {/* Approve button */}
        <motion.button
          className="btn btn-success"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.45, duration: 0.4 }}
          whileTap={{ scale: 0.95 }}
          onPointerDown={(e) => { e.stopPropagation(); onApprove(); }}
          style={{
            width: '100%',
            fontSize: '1.4rem',
            minHeight: 80,
            boxShadow: '0 6px 32px var(--success-glow)',
          }}
        >
          {t('preview.approve', lang)}
        </motion.button>

        {/* Retake button */}
        <motion.button
          className="btn btn-danger"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.55, duration: 0.4 }}
          whileTap={{ scale: 0.95 }}
          onPointerDown={(e) => { e.stopPropagation(); onRetake(); }}
          style={{
            width: '100%',
            fontSize: '1.2rem',
            minHeight: 68,
          }}
        >
          {t('preview.retake', lang)}
        </motion.button>

        {/* Hint */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.45 }}
          transition={{ delay: 0.9 }}
          style={{
            fontSize: '0.9rem',
            color: 'var(--text-muted)',
            textAlign: 'center',
            lineHeight: 1.5,
          }}
        >
          {lang === 'es'
            ? 'Aprueba para recibir tu foto o retoma para intentarlo de nuevo.'
            : 'Approve to receive your photo, or retake to try again.'}
        </motion.p>
      </motion.div>
    </div>
  );
}
