import { useEffect } from 'react';
import { motion } from 'framer-motion';

/**
 * LayoutPicker — Full-screen layout selection screen shown between theme
 * selection and the camera. Guests tap a card to choose their print format.
 *
 * Props:
 *   layouts   {object[]}  - Array of template objects from /api/templates
 *   onSelect  {function}  - Called with the chosen template object
 *   onBack    {function}  - Called when the guest taps the back button
 */
export default function LayoutPicker({ layouts = [], onSelect, onBack }) {
  // If only one layout is available, skip the picker entirely
  useEffect(() => {
    if (layouts.length === 1) {
      onSelect(layouts[0]);
    }
  }, [layouts, onSelect]);

  if (layouts.length <= 1) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: '#0d0d1a',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '2rem 1.5rem',
        zIndex: 100,
      }}
    >
      {/* Header */}
      <motion.h1
        initial={{ opacity: 0, y: -24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: 'easeOut' }}
        style={{
          color: '#f1f5f9',
          fontSize: '2rem',
          fontWeight: 800,
          marginBottom: '.5rem',
          textAlign: 'center',
          fontFamily: 'system-ui, sans-serif',
        }}
      >
        Choose Your Layout
      </motion.h1>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.55 }}
        transition={{ delay: 0.2, duration: 0.4 }}
        style={{
          color: '#94a3b8',
          fontSize: '1rem',
          marginBottom: '2.5rem',
          textAlign: 'center',
          fontFamily: 'system-ui, sans-serif',
        }}
      >
        Pick a print format for your photos
      </motion.p>

      {/* Layout cards grid */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '1.5rem',
          justifyContent: 'center',
          maxWidth: 900,
        }}
      >
        {layouts.map((layout, i) => (
          <LayoutCard
            key={layout.id}
            layout={layout}
            index={i}
            onSelect={onSelect}
          />
        ))}
      </div>

      {/* Back button — bottom left */}
      <motion.button
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        onClick={onBack}
        style={{
          position: 'absolute',
          bottom: '2rem',
          left: '2rem',
          background: 'rgba(255,255,255,0.06)',
          color: '#94a3b8',
          border: '1px solid rgba(255,255,255,0.12)',
          borderRadius: 10,
          padding: '.65rem 1.25rem',
          fontSize: '.9rem',
          fontWeight: 600,
          cursor: 'pointer',
          fontFamily: 'system-ui, sans-serif',
        }}
      >
        Back
      </motion.button>

      {/* Skip / use default — top right */}
      <motion.button
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        onClick={() => onSelect(layouts[0])}
        style={{
          position: 'absolute',
          top: '1.5rem',
          right: '1.5rem',
          background: 'transparent',
          color: '#475569',
          border: 'none',
          fontSize: '.8rem',
          fontWeight: 600,
          cursor: 'pointer',
          fontFamily: 'system-ui, sans-serif',
        }}
      >
        Skip
      </motion.button>
    </div>
  );
}

// ── LayoutCard ────────────────────────────────────────────────────────────────

function LayoutCard({ layout, index, onSelect }) {
  const photoLabel =
    layout.photoCount === 1
      ? 'Take 1 photo'
      : `Take ${layout.photoCount} photos`;

  return (
    <motion.button
      initial={{ opacity: 0, y: 32 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 + index * 0.08, duration: 0.45, ease: 'easeOut' }}
      whileHover={{ scale: 1.04, boxShadow: '0 0 0 2px #7c3aed' }}
      whileTap={{ scale: 0.97 }}
      onClick={() => onSelect(layout)}
      style={{
        background: '#1a1a2e',
        border: '2px solid rgba(124,58,237,0.25)',
        borderRadius: 16,
        padding: '1.5rem',
        width: 200,
        minWidth: 160,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '1rem',
        cursor: 'pointer',
        transition: 'border-color .15s',
        fontFamily: 'system-ui, sans-serif',
      }}
    >
      {/* Visual mockup SVG */}
      <LayoutMockup layout={layout} />

      {/* Name */}
      <span
        style={{
          color: '#f1f5f9',
          fontSize: '1rem',
          fontWeight: 700,
          textAlign: 'center',
        }}
      >
        {layout.name}
      </span>

      {/* Photo count label */}
      <span
        style={{
          background: 'rgba(124,58,237,0.2)',
          color: '#a78bfa',
          border: '1px solid rgba(124,58,237,0.35)',
          borderRadius: 20,
          fontSize: '.75rem',
          fontWeight: 700,
          padding: '.25rem .75rem',
        }}
      >
        {photoLabel}
      </span>
    </motion.button>
  );
}

// ── LayoutMockup ──────────────────────────────────────────────────────────────

/**
 * Renders a small SVG preview of where photo slots sit on the canvas.
 */
function LayoutMockup({ layout }) {
  const PREVIEW_W = 120;
  const PREVIEW_H = layout.printHeight > layout.printWidth
    ? 160
    : Math.round(PREVIEW_W * (layout.printHeight / layout.printWidth));

  const scaleX = PREVIEW_W / layout.printWidth;
  const scaleY = PREVIEW_H / layout.printHeight;

  return (
    <svg
      width={PREVIEW_W}
      height={PREVIEW_H}
      viewBox={`0 0 ${PREVIEW_W} ${PREVIEW_H}`}
      style={{ borderRadius: 8, flexShrink: 0 }}
    >
      {/* Background */}
      <rect width={PREVIEW_W} height={PREVIEW_H} fill={layout.background || '#0d0d1a'} rx={6} />

      {/* Photo slots */}
      {(layout.photoSlots || []).map((slot, i) => (
        <rect
          key={i}
          x={slot.x * scaleX}
          y={slot.y * scaleY}
          width={slot.width * scaleX}
          height={slot.height * scaleY}
          fill="rgba(124,58,237,0.45)"
          rx={2}
        />
      ))}

      {/* Logo slot hint */}
      {layout.logoSlot && (
        <rect
          x={layout.logoSlot.x * scaleX}
          y={layout.logoSlot.y * scaleY}
          width={layout.logoSlot.width * scaleX}
          height={layout.logoSlot.height * scaleY}
          fill="rgba(248,181,0,0.35)"
          rx={2}
        />
      )}
    </svg>
  );
}
