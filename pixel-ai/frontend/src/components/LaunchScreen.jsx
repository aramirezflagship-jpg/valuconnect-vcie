import { useState, useCallback, useRef, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';

// ---------------------------------------------------------------------------
// Brand palette — steel blue / dark navy
// ---------------------------------------------------------------------------
const C = {
  bg: '#0a1628',
  surface: 'rgba(15, 32, 53, 0.85)',
  accent: '#4a8fc4',
  sky: '#69b3e7',
  muted: '#8ab0ce',
  border: 'rgba(74, 143, 196, 0.2)',
  white: '#ffffff',
  amber: '#f59e0b',
  amberHover: '#d97706',
};

// ---------------------------------------------------------------------------
// Bilingual labels
// ---------------------------------------------------------------------------
const LABELS = {
  en: {
    chooseExperience: 'Choose your experience:',
    fullServiceTitle: 'Flash-it Full Service',
    fullServiceSub: 'We handle everything',
    fullServiceFeatures: [
      'Dedicated event specialist',
      'Custom setup & branding',
      'On-site support options',
      'Invoice & scheduling included',
    ],
    requestFullService: 'Request Full Service →',
    soloTitle: 'Flash-it Solo',
    soloSub: 'You run it yourself',
    soloFeatures: [
      'Instant activation',
      'DIY event setup',
      'All AI themes included',
      'No setup fee',
    ],
    getStarted: 'Get Started →',
    newTo: 'New to Flash-it?',
    signUp: 'Sign up now and get started!',
    tryDemos: 'Or try one of our demos:',
    photoDemoBtn: 'Photo Booth Demo',
    virtualDemoBtn: 'Virtual Booth Demo',
    tryFree: 'Try Flash-it for Free:',
    tryNow: '⚡ Try now / Subscriptions',
    haveEvent: 'Already set up your Event?',
    scanQr: '📷 SCAN EVENT QR',
    loginLink: 'Log In >',
    eventMgr: 'Go to Event Manager >',
    tutorials: 'View Tutorials',
    needHelp: 'Need More Help?',
    terms: 'Terms',
    privacy: 'Privacy',
    enterCode: 'Enter Event Code',
    enterCodePlaceholder: 'e.g. wedding2025',
    goBtn: 'Go →',
    cancelBtn: 'Cancel',
    scannerHint: 'Scan a QR code with a hardware scanner, or type code above',
  },
  es: {
    chooseExperience: 'Elige tu experiencia:',
    fullServiceTitle: 'Flash-it Servicio Completo',
    fullServiceSub: 'Nosotros manejamos todo',
    fullServiceFeatures: [
      'Especialista de evento dedicado',
      'Configuración y branding personalizado',
      'Opciones de soporte en sitio',
      'Factura y agenda incluidas',
    ],
    requestFullService: 'Solicitar Servicio →',
    soloTitle: 'Flash-it Solo',
    soloSub: 'Tú lo manejas',
    soloFeatures: [
      'Activación instantánea',
      'Configuración de evento DIY',
      'Todos los temas AI incluidos',
      'Sin costo de instalación',
    ],
    getStarted: 'Comenzar →',
    newTo: '¿Nuevo en Flash-it?',
    signUp: '¡Regístrate ahora y comienza!',
    tryDemos: 'O prueba uno de nuestros demos:',
    photoDemoBtn: 'Demo Photo Booth',
    virtualDemoBtn: 'Demo Virtual Booth',
    tryFree: 'Prueba Flash-it Gratis:',
    tryNow: '⚡ Prueba ahora / Suscripciones',
    haveEvent: '¿Ya configuraste tu Evento?',
    scanQr: '📷 ESCANEAR QR',
    loginLink: 'Iniciar sesión >',
    eventMgr: 'Ir al Administrador >',
    tutorials: 'Ver tutoriales',
    needHelp: '¿Necesitas más ayuda?',
    terms: 'Términos',
    privacy: 'Privacidad',
    enterCode: 'Código del Evento',
    enterCodePlaceholder: 'ej. boda2025',
    goBtn: 'Ir →',
    cancelBtn: 'Cancelar',
    scannerHint: 'Escanea el código QR con un lector, o escribe el código arriba',
  },
};

// ---------------------------------------------------------------------------
// Floating orbs background — subtle blue/sky tones
// ---------------------------------------------------------------------------
const orbs = [
  { w: 380, h: 380, top: '-8%', left: '-6%', color: 'rgba(74,143,196,0.10)', dur: '18s', delay: '0s' },
  { w: 280, h: 280, top: '55%', left: '70%', color: 'rgba(105,179,231,0.08)', dur: '24s', delay: '-6s' },
  { w: 220, h: 220, top: '30%', left: '45%', color: 'rgba(74,143,196,0.06)', dur: '20s', delay: '-10s' },
  { w: 160, h: 160, top: '75%', left: '10%', color: 'rgba(105,179,231,0.07)', dur: '16s', delay: '-3s' },
  { w: 300, h: 300, top: '5%', left: '75%', color: 'rgba(74,143,196,0.07)', dur: '22s', delay: '-14s' },
];

function FloatingOrbs() {
  return (
    <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none', zIndex: 0 }}>
      {orbs.map((o, i) => (
        <div
          key={i}
          style={{
            position: 'absolute',
            width: o.w,
            height: o.h,
            top: o.top,
            left: o.left,
            borderRadius: '50%',
            background: o.color,
            filter: 'blur(60px)',
            animation: `orbFloat ${o.dur} ease-in-out infinite alternate`,
            animationDelay: o.delay,
          }}
        />
      ))}
      <style>{`
        @keyframes orbFloat {
          from { transform: translate(0, 0) scale(1); }
          to   { transform: translate(18px, 22px) scale(1.06); }
        }
        @keyframes bgCycle {
          0%   { background-position: 0% 50%; }
          50%  { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
      `}</style>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Reusable hover button
// ---------------------------------------------------------------------------
function HoverBtn({ children, onClick, style = {}, hoverStyle = {} }) {
  const [hovered, setHovered] = useState(false);
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        cursor: 'pointer',
        border: 'none',
        outline: 'none',
        transition: 'all 0.2s ease',
        ...style,
        ...(hovered ? hoverStyle : {}),
      }}
    >
      {children}
    </button>
  );
}

