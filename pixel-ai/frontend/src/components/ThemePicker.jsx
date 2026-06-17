import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { t } from '../utils/i18n.js';

// ─── Device detection ─────────────────────────────────────────────────────────
function useIsMobile() {
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 768);
  useEffect(() => {
    const update = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);
  return isMobile;
}

// ─── Event categories ─────────────────────────────────────────────────────────
const CATEGORIES = [
  { id: 'all',         icon: '🎨', label: { es: 'Todos',       en: 'All'        } },
  { id: 'boda',        icon: '💍', label: { es: 'Boda',        en: 'Wedding'    } },
  { id: 'xv',          icon: '🌸', label: { es: 'XV Años',     en: 'Quinceañera'} },
  { id: 'corporativo', icon: '🏢', label: { es: 'Corporativo', en: 'Corporate'  } },
  { id: 'universal',   icon: '✨', label: { es: 'Universal',   en: 'Universal'  } },
];

// ─── Built-in default themes (fallback when event config has no themes) ───────
const DEFAULT_THEMES = [
  { id: 'galaxy',  category: 'universal', name: { en: 'Galaxy',      es: 'Galaxia'     }, icon: '✨', gradient: ['#0f0c29', '#302b63'] },
  { id: 'jungle',  category: 'universal', name: { en: 'Jungle',      es: 'Selva'       }, icon: '🌿', gradient: ['#134e5e', '#71b280'] },
  { id: 'sunset',  category: 'universal', name: { en: 'Sunset',      es: 'Atardecer'   }, icon: '🌅', gradient: ['#f7971e', '#ffd200'] },
  { id: 'royal',   category: 'boda',      name: { en: 'Royal',       es: 'Real'        }, icon: '👑', gradient: ['#4776e6', '#8e54e9'] },
  { id: 'wedding-garden', category: 'boda', name: { en: 'Garden',    es: 'Jardín'      }, icon: '🌸', gradient: ['#bdc3c7', '#2c3e50'] },
  { id: 'xv',      category: 'xv',        name: { en: 'Quinceañera', es: 'Quinceañera' }, icon: '🌸', gradient: ['#f953c6', '#b91d73'] },
  { id: 'xv-castle', category: 'xv',      name: { en: 'Castle',      es: 'Castillo'    }, icon: '🏰', gradient: ['#ee9ca7', '#ffdde1'] },
  { id: 'corporate', category: 'corporativo', name: { en: 'City',    es: 'Ciudad'      }, icon: '🏙️', gradient: ['#141e30', '#243b55'] },
  { id: 'paris',   category: 'universal', name: { en: 'Paris',       es: 'París'       }, icon: '🗼', gradient: ['#1c1c5e', '#2a2a8a'] },
];

