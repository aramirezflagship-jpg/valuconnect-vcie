import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { getBackgrounds } from '../utils/api.js';
import { t } from '../utils/i18n.js';

/**
 * GuestBackgroundPicker — kiosk screen where the guest chooses one of the
 * event's themed backgrounds (real uploaded art) before the camera step.
 *
 * Replaces the old AI ThemePicker. The chosen background's id is passed to
 * onSelect and ultimately sent to POST /api/capture as `backgroundId`.
 *
 * Graceful fallbacks:
 *  - If the event has no backgroundIds configured, or none of them resolve to
 *    real records, onSelect(null) is called automatically so the flow proceeds
 *    (the backend composites onto the event default / solid canvas).
 *
 * @param {{ config: object, lang: 'en'|'es', onSelect: (bg|null)=>void, onBack: ()=>void }} props
 */
export default function BackgroundPicker({ config, lang, onSelect, onBack }) {
  const [backgrounds, setBackgrounds] = useState(null); // null = loading
  const [selected, setSelected] = useState(null);

  const eventBgIds = config?.backgroundIds || [];
  const defaultBgId = config?.defaultBackgroundId || null;

  const finish = useCallback((bg) => onSelect(bg || null), [onSelect]);

  useEffect(() => {
    let active = true;

    // No backgrounds configured for this event → skip straight to camera.
    if (!eventBgIds.length && !defaultBgId) {
      finish(null);
      return;
    }

    // Fetch the full catalogue (no category filter) and keep only this event's.
    getBackgrounds()
      .then((data) => {
        if (!active) return;
        const all = data.backgrounds || [];
        const wanted = new Set([...eventBgIds, ...(defaultBgId ? [defaultBgId] : [])]);
        const mine = all.filter((b) => wanted.has(b.id));

        if (mine.length === 0) {
          // Nothing resolved — fall back gracefully.
          finish(null);
          return;
        }

        setBackgrounds(mine);
        // Pre-select the event default if present.
        const def = mine.find((b) => b.id === defaultBgId) || mine[0];
        setSelected(def);
      })
      .catch(() => {
        if (active) finish(null);
      });

    return () => {
      active = false;
    };
  }, [eventBgIds, defaultBgId, finish]);

  // Still loading or auto-skipping — render nothing (kiosk shows transition).
  if (backgrounds === null) return null;

  return (
    <div
      className="screen"
      style={{
        flexDirection: 'column',
        justifyContent: 'flex-start',
        padding: '24px 24px 20px',
        gap: 0,
        background: 'var(--bg)',
        overflow: 'hidden',
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          width: '100%',
          marginBottom: 20,
          flexShrink: 0,
        }}
      >
        <button className="btn btn-ghost" onPointerDown={onBack} style={{ minHeight: 48, padding: '0 20px', fontSize: '1rem' }}>
          ← {lang === 'es' ? 'Atrás' : 'Back'}
        </button>
        <h1 style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--text)', textAlign: 'center', flex: 1 }}>
          {t('themes.title', lang)}
        </h1>
        <div style={{ width: 90 }} />
      </div>

      {/* Background grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
          gap: 16,
          width: '100%',
          flex: 1,
          overflowY: 'auto',
          paddingBottom: 8,
          alignContent: 'start',
        }}
      >
        {backgrounds.map((bg) => {
          const isSel = selected?.id === bg.id;
          return (
            <motion.button
              key={bg.id}
              whileTap={{ scale: 0.95 }}
              onPointerDown={() => setSelected(bg)}
              style={{
                position: 'relative',
                border: 'none',
                borderRadius: 18,
                overflow: 'hidden',
                cursor: 'pointer',
                padding: 0,
                outline: isSel ? '3px solid #fff' : '3px solid transparent',
                outlineOffset: 3,
                boxShadow: isSel
                  ? '0 0 0 6px rgba(74,143,196,0.5), 0 8px 32px rgba(0,0,0,0.5)'
                  : '0 4px 20px rgba(0,0,0,0.4)',
                aspectRatio: '3/4',
                width: '100%',
                background: 'rgba(255,255,255,0.04)',
              }}
            >
              <img
                src={bg.thumbnailUrl || bg.url}
                alt={bg.name}
                style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
              />
              <div
                style={{
                  position: 'absolute',
                  bottom: 0,
                  left: 0,
                  right: 0,
                  padding: '24px 10px 12px',
                  background: 'linear-gradient(transparent, rgba(0,0,0,0.8))',
                  textAlign: 'center',
                }}
              >
                <span style={{ color: '#fff', fontWeight: 700, fontSize: '1rem', textShadow: '0 1px 4px rgba(0,0,0,0.8)' }}>
                  {bg.name}
                </span>
              </div>
              {isSel && (
                <div
                  style={{
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
                  }}
                >
                  <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
                    <path d="M4 10l4.5 4.5 7.5-9" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
              )}
            </motion.button>
          );
        })}
      </div>

      {/* Next */}
      <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 20, flexShrink: 0 }}>
        <button
          className="btn btn-primary"
          disabled={!selected}
          onPointerDown={() => selected && onSelect(selected)}
          style={{ fontSize: '1.4rem', padding: '0 72px', minHeight: 66, opacity: selected ? 1 : 0.35 }}
        >
          {t('themes.select', lang)}
        </button>
      </div>
    </div>
  );
}