// ---------------------------------------------------------------------------
// Service path card — used in the two-column selector
// ---------------------------------------------------------------------------
function ServicePathCard({ title, subtitle, features, ctaLabel, onClick, accentColor, glowColor, badge, badgeColor, delay }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay, ease: 'easeOut' }}
      style={{
        flex: '1 1 140px',
        background: 'rgba(10,22,40,0.6)',
        border: `1.5px solid ${accentColor}`,
        borderRadius: 14,
        padding: '18px 16px',
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
        boxShadow: `0 0 18px ${glowColor}`,
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Badge */}
      <div
        style={{
          position: 'absolute',
          top: 10,
          right: 10,
          background: `${accentColor}22`,
          border: `1px solid ${accentColor}`,
          borderRadius: 999,
          padding: '2px 8px',
          fontSize: 9,
          fontWeight: 800,
          letterSpacing: 1,
          color: accentColor,
        }}
      >
        {badge}
      </div>

      {/* Title */}
      <div style={{ fontSize: 14, fontWeight: 800, color: C.white, lineHeight: 1.2, paddingRight: 60 }}>
        {title}
      </div>

      {/* Subtitle */}
      <div style={{ fontSize: 12, color: accentColor, fontWeight: 600 }}>{subtitle}</div>

      {/* Features */}
      <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 5 }}>
        {features.map((f, i) => (
          <li key={i} style={{ fontSize: 11.5, color: C.muted, display: 'flex', alignItems: 'flex-start', gap: 5 }}>
            <span style={{ color: accentColor, fontWeight: 700, flexShrink: 0, marginTop: 1 }}>✓</span>
            {f}
          </li>
        ))}
      </ul>

      {/* CTA button */}
      <HoverBtn
        onClick={onClick}
        style={{
          marginTop: 4,
          padding: '9px 12px',
          borderRadius: 8,
          background: `linear-gradient(135deg, ${accentColor}, ${accentColor}bb)`,
          color: C.white,
          fontWeight: 700,
          fontSize: 12,
          letterSpacing: 0.2,
          boxShadow: `0 3px 12px ${glowColor}`,
        }}
        hoverStyle={{
          filter: 'brightness(1.12)',
          transform: 'translateY(-1px)',
          boxShadow: `0 6px 18px ${glowColor}`,
        }}
      >
        {ctaLabel}
      </HoverBtn>
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// QR / Code modal
// ---------------------------------------------------------------------------
function QRModal({ labels, onClose }) {
  const navigate = useNavigate();
  const [code, setCode] = useState('');
  const inputRef = useRef(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleGo = useCallback(() => {
    const trimmed = code.trim();
    if (trimmed) navigate(`/e/${trimmed}`);
  }, [code, navigate]);

  const handleKey = useCallback(
    (e) => {
      if (e.key === 'Enter') handleGo();
      if (e.key === 'Escape') onClose();
    },
    [handleGo, onClose],
  );

  return (
    <motion.div
      key="qr-backdrop"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(5, 12, 25, 0.82)',
        backdropFilter: 'blur(6px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 200,
      }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.88, y: 24 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.88, y: 24 }}
        transition={{ type: 'spring', stiffness: 320, damping: 28 }}
        style={{
          background: C.surface,
          border: `1px solid ${C.border}`,
          borderRadius: 20,
          padding: '40px 36px',
          width: 380,
          maxWidth: '92vw',
          backdropFilter: 'blur(20px)',
          boxShadow: `0 24px 64px rgba(0,0,0,0.55), 0 0 0 1px rgba(74,143,196,0.15)`,
          textAlign: 'center',
        }}
      >
        {/* icon */}
        <div style={{ fontSize: 40, marginBottom: 10 }}>📷</div>

        {/* heading */}
        <div style={{ fontSize: 22, fontWeight: 700, color: C.white, marginBottom: 6 }}>
          {labels.enterCode}
        </div>

        {/* input */}
        <input
          ref={inputRef}
          value={code}
          onChange={(e) => setCode(e.target.value)}
          onKeyDown={handleKey}
          placeholder={labels.enterCodePlaceholder}
          style={{
            width: '100%',
            boxSizing: 'border-box',
            marginTop: 18,
            padding: '13px 16px',
            borderRadius: 10,
            border: `1.5px solid ${C.border}`,
            background: 'rgba(10, 22, 40, 0.7)',
            color: C.white,
            fontSize: 16,
            outline: 'none',
            letterSpacing: 1,
          }}
        />

        {/* scanner hint */}
        <div style={{ fontSize: 12, color: C.muted, marginTop: 10, lineHeight: 1.5 }}>
          {labels.scannerHint}
        </div>

        {/* actions */}
        <div style={{ display: 'flex', gap: 12, marginTop: 22 }}>
          <HoverBtn
            onClick={handleGo}
            style={{
              flex: 1,
              padding: '12px 0',
              borderRadius: 10,
              background: `linear-gradient(135deg, ${C.accent}, ${C.sky})`,
              color: C.white,
              fontWeight: 700,
              fontSize: 16,
            }}
            hoverStyle={{ filter: 'brightness(1.12)', transform: 'translateY(-1px)' }}
          >
            {labels.goBtn}
          </HoverBtn>
          <button
            onClick={onClose}
            style={{
              flex: 0,
              padding: '12px 20px',
              borderRadius: 10,
              background: 'transparent',
              border: `1.5px solid ${C.border}`,
              color: C.muted,
              fontSize: 15,
              cursor: 'pointer',
              transition: 'all 0.2s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = C.accent;
              e.currentTarget.style.color = C.white;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = C.border;
              e.currentTarget.style.color = C.muted;
            }}
          >
            {labels.cancelBtn}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// Main LaunchScreen
