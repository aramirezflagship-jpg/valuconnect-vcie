import { useCallback, useState } from 'react';
import { motion } from 'framer-motion';

/**
 * StripPreview — Shown after a strip or collage is composed.
 * Replaces Preview.jsx when the output is a multi-photo format.
 *
 * Props:
 *   stripUrl    {string}    - URL of the composed strip/collage PNG
 *   templateId  {string}    - Template id, e.g. "strip-2x6"
 *   onApprove   {function}  - Called when guest taps "Print & Share"
 *   onRetake    {function}  - Called when guest wants to redo photos
 *   onDone      {function}  - Called after print/share flow completes
 */
export default function StripPreview({ stripUrl, templateId, onApprove, onRetake, onDone }) {
  const [confirming, setConfirming] = useState(false);

  const handleApprove = useCallback(() => {
    setConfirming(true);
    onApprove();
  }, [onApprove]);

  const handleBackdropPointerDown = useCallback((e) => {
    e.stopPropagation();
  }, []);

  const templateLabel = _templateLabel(templateId);

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
      {/* ── Image area ── */}
      <div
        style={{
          flex: 1,
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
          position: 'relative',
          background: '#050510',
        }}
      >
        {stripUrl ? (
          <motion.img
            key={stripUrl}
            src={stripUrl}
            alt="Photo strip preview"
            initial={{ opacity: 0, scale: 0.9 }}
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
          // Loading spinner
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: '50%',
              border: '4px solid #7c3aed',
              borderTopColor: 'transparent',
              animation: 'spin 0.8s linear infinite',
            }}
          />
        )}

        {/* Template badge — top right of image area */}
        <motion.span
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          style={{
            position: 'absolute',
            top: 16,
            right: 16,
            background: 'rgba(124,58,237,0.85)',
            backdropFilter: 'blur(8px)',
            color: '#fff',
            fontSize: '.75rem',
            fontWeight: 700,
            padding: '.3rem .75rem',
            borderRadius: 20,
            letterSpacing: '.04em',
            textTransform: 'uppercase',
            fontFamily: 'system-ui, sans-serif',
          }}
        >
          {templateLabel}
        </motion.span>
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
          borderLeft: '1px solid rgba(255,255,255,0.08)',
          backdropFilter: 'blur(24px)',
          WebkitBackdropFilter: 'blur(24px)',
          flexShrink: 0,
          fontFamily: 'system-ui, sans-serif',
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
            color: '#f1f5f9',
            textAlign: 'center',
            margin: 0,
          }}
        >
          Your Strip is Ready!
        </motion.h2>

        {/* Decorative divider */}
        <div
          style={{
            width: 60,
            height: 3,
            borderRadius: 2,
            background: 'linear-gradient(90deg, #7c3aed, #a78bfa)',
          }}
        />

        {/* Print & Share button */}
        <motion.button
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.45, duration: 0.4 }}
          whileTap={{ scale: 0.95 }}
          onPointerDown={(e) => { e.stopPropagation(); handleApprove(); }}
          disabled={confirming}
          style={{
            width: '100%',
            fontSize: '1.25rem',
            fontWeight: 700,
            minHeight: 80,
            background: confirming
              ? 'rgba(124,58,237,0.4)'
              : 'linear-gradient(135deg, #7c3aed, #6d28d9)',
            color: '#fff',
            border: 'none',
            borderRadius: 14,
            cursor: confirming ? 'not-allowed' : 'pointer',
            boxShadow: confirming ? 'none' : '0 6px 32px rgba(124,58,237,0.4)',
            transition: 'all .2s',
          }}
        >
          {confirming ? 'Processing…' : 'Print & Share'}
        </motion.button>

        {/* Retake button */}
        <motion.button
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.55, duration: 0.4 }}
          whileTap={{ scale: 0.95 }}
          onPointerDown={(e) => { e.stopPropagation(); onRetake(); }}
          style={{
            width: '100%',
            fontSize: '1.1rem',
            fontWeight: 600,
            minHeight: 64,
            background: 'rgba(239,68,68,0.12)',
            color: '#f87171',
            border: '1px solid rgba(239,68,68,0.3)',
            borderRadius: 14,
            cursor: 'pointer',
            transition: 'all .2s',
          }}
        >
          Retake
        </motion.button>

        {/* Done / skip print */}
        {onDone && (
          <motion.button
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.6 }}
            transition={{ delay: 0.8 }}
            onClick={onDone}
            style={{
              background: 'transparent',
              color: '#64748b',
              border: 'none',
              fontSize: '.85rem',
              fontWeight: 600,
              cursor: 'pointer',
              marginTop: '.5rem',
            }}
          >
            Skip print
          </motion.button>
        )}

        {/* Hint */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.45 }}
          transition={{ delay: 0.9 }}
          style={{
            fontSize: '.85rem',
            color: '#94a3b8',
            textAlign: 'center',
            lineHeight: 1.5,
            margin: 0,
          }}
        >
          Print &amp; share to send your strip to your phone, or retake to reshoot.
        </motion.p>
      </motion.div>
    </div>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function _templateLabel(templateId) {
  const labels = {
    'single': 'Classic Single',
    'strip-2x6': 'Classic Strip',
    'collage-4x6': '4×6 Collage',
  };
  return labels[templateId] || templateId || 'Strip';
}
