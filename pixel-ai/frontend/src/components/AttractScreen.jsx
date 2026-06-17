import { useEffect, useState } from 'react';

const KEYFRAME_ID = 'attract-keyframes-v2';

const KEYFRAMES = `
  @keyframes attract-sky {
    0%   { background-position: 0% 50%; }
    50%  { background-position: 100% 50%; }
    100% { background-position: 0% 50%; }
  }

  @keyframes attract-float {
    0%   { transform: translateY(0px); }
    50%  { transform: translateY(-10px); }
    100% { transform: translateY(0px); }
  }

  @keyframes attract-ray {
    0%   { transform: translateX(-100%) skewX(-15deg); opacity: 0; }
    10%  { opacity: 0.15; }
    90%  { opacity: 0.15; }
    100% { transform: translateX(200%) skewX(-15deg); opacity: 0; }
  }

  @keyframes attract-pulse-ring {
    0%   { transform: scale(1);   opacity: 0.7; }
    100% { transform: scale(1.3); opacity: 0; }
  }

  @keyframes attract-particle {
    0%   { transform: translateY(0) translateX(0) scale(1);   opacity: 0; }
    10%  { opacity: 1; }
    90%  { opacity: 0.6; }
    100% { transform: translateY(-110vh) translateX(var(--dx)) scale(0.4); opacity: 0; }
  }
`;

/* Six particles — alternating the two blue tones */
const PARTICLES = [
  { left: '8%',  size: 10, duration: 14, delay: 0,   dx: '20px',  color: 'rgba(74,143,196,0.6)' },
  { left: '22%', size: 7,  duration: 11, delay: 2.5, dx: '-15px', color: 'rgba(105,179,231,0.5)' },
  { left: '43%', size: 12, duration: 16, delay: 1,   dx: '10px',  color: 'rgba(74,143,196,0.6)' },
  { left: '60%', size: 8,  duration: 13, delay: 3.5, dx: '-25px', color: 'rgba(105,179,231,0.5)' },
  { left: '75%', size: 9,  duration: 15, delay: 0.8, dx: '18px',  color: 'rgba(74,143,196,0.6)' },
  { left: '90%', size: 6,  duration: 12, delay: 4.2, dx: '-10px', color: 'rgba(105,179,231,0.5)' },
];

export default function AttractScreen({ onStart, eventName, lang = 'en' }) {
  const [rayActive, setRayActive] = useState(false);

  /* Inject keyframes once */
  useEffect(() => {
    if (!document.getElementById(KEYFRAME_ID)) {
      const style = document.createElement('style');
      style.id = KEYFRAME_ID;
      style.textContent = KEYFRAMES;
      document.head.appendChild(style);
    }
  }, []);

  /* Light-ray sweep every 6 s */
  useEffect(() => {
    const tick = () => {
      setRayActive(true);
      setTimeout(() => setRayActive(false), 2000);
    };
    tick(); // fire once immediately on mount
    const id = setInterval(tick, 6000);
    return () => clearInterval(id);
  }, []);

  const label =
    lang === 'es' ? 'Toca para Comenzar 📸' : 'Tap to Start 📸';

  return (
    <div
      onClick={onStart}
      style={{
        position: 'fixed',
        inset: 0,
        cursor: 'pointer',
        /* Animated gradient: dark navy → steel blue → sky blue → back */
        background:
          'linear-gradient(135deg, #0a1628, #0c2545, #0f3a6e, #1a5296, #0f3a6e, #0c2545, #0a1628)',
        backgroundSize: '600% 600%',
        animation: 'attract-sky 10s ease infinite',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        userSelect: 'none',
        overflow: 'hidden',
      }}
    >
      {/* ── Light-ray sweep ── */}
      {rayActive && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            pointerEvents: 'none',
            zIndex: 1,
            /* wide diagonal stripe */
            background:
              'linear-gradient(105deg, transparent 30%, rgba(255,255,255,0.18) 50%, transparent 70%)',
            animation: 'attract-ray 2s ease-in-out forwards',
          }}
        />
      )}

      {/* ── Floating light particles ── */}
      {PARTICLES.map((p, i) => (
        <div
          key={i}
          style={{
            position: 'absolute',
            bottom: '-20px',
            left: p.left,
            width: p.size,
            height: p.size,
            borderRadius: '50%',
            background: p.color,
            boxShadow: `0 0 ${p.size * 2}px ${p.color}`,
            '--dx': p.dx,
            animation: `attract-particle ${p.duration}s ease-in ${p.delay}s infinite`,
            pointerEvents: 'none',
            zIndex: 2,
          }}
        />
      ))}

      {/* ── Content stack ── */}
      <div
        style={{
          position: 'relative',
          zIndex: 10,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '2rem',
        }}
      >
        {/* Logo block */}
        <div
          style={{
            animation: 'attract-float 4s ease-in-out infinite',
            textAlign: 'center',
            lineHeight: 1.1,
          }}
        >
          {/* Lightning bolt icon */}
          <div style={{ fontSize: '3.5rem', marginBottom: '0.4rem' }}>⚡</div>

          {/* Wordmark */}
          <div
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 'clamp(2.5rem, 9vw, 4.5rem)',
              fontWeight: 900,
              background:
                'linear-gradient(135deg, #fff 20%, #69b3e7 60%, #4a8fc4 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
              letterSpacing: '0.04em',
            }}
          >
            Flash-it
          </div>

          {/* Sub-brand */}
          <div
            style={{
              color: '#8ab0ce',
              fontSize: 'clamp(0.75rem, 2vw, 0.95rem)',
              fontWeight: 500,
              marginTop: '0.3rem',
              letterSpacing: '0.04em',
            }}
          >
            by ValuConnect Solutions
          </div>
        </div>

        {/* Event name badge (frosted glass pill) */}
        {eventName && (
          <div
            style={{
              background: 'rgba(255,255,255,0.08)',
              border: '1px solid rgba(74,143,196,0.3)',
              backdropFilter: 'blur(12px)',
              WebkitBackdropFilter: 'blur(12px)',
              borderRadius: '50px',
              padding: '0.5rem 1.5rem',
              color: '#c9dff0',
              fontSize: 'clamp(0.85rem, 2.5vw, 1.05rem)',
              fontWeight: 600,
              letterSpacing: '0.03em',
            }}
          >
            {eventName}
          </div>
        )}

        {/* CTA button + pulse ring wrapper */}
        <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
          {/* Pulse ring */}
          <div
            style={{
              position: 'absolute',
              inset: 0,
              borderRadius: '50px',
              border: '2px solid rgba(74,143,196,0.7)',
              animation: 'attract-pulse-ring 2s ease-out infinite',
              pointerEvents: 'none',
            }}
          />

          {/* Button */}
          <div
            style={{
              background: 'linear-gradient(135deg, #4a8fc4, #69b3e7)',
              borderRadius: '50px',
              padding: '1.2rem 3.5rem',
              fontSize: 'clamp(1.2rem, 4vw, 1.6rem)',
              fontWeight: 800,
              color: '#fff',
              boxShadow:
                '0 0 60px rgba(74,143,196,0.6), 0 8px 32px rgba(74,143,196,0.4)',
              letterSpacing: '0.02em',
              whiteSpace: 'nowrap',
            }}
          >
            {label}
          </div>
        </div>
      </div>
    </div>
  );
}
