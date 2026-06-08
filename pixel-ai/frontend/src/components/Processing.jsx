import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { t } from '../utils/i18n.js';

// ─── Processing step messages (bilingual pairs) ───────────────────────────────
const STEPS = [
  { es: 'Quitando fondo...',      en: 'Removing background...' },
  { es: 'Creando tu mundo...',    en: 'AI is creating your world...' },
  { es: 'Últimos retoques...',    en: 'Adding finishing touches...' },
];

const STEP_INTERVAL_MS = 4000;

// ─── Orbiting dots component ──────────────────────────────────────────────────
function OrbitingDots() {
  const DOT_COUNT = 6;
  const RADIUS = 56;

  return (
    <div
      style={{
        position: 'relative',
        width: RADIUS * 2 + 24,
        height: RADIUS * 2 + 24,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {/* Center pulsing circle */}
      <div
        style={{
          width: 48,
          height: 48,
          borderRadius: '50%',
          background: 'var(--accent)',
          animation: 'pulse-scale 1.5s ease-in-out infinite',
          boxShadow: '0 0 30px var(--accent-glow)',
        }}
      />

      {/* Orbiting dots */}
      {Array.from({ length: DOT_COUNT }, (_, i) => {
        const angle = (i / DOT_COUNT) * 360;
        const delay = (i / DOT_COUNT) * -2; // stagger
        return (
          <div
            key={i}
            style={{
              position: 'absolute',
              width: '100%',
              height: '100%',
              animation: `spin 2s linear infinite`,
              animationDelay: `${delay}s`,
              transform: `rotate(${angle}deg)`,
            }}
          >
            <div
              style={{
                position: 'absolute',
                top: 0,
                left: '50%',
                transform: 'translateX(-50%)',
                width: 10 + (i % 2) * 4,
                height: 10 + (i % 2) * 4,
                borderRadius: '50%',
                background: `hsla(${260 + i * 20}, 80%, ${60 + i * 4}%, 0.9)`,
                boxShadow: `0 0 8px hsla(${260 + i * 20}, 80%, 60%, 0.6)`,
              }}
            />
          </div>
        );
      })}

      {/* Outer ring */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          borderRadius: '50%',
          border: '2px solid rgba(124,58,237,0.3)',
          animation: 'spin 8s linear infinite reverse',
        }}
      />
    </div>
  );
}

// ─── Elapsed time counter ─────────────────────────────────────────────────────
function ElapsedTimer() {
  const [elapsed, setElapsed] = useState(0);
  const startRef = useRef(Date.now());

  useEffect(() => {
    const id = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startRef.current) / 1000));
    }, 1000);
    return () => clearInterval(id);
  }, []);

  const minutes = Math.floor(elapsed / 60);
  const seconds = elapsed % 60;
  const formatted = `${minutes}:${String(seconds).padStart(2, '0')}`;

  return (
    <span
      style={{
        fontFamily: 'monospace',
        fontSize: '1.1rem',
        color: 'var(--text-muted)',
        letterSpacing: '0.1em',
      }}
    >
      {formatted}
    </span>
  );
}

export default function Processing({ lang }) {
  const [stepIdx, setStepIdx] = useState(0);
  const [stepVisible, setStepVisible] = useState(true);

  // ─── Cycle through step messages ──────────────────────────────────────────
  useEffect(() => {
    const id = setInterval(() => {
      setStepVisible(false);
      setTimeout(() => {
        setStepIdx((prev) => (prev + 1) % STEPS.length);
        setStepVisible(true);
      }, 400);
    }, STEP_INTERVAL_MS);

    return () => clearInterval(id);
  }, []);

  const currentStep = STEPS[stepIdx];
  const stepText = lang === 'es' ? currentStep.es : currentStep.en;

  return (
    <div
      className="screen"
      style={{
        background: 'var(--bg)',
        gap: 0,
      }}
    >
      {/* Background pulse rings */}
      {[1, 2, 3].map((n) => (
        <div
          key={n}
          style={{
            position: 'absolute',
            width: n * 180,
            height: n * 180,
            borderRadius: '50%',
            border: `1px solid rgba(124,58,237,${0.15 / n})`,
            animation: `pulse-scale ${4 + n * 2}s ease-in-out infinite`,
            animationDelay: `${n * 0.8}s`,
            pointerEvents: 'none',
          }}
        />
      ))}

      {/* ── Orbiting animation ── */}
      <motion.div
        initial={{ opacity: 0, scale: 0.6 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.6, ease: 'backOut' }}
        style={{ marginBottom: 48 }}
      >
        <OrbitingDots />
      </motion.div>

      {/* ── Title ── */}
      <motion.h2
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, duration: 0.5 }}
        style={{
          fontSize: '2.2rem',
          fontWeight: 800,
          color: 'var(--text)',
          textAlign: 'center',
          marginBottom: 16,
        }}
      >
        {t('processing.title', lang)}
      </motion.h2>

      {/* ── Step message (animated cycle) ── */}
      <AnimatePresence mode="wait">
        {stepVisible && (
          <motion.p
            key={stepIdx}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.35 }}
            style={{
              fontSize: '1.3rem',
              color: 'var(--accent-light)',
              fontWeight: 500,
              textAlign: 'center',
              height: 40,
              display: 'flex',
              alignItems: 'center',
            }}
          >
            {stepText}
          </motion.p>
        )}
      </AnimatePresence>

      {/* ── Step progress dots ── */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6 }}
        style={{
          display: 'flex',
          gap: 10,
          marginTop: 32,
          marginBottom: 16,
        }}
      >
        {STEPS.map((_, i) => (
          <div
            key={i}
            style={{
              width: i === stepIdx ? 28 : 10,
              height: 10,
              borderRadius: 5,
              background: i === stepIdx ? 'var(--accent)' : 'rgba(255,255,255,0.2)',
              transition: 'width 0.3s ease, background 0.3s ease',
            }}
          />
        ))}
      </motion.div>

      {/* ── Elapsed timer ── */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.8 }}
        style={{ marginTop: 8 }}
      >
        <ElapsedTimer />
      </motion.div>

      {/* ── Hint text ── */}
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.4 }}
        transition={{ delay: 2 }}
        style={{
          position: 'absolute',
          bottom: 48,
          color: 'var(--text-muted)',
          fontSize: '0.95rem',
          textAlign: 'center',
        }}
      >
        {lang === 'es'
          ? 'Esto puede tomar hasta 30 segundos'
          : 'This may take up to 30 seconds'}
      </motion.p>
    </div>
  );
}