// ---------------------------------------------------------------------------
export default function LaunchScreen() {
  const navigate = useNavigate();
  const [lang, setLang] = useState(() => localStorage.getItem('flash_it_lang') || 'en');
  const [showQR, setShowQR] = useState(false);

  const L = LABELS[lang];

  const switchLang = useCallback((l) => {
    setLang(l);
    localStorage.setItem('flash_it_lang', l);
  }, []);

  // Fade-up stagger helpers
  const fadeUp = (delay = 0) => ({
    initial: { opacity: 0, y: 22 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.5, delay, ease: 'easeOut' },
  });

  return (
    <>
      {/* ------------------------------------------------------------------ */}
      {/* Root wrapper — animated gradient background                         */}
      {/* ------------------------------------------------------------------ */}
      <div
        style={{
          minHeight: '100vh',
          width: '100%',
          background: `linear-gradient(135deg, #0a1628 0%, #0d2040 33%, #0f3060 66%, #0a1628 100%)`,
          backgroundSize: '400% 400%',
          animation: 'bgCycle 12s ease infinite',
          position: 'relative',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'flex-start',
          fontFamily: "'Inter', 'Segoe UI', system-ui, sans-serif",
          overflowX: 'hidden',
          overflowY: 'auto',
          paddingTop: 'clamp(1rem, 4vh, 3rem)',
          paddingBottom: 'clamp(1.5rem, 5vh, 3rem)',
        }}
      >
        <FloatingOrbs />

        {/* ---------------------------------------------------------------- */}
        {/* Language toggle — top-right                                       */}
        {/* ---------------------------------------------------------------- */}
        <motion.div
          {...fadeUp(0.1)}
          style={{
            position: 'absolute',
            top: 20,
            right: 24,
            zIndex: 10,
            display: 'flex',
            gap: 2,
            background: 'rgba(15,32,53,0.7)',
            border: `1px solid ${C.border}`,
            borderRadius: 999,
            padding: 3,
            backdropFilter: 'blur(10px)',
          }}
        >
          {['en', 'es'].map((l) => (
            <button
              key={l}
              onClick={() => switchLang(l)}
              style={{
                padding: '5px 14px',
                borderRadius: 999,
                border: 'none',
                cursor: 'pointer',
                fontSize: 13,
                fontWeight: 600,
                letterSpacing: 0.5,
                transition: 'all 0.2s ease',
                background: lang === l ? `linear-gradient(135deg, ${C.accent}, ${C.sky})` : 'transparent',
                color: lang === l ? C.white : C.muted,
              }}
            >
              {l.toUpperCase()}
            </button>
          ))}
        </motion.div>

        {/* ---------------------------------------------------------------- */}
        {/* Card container                                                     */}
        {/* ---------------------------------------------------------------- */}
        <motion.div
          initial={{ opacity: 0, y: 32 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
          style={{
            position: 'relative',
            zIndex: 1,
            width: '100%',
            maxWidth: 960,
            margin: '0 auto',
            padding: '0 20px',
            paddingTop: 56,
            paddingBottom: 24,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 0,
          }}
        >
          {/* -------------------------------------------------------------- */}
          {/* LOGO                                                             */}
          {/* -------------------------------------------------------------- */}
          <motion.div {...fadeUp(0.15)} style={{ textAlign: 'center', marginBottom: 32 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
              <span style={{ fontSize: 38 }}>⚡</span>
              <span
                style={{
                  fontSize: 38,
                  fontWeight: 800,
                  background: `linear-gradient(135deg, ${C.sky}, ${C.accent})`,
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                  letterSpacing: -0.5,
                }}
              >
                Flash-it
              </span>
            </div>
            <div style={{ fontSize: 13, color: C.muted, marginTop: 4, letterSpacing: 0.5 }}>
              by ValuConnect Solutions
            </div>
          </motion.div>

          {/* -------------------------------------------------------------- */}
          {/* Two-column layout                                                */}
          {/* -------------------------------------------------------------- */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'row',
              gap: 0,
              width: '100%',
              flexWrap: 'wrap',
            }}
          >
            {/* ============================================================ */}
            {/* LEFT COLUMN — Service path selector + demos + CTA             */}
            {/* ============================================================ */}
            <motion.div
              {...fadeUp(0.25)}
              style={{
                flex: '1 1 340px',
                background: C.surface,
                border: `1px solid ${C.border}`,
                borderRight: 'none',
                borderRadius: '20px 0 0 20px',
                padding: '36px 32px',
                backdropFilter: 'blur(20px)',
                display: 'flex',
                flexDirection: 'column',
                gap: 20,
              }}
            >
              {/* Service selector heading */}
              <h2
                style={{
                  margin: 0,
                  fontSize: 14,
                  fontWeight: 600,
                  color: C.muted,
                  textTransform: 'uppercase',
                  letterSpacing: 1.2,
                  paddingBottom: 14,
                  borderBottom: `1px solid ${C.border}`,
                }}
              >
                {L.chooseExperience}
              </h2>

              {/* Two service path cards */}
              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                {/* Card 1 — Full Service (amber) */}
                <ServicePathCard
                  title={L.fullServiceTitle}
                  subtitle={L.fullServiceSub}
                  features={L.fullServiceFeatures}
                  ctaLabel={L.requestFullService}
                  onClick={() => navigate('/contact')}
                  accentColor={C.amber}
                  glowColor="rgba(245,158,11,0.35)"
                  badge="MANAGED"
                  badgeColor={C.amber}
                  delay={0.3}
                />
                {/* Card 2 — Solo / Self-service (blue) */}
                <ServicePathCard
                  title={L.soloTitle}
                  subtitle={L.soloSub}
                  features={L.soloFeatures}
                  ctaLabel={L.getStarted}
                  onClick={() => navigate('/register')}
                  accentColor={C.accent}
                  glowColor="rgba(74,143,196,0.35)"
                  badge="SELF-SERVICE"
                  badgeColor={C.accent}
                  delay={0.38}
                />
              </div>

              {/* Divider */}
              <div style={{ height: 1, background: C.border, margin: '0' }} />

              {/* Demo label */}
              <div style={{ fontSize: 13, color: C.muted, marginBottom: -8 }}>{L.tryDemos}</div>

              {/* Demo buttons row */}
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                <HoverBtn
                  onClick={() => navigate('/e/demo')}
                  style={{
                    flex: '1 1 130px',
                    padding: '11px 14px',
                    borderRadius: 10,
                    background: 'rgba(74,143,196,0.12)',
                    border: `1px solid ${C.border}`,
                    color: C.sky,
                    fontWeight: 600,
                    fontSize: 13,
                  }}
                  hoverStyle={{
                    background: 'rgba(74,143,196,0.22)',
                    borderColor: C.accent,
                    transform: 'translateY(-1px)',
                  }}
                >
                  📸 {L.photoDemoBtn}
                </HoverBtn>
                <HoverBtn
                  onClick={() => navigate('/v/demo')}
                  style={{
                    flex: '1 1 130px',
                    padding: '11px 14px',
                    borderRadius: 10,
                    background: 'rgba(74,143,196,0.12)',
                    border: `1px solid ${C.border}`,
                    color: C.sky,
                    fontWeight: 600,
                    fontSize: 13,
                  }}
                  hoverStyle={{
                    background: 'rgba(74,143,196,0.22)',
                    borderColor: C.accent,
                    transform: 'translateY(-1px)',
                  }}
                >
                  🖥 {L.virtualDemoBtn}
                </HoverBtn>
              </div>

              {/* Divider */}
              <div style={{ height: 1, background: C.border, margin: '0' }} />

              {/* Try Free label */}
              <div style={{ fontSize: 13, color: C.muted, marginBottom: -8 }}>{L.tryFree}</div>

              {/* Amber CTA */}
              <HoverBtn
                onClick={() => navigate('/checkout')}
                style={{
                  padding: '14px 20px',
                  borderRadius: 12,
                  background: `linear-gradient(135deg, ${C.amber}, #e68a00)`,
                  color: C.white,
                  fontWeight: 700,
                  fontSize: 15,
                  boxShadow: `0 4px 20px rgba(245,158,11,0.35)`,
                  letterSpacing: 0.2,
                }}
                hoverStyle={{
                  filter: 'brightness(1.1)',
                  transform: 'translateY(-2px)',
                  boxShadow: `0 8px 28px rgba(245,158,11,0.45)`,
                }}
              >
                {L.tryNow}
              </HoverBtn>
            </motion.div>

            {/* Vertical divider (visible on wider screens, hidden when wrapped) */}
            <div
              style={{
                width: 1,
                background: C.border,
                flexShrink: 0,
              }}
            />

            {/* ============================================================ */}
            {/* RIGHT COLUMN — Already set up?                                */}
            {/* ============================================================ */}
            <motion.div
              {...fadeUp(0.35)}
              style={{
                flex: '1 1 280px',
                background: C.surface,
                border: `1px solid ${C.border}`,
                borderLeft: 'none',
                borderRadius: '0 20px 20px 0',
                padding: '36px 32px',
                backdropFilter: 'blur(20px)',
                display: 'flex',
                flexDirection: 'column',
                gap: 20,
              }}
            >
              {/* Heading */}
              <h2
                style={{
                  margin: 0,
                  fontSize: 22,
                  fontWeight: 700,
                  color: C.white,
                  paddingBottom: 16,
                  borderBottom: `1px solid ${C.border}`,
                }}
              >
                {L.haveEvent}
              </h2>

              {/* Scan QR button */}
              <HoverBtn
                onClick={() => setShowQR(true)}
                style={{
                  padding: '18px 20px',
                  borderRadius: 14,
                  background: `linear-gradient(135deg, ${C.accent}, ${C.sky})`,
                  color: C.white,
                  fontWeight: 800,
                  fontSize: 18,
                  letterSpacing: 1.5,
                  boxShadow: `0 6px 24px rgba(74,143,196,0.4)`,
                  textTransform: 'uppercase',
                }}
                hoverStyle={{
                  filter: 'brightness(1.1)',
                  transform: 'translateY(-2px)',
                  boxShadow: `0 10px 32px rgba(74,143,196,0.55)`,
                }}
              >
                {L.scanQr}
              </HoverBtn>

              {/* Links */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 4 }}>
                <Link
                  to="/login"
                  style={{
                    color: C.sky,
                    textDecoration: 'none',
                    fontWeight: 600,
                    fontSize: 15,
                    padding: '10px 0',
                    borderBottom: `1px solid ${C.border}`,
                    transition: 'color 0.2s',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = C.white)}
                  onMouseLeave={(e) => (e.currentTarget.style.color = C.sky)}
                >
                  {L.loginLink}
                </Link>
                <Link
                  to="/dashboard"
                  style={{
                    color: C.sky,
                    textDecoration: 'none',
                    fontWeight: 600,
                    fontSize: 15,
                    padding: '10px 0',
                    transition: 'color 0.2s',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = C.white)}
                  onMouseLeave={(e) => (e.currentTarget.style.color = C.sky)}
                >
                  {L.eventMgr}
                </Link>
              </div>
            </motion.div>
          </div>

          {/* -------------------------------------------------------------- */}
          {/* Bottom strip                                                     */}
          {/* -------------------------------------------------------------- */}
          <motion.div
            {...fadeUp(0.45)}
            style={{
              marginTop: 24,
              display: 'flex',
              gap: 28,
              alignItems: 'center',
              justifyContent: 'center',
              flexWrap: 'wrap',
            }}
          >
            <a
              href="#tutorials"
              style={{
                color: C.muted,
                textDecoration: 'none',
                fontSize: 13,
                fontWeight: 500,
                transition: 'color 0.2s',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.color = C.sky)}
              onMouseLeave={(e) => (e.currentTarget.style.color = C.muted)}
            >
              {L.tutorials}
            </a>
            <span style={{ color: C.border, fontSize: 16 }}>|</span>
            <a
              href="#help"
              style={{
                color: C.muted,
                textDecoration: 'none',
                fontSize: 13,
                fontWeight: 500,
                transition: 'color 0.2s',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.color = C.sky)}
              onMouseLeave={(e) => (e.currentTarget.style.color = C.muted)}
            >
              {L.needHelp}
            </a>
            <span style={{ color: C.border, fontSize: 16 }}>|</span>
            <Link
              to="/terms"
              style={{
                color: C.muted,
                textDecoration: 'none',
                fontSize: 13,
                fontWeight: 500,
                transition: 'color 0.2s',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.color = C.sky)}
              onMouseLeave={(e) => (e.currentTarget.style.color = C.muted)}
            >
              {L.terms}
            </Link>
            <span style={{ color: C.border, fontSize: 16 }}>|</span>
            <Link
              to="/privacy"
              style={{
                color: C.muted,
                textDecoration: 'none',
                fontSize: 13,
                fontWeight: 500,
                transition: 'color 0.2s',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.color = C.sky)}
              onMouseLeave={(e) => (e.currentTarget.style.color = C.muted)}
            >
              {L.privacy}
            </Link>
          </motion.div>
        </motion.div>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* QR Modal (rendered outside the scroll container via AnimatePresence) */}
      {/* ------------------------------------------------------------------ */}
      <AnimatePresence>
        {showQR && <QRModal labels={L} onClose={() => setShowQR(false)} />}
      </AnimatePresence>
    </>
  );
}
