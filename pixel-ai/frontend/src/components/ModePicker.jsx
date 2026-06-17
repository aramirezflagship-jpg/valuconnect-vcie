import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { getBackgrounds } from '../utils/api.js';
import { t } from '../utils/i18n.js';

/**
 * ModePicker — kiosk screen where the guest first chooses a capture MODE
 * (Natural frame vs Character "face in the hole"), then picks a template for
 * that mode from GET /api/backgrounds?mode=<mode>&category=<event category>.
 *
 * On confirm, calls onSelect({ mode, template }) where:
 *   - natural:   template may be null (backend composites the event default)
 *   - character: template is required and carries `faceSlot`
 *
 * @param {{
 *   config: object,
 *   lang: 'en'|'es',
 *   onSelect: ({ mode, template }) => void,
 *   onBack: () => void
 * }} props
 */
export default function ModePicker({ config, lang, onSelect, onBack }) {
  const [mode, setMode] = useState(null);          // null | 'natural' | 'character'
  const [templates, setTemplates] = useState(null); // null = loading
  const [selected, setSelected] = useState(null);

  const category = config?.category || config?.eventCategory || undefined;

  // Load templates whenever the chosen mode changes.
  useEffect(() => {
    if (!mode) return;
    let active = true;
    setTemplates(null);
    setSelected(null);
    getBackgrounds(category, mode)
      .then((data) => {
        if (!active) return;
        const list = data.backgrounds || [];
        setTemplates(list);
        // Pre-select the event default (natural) or first character template.
        const def = list.find((b) => b.id === config?.defaultBackgroundId) || list[0] || null;
        setSelected(def);
      })
      .catch(() => active && setTemplates([]));
    return () => { active = false; };
  }, [mode, category, config?.defaultBackgroundId]);

  const handleConfirm = useCallback(() => {
    if (!mode) return;
    // Character REQUIRES a template; natural can proceed with the event default.
    if (mode === 'character' && !selected) return;
    onSelect({ mode, template: selected || null });
  }, [mode, selected, onSelect]);

  // ── Step 1: choose the mode ────────────────────────────────────────────────
  if (!mode) {
    return (
      <div
        className="screen"
        style={{ flexDirection: 'column', justifyContent: 'flex-start', padding: '24px', gap: 0, background: 'var(--bg)' }}
      >
        <Header lang={lang} title={t('mode.title', lang)} onBack={onBack} />
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
            gap: 20,
            width: '100%',
            flex: 1,
            alignContent: 'center',
          }}
        >
          <ModeCard
            emoji="🖼️"
            title={t('mode.natural.title', lang)}
            desc={t('mode.natural.desc', lang)}
            onSelect={() => setMode('natural')}
          />
          <ModeCard
            emoji="🦸"
            title={t('mode.character.title', lang)}
            desc={t('mode.character.desc', lang)}
            onSelect={() => setMode('character')}
          />
        </div>
      </div>
    );
  }

  // ── Step 2: pick a template for the chosen mode ────────────────────────────
  return (
    <div
      className="screen"
      style={{ flexDirection: 'column', justifyContent: 'flex-start', padding: '24px 24px 20px', gap: 0, background: 'var(--bg)', overflow: 'hidden' }}
    >
      <Header lang={lang} title={t('mode.pickTemplate', lang)} onBack={() => setMode(null)} />

      {templates === null ? (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ width: 48, height: 48, borderRadius: '50%', border: '4px solid var(--accent)', borderTopColor: 'transparent', animation: 'spin .8s linear infinite' }} />
        </div>
      ) : templates.length === 0 ? (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', gap: 12 }}>
          <div style={{ fontSize: '3rem' }}>🗂️</div>
          <p>{t('mode.noTemplates', lang)}</p>
          {/* Natural can still proceed with no template. */}
          {mode === 'natural' && (
            <button className="btn btn-primary" onPointerDown={() => onSelect({ mode, template: null })} style={{ minHeight: 56, padding: '0 40px' }}>
              {t('themes.select', lang)}
            </button>
          )}
        </div>
      ) : (
        <>
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
            {templates.map((bg) => {
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
                  <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '24px 10px 12px', background: 'linear-gradient(transparent, rgba(0,0,0,0.8))', textAlign: 'center' }}>
                    <span style={{ color: '#fff', fontWeight: 700, fontSize: '1rem', textShadow: '0 1px 4px rgba(0,0,0,0.8)' }}>{bg.name}</span>
                  </div>
                  {isSel && (
                    <div style={{ position: 'absolute', top: 10, right: 10, width: 32, height: 32, borderRadius: '50%', background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 8px rgba(0,0,0,0.4)' }}>
                      <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
                        <path d="M4 10l4.5 4.5 7.5-9" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </div>
                  )}
                </motion.button>
              );
            })}
          </div>

          <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 20, flexShrink: 0 }}>
            <button
              className="btn btn-primary"
              disabled={mode === 'character' && !selected}
              onPointerDown={handleConfirm}
              style={{ fontSize: '1.4rem', padding: '0 72px', minHeight: 66, opacity: (mode === 'character' && !selected) ? 0.35 : 1 }}
            >
              {t('themes.select', lang)}
            </button>
          </div>
        </>
      )}
    </div>
  );
}

function Header({ lang, title, onBack }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', marginBottom: 20, flexShrink: 0 }}>
      <button className="btn btn-ghost" onPointerDown={onBack} style={{ minHeight: 48, padding: '0 20px', fontSize: '1rem' }}>
        ← {lang === 'es' ? 'Atrás' : 'Back'}
      </button>
      <h1 style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--text)', textAlign: 'center', flex: 1 }}>{title}</h1>
      <div style={{ width: 90 }} />
    </div>
  );
}

function ModeCard({ emoji, title, desc, onSelect }) {
  return (
    <motion.button
      whileTap={{ scale: 0.97 }}
      whileHover={{ y: -4 }}
      onPointerDown={onSelect}
      className="card"
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 14,
        padding: '40px 28px',
        cursor: 'pointer',
        border: '1px solid var(--border)',
        borderRadius: 24,
        background: 'var(--card-bg)',
        textAlign: 'center',
      }}
    >
      <div style={{ fontSize: '4.5rem', lineHeight: 1 }}>{emoji}</div>
      <div style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--text)' }}>{title}</div>
      <div style={{ fontSize: '1rem', color: 'var(--text-muted)', maxWidth: 240 }}>{desc}</div>
    </motion.button>
  );
}