// ─── Theme card ───────────────────────────────────────────────────────────────
function ThemeCard({ theme, lang, selected, onSelect }) {
  const [g1, g2] = theme.gradient || ['#1a1a2e', '#16213e'];
  const name = theme.name?.[lang] || theme.name?.es || theme.id;
  const icon = theme.icon || '🎨';

  return (
    <motion.button
      whileTap={{ scale: 0.95 }}
      onPointerDown={() => onSelect(theme)}
      style={{
        position: 'relative',
        border: 'none',
        borderRadius: 18,
        overflow: 'hidden',
        cursor: 'pointer',
        padding: 0,
        outline: selected ? '3px solid #fff' : '3px solid transparent',
        outlineOffset: 3,
        boxShadow: selected
          ? '0 0 0 6px rgba(74,143,196,0.5), 0 8px 32px rgba(0,0,0,0.5)'
          : '0 4px 20px rgba(0,0,0,0.4)',
        transition: 'box-shadow 0.2s, outline-color 0.2s',
        touchAction: 'manipulation',
        WebkitTapHighlightColor: 'transparent',
        width: '100%',
        aspectRatio: '3/4',
      }}
    >
      {/* Gradient background */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: `linear-gradient(135deg, ${g1} 0%, ${g2} 100%)`,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 10,
        }}
      >
        <span style={{ fontSize: '2.8rem', lineHeight: 1, filter: 'drop-shadow(0 2px 8px rgba(0,0,0,0.5))' }}>
          {icon}
        </span>
        {/* Silhouette placeholder */}
        <div style={{
          width: 52,
          height: 68,
          borderRadius: '50% 50% 0 0 / 60% 60% 0 0',
          background: 'rgba(255,255,255,0.15)',
          backdropFilter: 'blur(4px)',
        }} />
      </div>

      {/* Name label */}
      <div style={{
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        padding: '24px 10px 12px',
        background: 'linear-gradient(transparent, rgba(0,0,0,0.8))',
        textAlign: 'center',
      }}>
        <span style={{
          color: '#fff',
          fontWeight: 700,
          fontSize: '1rem',
          letterSpacing: '0.02em',
          textShadow: '0 1px 4px rgba(0,0,0,0.8)',
          whiteSpace: 'normal',
          overflow: 'hidden',
          display: '-webkit-box',
          WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical',
          padding: '0 4px',
        }}>
          {name}
        </span>
      </div>

      {/* Selected checkmark */}
      {selected && (
        <div style={{
          position: 'absolute',
          top: 10,
          right: 10,
          width: 32,
          height: 32,
          borderRadius: '50%',
          background: 'var(--accent)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 2px 8px rgba(0,0,0,0.4)',
        }}>
          <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
            <path d="M4 10l4.5 4.5 7.5-9" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
      )}
    </motion.button>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function ThemePicker({ config, lang, onSelect, onBack }) {
  const isMobile = useIsMobile();
  const allThemes = config?.themes?.length ? config.themes : DEFAULT_THEMES;
  const [activeCategory, setActiveCategory] = useState('all');
  const [selected, setSelected] = useState(null);

  // Filter out categories that have no themes
  const availableCategories = CATEGORIES.filter((cat) =>
    cat.id === 'all' || allThemes.some((t) => t.category === cat.id)
  );

  const visibleThemes = activeCategory === 'all'
    ? allThemes
    : allThemes.filter((t) => t.category === activeCategory);

  const handleNext = useCallback(() => {
    if (selected) onSelect(selected);
  }, [selected, onSelect]);

  return (
    <div
      className="screen"
      style={{
        flexDirection: 'column',
        justifyContent: 'flex-start',
        padding: isMobile ? '16px 16px 16px' : '24px 40px 20px',
        gap: 0,
        background: 'var(--bg)',
        overflow: 'hidden',
      }}
    >
      {/* ── Header ── */}
      <motion.div
        initial={{ opacity: 0, y: -16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          width: '100%',
          marginBottom: 20,
          flexShrink: 0,
        }}
      >
        <button
          className="btn btn-ghost"
          onPointerDown={onBack}
          style={{ minHeight: 48, padding: '0 20px', fontSize: '1rem' }}
        >
          ← {lang === 'es' ? 'Atrás' : 'Back'}
        </button>

        <h1 style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--text)', textAlign: 'center', flex: 1 }}>
          {t('themes.title', lang)}
        </h1>

        <div style={{ width: 90 }} />
      </motion.div>

      {/* ── Category tabs ── */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1, duration: 0.35 }}
        style={{
          display: 'flex',
          gap: 10,
          marginBottom: 20,
          flexShrink: 0,
          overflowX: 'auto',
          scrollbarWidth: 'none',
          msOverflowStyle: 'none',
          paddingBottom: 4,
        }}
      >
        {availableCategories.map((cat) => {
          const isActive = activeCategory === cat.id;
          return (
            <button
              key={cat.id}
              onPointerDown={() => { setActiveCategory(cat.id); setSelected(null); }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '10px 20px',
                borderRadius: 40,
                border: isActive ? 'none' : '1px solid var(--border)',
                background: isActive ? 'var(--accent)' : 'var(--card-bg)',
                color: isActive ? '#fff' : 'var(--text-muted)',
                fontWeight: isActive ? 700 : 500,
                fontSize: '0.95rem',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                flexShrink: 0,
                transition: 'all 0.2s',
                touchAction: 'manipulation',
                WebkitTapHighlightColor: 'transparent',
                boxShadow: isActive ? '0 4px 16px rgba(74,143,196,0.4)' : 'none',
              }}
            >
              <span>{cat.icon}</span>
              <span>{cat.label[lang] || cat.label.es}</span>
            </button>
          );
        })}
      </motion.div>

      {/* ── Theme grid ── */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeCategory}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.3 }}
          style={{
            display: 'grid',
            gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)',
            gap: 16,
            width: '100%',
            flex: 1,
            overflowY: 'auto',
            paddingBottom: 8,
            scrollbarWidth: 'none',
            msOverflowStyle: 'none',
            alignContent: 'start',
          }}
        >
          {visibleThemes.map((theme, idx) => (
            <motion.div
              key={theme.id}
              initial={{ opacity: 0, scale: 0.92 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: idx * 0.04, duration: 0.3 }}
            >
              <ThemeCard
                theme={theme}
                lang={lang}
                selected={selected?.id === theme.id}
                onSelect={setSelected}
              />
            </motion.div>
          ))}
        </motion.div>
      </AnimatePresence>

      {/* ── Next button ── */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.35, duration: 0.4 }}
        style={{ display: 'flex', justifyContent: 'center', paddingTop: 20, flexShrink: 0 }}
      >
        <button
          className="btn btn-primary"
          disabled={!selected}
          onPointerDown={handleNext}
          style={{
            fontSize: '1.4rem',
            padding: '0 72px',
            minHeight: 66,
            opacity: selected ? 1 : 0.35,
            transition: 'opacity 0.25s',
          }}
        >
          {t('themes.select', lang)}
        </button>
      </motion.div>

      {!selected && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.5 }}
          transition={{ delay: 0.7 }}
          style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.9rem', paddingTop: 8, flexShrink: 0 }}
        >
          {lang === 'es' ? 'Toca un tema para seleccionarlo' : 'Tap a theme to select it'}
        </motion.p>
      )}
    </div>
  );
}
