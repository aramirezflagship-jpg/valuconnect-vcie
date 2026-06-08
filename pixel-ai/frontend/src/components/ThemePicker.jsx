import { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { t } from '../utils/i18n.js';

// ─── Built-in default themes ──────────────────────────────────────────────────
const DEFAULT_THEMES = [
  { id: 'galaxy',  name: { en: 'Galaxy',      es: 'Galaxia'     }, gradient: ['#0f0c29', '#302b63'] },
  { id: 'jungle',  name: { en: 'Jungle',      es: 'Selva'       }, gradient: ['#134e5e', '#71b280'] },
  { id: 'royal',   name: { en: 'Royal',       es: 'Real'        }, gradient: ['#4776e6', '#8e54e9'] },
  { id: 'sunset',  name: { en: 'Sunset',      es: 'Atardecer'   }, gradient: ['#f7971e', '#ffd200'] },
  { id: 'wedding', name: { en: 'Elegant',     es: 'Elegante'    }, gradient: ['#bdc3c7', '#2c3e50'] },
  { id: 'xv',      name: { en: 'Quinceañera', es: 'Quinceañera' }, gradient: ['#f953c6', '#b91d73'] },
];

// ─── Theme icon decorations ───────────────────────────────────────────────────
const THEME_ICONS = {
  galaxy:  '✨',
  jungle:  '🌿',
  royal:   '👑',
  sunset:  '🌅',
  wedding: '🤍',
  xv:      '🌸',
};

function ThemeCard({ theme, lang, selected, onSelect }) {
  const [g1, g2] = theme.gradient;
  const themeName = theme.name?.[lang] || theme.name?.es || theme.id;
  const icon = THEME_ICONS[theme.id] || '🎨';

  return (
    <motion.button
      whileTap={{ scale: 0.96 }}
      onPointerDown={() => onSelect(theme)}
      style={{
        position: 'relative',
        border: 'none',
        borderRadius: 20,
        overflow: 'hidden',
        cursor: 'pointer',
        padding: 0,
        outline: selected ? `3px solid #fff` : '3px solid transparent',
        outlineOffset: 3,
        boxShadow: selected
          ? '0 0 0 6px rgba(124,58,237,0.5), 0 8px 32px rgba(0,0,0,0.5)'
          : '0 4px 20px rgba(0,0,0,0.4)',
        transition: 'box-shadow 0.2s ease, outline-color 0.2s ease',
        touchAction: 'manipulation',
        WebkitTapHighlightColor: 'transparent',
      }}
    >
      {/* Gradient preview */}
      <div
        style={{
          width: '100%',
          aspectRatio: '4/3',
          background: `linear-gradient(135deg, ${g1} 0%, ${g2} 100%)`,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 12,
        }}
      >
        {/* Theme icon */}
        <span style={{ fontSize: '3rem', lineHeight: 1, filter: 'drop-shadow(0 2px 8px rgba(0,0,0,0.5))' }}>
          {icon}
        </span>
        {/* Simulated silhouette placeholder */}
        <div
          style={{
            width: 64,
            height: 80,
            borderRadius: '50% 50% 0 0 / 60% 60% 0 0',
            background: 'rgba(255,255,255,0.15)',
            backdropFilter: 'blur(4px)',
          }}
        />
      </div>

      {/* Theme name label */}
      <div
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          padding: '20px 16px 14px',
          background: 'linear-gradient(transparent, rgba(0,0,0,0.75))',
          textAlign: 'center',
        }}
      >
        <span
          style={{
            color: '#fff',
            fontWeight: 700,
            fontSize: '1.15rem',
            letterSpacing: '0.03em',
            textShadow: '0 1px 4px rgba(0,0,0,0.6)',
          }}
        >
          {themeName}
        </span>
      </div>

      {/* Selected checkmark */}
      {selected && (
        <div
          style={{
            position: 'absolute',
            top: 12,
            right: 12,
            width: 36,
            height: 36,
            borderRadius: '50%',
            background: 'var(--accent)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 2px 8px rgba(0,0,0,0.4)',
          }}
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path d="M4 10l4.5 4.5 7.5-9" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
      )}
    </motion.button>
  );
}

export default function ThemePicker({ config, lang, onSelect, onBack }) {
  const themes = (config?.themes?.length ? config.themes : DEFAULT_THEMES);
  const [selected, setSelected] = useState(null);

  const handleSelect = useCallback((theme) => {
    setSelected(theme);
  }, []);

  const handleNext = useCallback(() => {
    if (selected) onSelect(selected);
  }, [selected, onSelect]);

  return (
    <div
      className="screen"
      style={{
        flexDirection: 'column',
        justifyContent: 'flex-start',
        padding: '32px 48px 24px',
        gap: 0,
        background: 'var(--bg)',
        overflow: 'hidden',
      }}
    >
      {/* ── Header ── */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          width: '100%',
          marginBottom: 28,
          flexShrink: 0,
        }}
      >
        <button
          className="btn btn-ghost"
          onPointerDown={onBack}
          style={{ minHeight: 52, padding: '0 24px', fontSize: '1rem' }}
        >
          ← {lang === 'es' ? 'Atrás' : 'Back'}
        </button>

        <h1
          style={{
            fontSize: '2rem',
            fontWeight: 800,
            color: 'var(--text)',
            textAlign: 'center',
            flex: 1,
          }}
        >
          {t('themes.title', lang)}
        </h1>

        {/* Spacer to balance the back button */}
        <div style={{ width: 100 }} />
      </motion.div>

      {/* ── Theme grid ── */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15, duration: 0.45 }}
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: 20,
          width: '100%',
          flex: 1,
          overflowY: 'auto',
          paddingBottom: 8,
          // hide scrollbar
          scrollbarWidth: 'none',
          msOverflowStyle: 'none',
        }}
      >
        {themes.map((theme, idx) => (
          <motion.div
            key={theme.id}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.1 + idx * 0.06, duration: 0.35 }}
          >
            <ThemeCard
              theme={theme}
              lang={lang}
              selected={selected?.id === theme.id}
              onSelect={handleSelect}
            />
          </motion.div>
        ))}
      </motion.div>

      {/* ── Next / Siguiente button ── */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4, duration: 0.4 }}
        style={{
          display: 'flex',
          justifyContent: 'center',
          paddingTop: 24,
          flexShrink: 0,
        }}
      >
        <button
          className="btn btn-primary"
          disabled={!selected}
          onPointerDown={handleNext}
          style={{
            fontSize: '1.5rem',
            padding: '0 80px',
            minHeight: 72,
            opacity: selected ? 1 : 0.35,
            transition: 'opacity 0.25s ease',
          }}
        >
          {t('themes.select', lang)}
        </button>
      </motion.div>

      {/* Hint text */}
      {!selected && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.5 }}
          transition={{ delay: 0.8 }}
          style={{
            textAlign: 'center',
            color: 'var(--text-muted)',
            fontSize: '0.95rem',
            paddingTop: 10,
            flexShrink: 0,
          }}
        >
          {lang === 'es' ? 'Toca un tema para seleccionarlo' : 'Tap a theme to select it'}
        </motion.p>
      )}
    </div>
  );
}
