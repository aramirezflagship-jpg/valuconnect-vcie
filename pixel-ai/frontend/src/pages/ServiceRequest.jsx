import { useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';

// ---------------------------------------------------------------------------
// Brand palette — matches LaunchScreen / Login
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
};

// ---------------------------------------------------------------------------
// Floating orbs background
// ---------------------------------------------------------------------------
const orbs = [
  { w: 380, h: 380, top: '-8%', left: '-6%', color: 'rgba(74,143,196,0.10)', dur: '18s', delay: '0s' },
  { w: 280, h: 280, top: '55%', left: '70%', color: 'rgba(105,179,231,0.08)', dur: '24s', delay: '-6s' },
  { w: 220, h: 220, top: '30%', left: '45%', color: 'rgba(74,143,196,0.06)', dur: '20s', delay: '-10s' },
  { w: 160, h: 160, top: '75%', left: '10%', color: 'rgba(105,179,231,0.07)', dur: '16s', delay: '-3s' },
  { w: 300, h: 300, top: '5%', left: '75%', color: 'rgba(74,143,196,0.07)', dur: '22s', delay: '-14s' },
  // amber accent orb for full-service page feel
  { w: 200, h: 200, top: '60%', left: '30%', color: 'rgba(245,158,11,0.05)', dur: '26s', delay: '-8s' },
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
// Bilingual labels
// ---------------------------------------------------------------------------
const LABELS = {
  en: {
    pageTitle: 'Full Service Request',
    pageSubtitle: 'Tell us about your event and we\'ll handle everything.',
    fullName: 'Full Name',
    fullNamePlaceholder: 'Jane Smith',
    email: 'Email',
    emailPlaceholder: 'you@example.com',
    phone: 'Phone',
    phonePlaceholder: '+1 (555) 000-0000',
    eventType: 'Event Type',
    eventTypePlaceholder: 'Select event type',
    eventTypeOptions: [
      { value: 'wedding', label: 'Wedding / Boda' },
      { value: 'quinceanera', label: 'Quinceañera / XV' },
      { value: 'corporate', label: 'Corporate / Corporativo' },
      { value: 'birthday', label: 'Birthday / Cumpleaños' },
      { value: 'other', label: 'Other / Otro' },
    ],
    estimatedGuests: 'Estimated Guests',
    estimatedGuestsPlaceholder: '100',
    eventDate: 'Event Date',
    city: 'City / Location',
    cityPlaceholder: 'Miami, FL',
    message: 'Message / Special Requests',
    messagePlaceholder: 'Tell us anything special about your event, theme, or requirements…',
    submitBtn: 'Submit Request',
    submitting: 'Sending…',
    successTitle: 'Request Received!',
    successMsg: 'We\'ll contact you within 24 hours!',
    backHome: '← Back to Home',
    required: 'Required field',
    errorGeneric: 'Something went wrong. Please try again.',
  },
  es: {
    pageTitle: 'Solicitud de Servicio Completo',
    pageSubtitle: 'Cuéntanos sobre tu evento y nosotros nos encargamos de todo.',
    fullName: 'Nombre Completo',
    fullNamePlaceholder: 'Juan García',
    email: 'Correo Electrónico',
    emailPlaceholder: 'tu@ejemplo.com',
    phone: 'Teléfono',
    phonePlaceholder: '+1 (555) 000-0000',
    eventType: 'Tipo de Evento',
    eventTypePlaceholder: 'Seleccionar tipo de evento',
    eventTypeOptions: [
      { value: 'wedding', label: 'Wedding / Boda' },
      { value: 'quinceanera', label: 'Quinceañera / XV' },
      { value: 'corporate', label: 'Corporate / Corporativo' },
      { value: 'birthday', label: 'Birthday / Cumpleaños' },
      { value: 'other', label: 'Other / Otro' },
    ],
    estimatedGuests: 'Invitados Estimados',
    estimatedGuestsPlaceholder: '100',
    eventDate: 'Fecha del Evento',
    city: 'Ciudad / Lugar',
    cityPlaceholder: 'Miami, FL',
    message: 'Mensaje / Solicitudes Especiales',
    messagePlaceholder: 'Cuéntanos algo especial sobre tu evento, tema o requisitos…',
    submitBtn: 'Enviar Solicitud',
    submitting: 'Enviando…',
    successTitle: '¡Solicitud Recibida!',
    successMsg: '¡Te contactaremos en 24 horas!',
    backHome: '← Volver al Inicio',
    required: 'Campo requerido',
    errorGeneric: 'Algo salió mal. Por favor intenta de nuevo.',
  },
};

// ---------------------------------------------------------------------------
// Field sub-component
// ---------------------------------------------------------------------------
function Field({ id, label, required, children }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <label
        htmlFor={id}
        style={{ fontSize: 12, color: C.muted, fontWeight: 600, letterSpacing: 0.3 }}
      >
        {label}
        {required && <span style={{ color: C.amber, marginLeft: 3 }}>*</span>}
      </label>
      {children}
    </div>
  );
}

const inputStyle = {
  background: 'rgba(10, 22, 40, 0.7)',
  border: `1.5px solid ${C.border}`,
  borderRadius: 10,
  padding: '11px 14px',
  color: C.white,
  fontSize: 15,
  outline: 'none',
  width: '100%',
  boxSizing: 'border-box',
  transition: 'border-color 0.2s ease',
  fontFamily: "'Inter', 'Segoe UI', system-ui, sans-serif",
};

// ---------------------------------------------------------------------------
// Main ServiceRequest page
// ---------------------------------------------------------------------------
export default function ServiceRequest() {
  const [lang, setLang] = useState(() => localStorage.getItem('flash_it_lang') || 'en');
  const L = LABELS[lang];

  const switchLang = useCallback((l) => {
    setLang(l);
    localStorage.setItem('flash_it_lang', l);
  }, []);

  const [form, setForm] = useState({
    fullName: '',
    email: '',
    phone: '',
    eventType: '',
    estimatedGuests: '',
    eventDate: '',
    city: '',
    message: '',
  });

  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const set = (field) => (e) => setForm((prev) => ({ ...prev, [field]: e.target.value }));

  const focusStyle = (e) => { e.target.style.borderColor = C.amber; };
  const blurStyle = (e) => { e.target.style.borderColor = C.border; };

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');

    if (!form.fullName.trim() || !form.email.trim()) {
      setError(L.required);
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, lang }),
      });
      if (res.ok || res.status === 200 || res.status === 201) {
        setSuccess(true);
      } else {
        const body = await res.json().catch(() => ({}));
        setError(body?.message || L.errorGeneric);
      }
    } catch {
      setError(L.errorGeneric);
    } finally {
      setSubmitting(false);
    }
  }

  return (
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
        overflow: 'hidden auto',
        padding: '40px 20px 60px',
        boxSizing: 'border-box',
      }}
    >
      <FloatingOrbs />

      {/* Language toggle */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.1 }}
        style={{
          position: 'fixed',
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

      {/* Content wrapper */}
      <motion.div
        initial={{ opacity: 0, y: 32 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.55, ease: 'easeOut' }}
        style={{
          position: 'relative',
          zIndex: 1,
          width: '100%',
          maxWidth: 560,
        }}
      >
        {/* Logo + heading */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, marginBottom: 6 }}>
            <span style={{ fontSize: 32 }}>⚡</span>
            <span
              style={{
                fontSize: 32,
                fontWeight: 800,
                fontFamily: "'Cinzel', serif",
                background: `linear-gradient(135deg, ${C.amber}, #e68a00)`,
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
                letterSpacing: 1,
              }}
            >
              Flash-it
            </span>
          </div>
          <h1
            style={{
              margin: 0,
              fontSize: 22,
              fontWeight: 700,
              color: C.white,
              marginBottom: 6,
            }}
          >
            {L.pageTitle}
          </h1>
          <p style={{ margin: 0, fontSize: 13, color: C.muted }}>{L.pageSubtitle}</p>
        </div>

        {/* Card */}
        <div
          style={{
            background: C.surface,
            border: `1.5px solid ${C.amber}44`,
            borderRadius: 20,
            padding: '36px 32px',
            backdropFilter: 'blur(20px)',
            boxShadow: `0 8px 40px rgba(0,0,0,0.4), 0 0 0 1px rgba(245,158,11,0.12)`,
          }}
        >
          <AnimatePresence mode="wait">
            {success ? (
              /* Success state */
              <motion.div
                key="success"
                initial={{ opacity: 0, scale: 0.92 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.35 }}
                style={{ textAlign: 'center', padding: '20px 0' }}
              >
                <div style={{ fontSize: 52, marginBottom: 16 }}>🎉</div>
                <h2 style={{ margin: '0 0 10px', fontSize: 24, fontWeight: 800, color: C.white }}>
                  {L.successTitle}
                </h2>
                <p style={{ margin: '0 0 28px', fontSize: 15, color: C.muted, lineHeight: 1.6 }}>
                  {L.successMsg}
                </p>
                <Link
                  to="/"
                  style={{
                    color: C.amber,
                    textDecoration: 'none',
                    fontWeight: 600,
                    fontSize: 14,
                    padding: '10px 24px',
                    border: `1.5px solid ${C.amber}`,
                    borderRadius: 999,
                    transition: 'all 0.2s',
                    display: 'inline-block',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = `${C.amber}22`;
                    e.currentTarget.style.color = C.white;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'transparent';
                    e.currentTarget.style.color = C.amber;
                  }}
                >
                  {L.backHome}
                </Link>
              </motion.div>
            ) : (
              /* Form */
              <motion.form
                key="form"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
                onSubmit={handleSubmit}
                style={{ display: 'flex', flexDirection: 'column', gap: 18 }}
              >
                {/* Row: Full Name + Email */}
                <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
                  <div style={{ flex: '1 1 180px' }}>
                    <Field id="fullName" label={L.fullName} required>
                      <input
                        id="fullName"
                        type="text"
                        required
                        placeholder={L.fullNamePlaceholder}
                        value={form.fullName}
                        onChange={set('fullName')}
                        onFocus={focusStyle}
                        onBlur={blurStyle}
                        style={inputStyle}
                      />
                    </Field>
                  </div>
                  <div style={{ flex: '1 1 180px' }}>
                    <Field id="email" label={L.email} required>
                      <input
                        id="email"
                        type="email"
                        required
                        placeholder={L.emailPlaceholder}
                        value={form.email}
                        onChange={set('email')}
                        onFocus={focusStyle}
                        onBlur={blurStyle}
                        style={inputStyle}
                      />
                    </Field>
                  </div>
                </div>

                {/* Row: Phone + Event Type */}
                <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
                  <div style={{ flex: '1 1 140px' }}>
                    <Field id="phone" label={L.phone}>
                      <input
                        id="phone"
                        type="tel"
                        placeholder={L.phonePlaceholder}
                        value={form.phone}
                        onChange={set('phone')}
                        onFocus={focusStyle}
                        onBlur={blurStyle}
                        style={inputStyle}
                      />
                    </Field>
                  </div>
                  <div style={{ flex: '1 1 160px' }}>
                    <Field id="eventType" label={L.eventType}>
                      <select
                        id="eventType"
                        value={form.eventType}
                        onChange={set('eventType')}
                        onFocus={focusStyle}
                        onBlur={blurStyle}
                        style={{
                          ...inputStyle,
                          cursor: 'pointer',
                          appearance: 'none',
                          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16' fill='%238ab0ce'%3E%3Cpath d='M4 6l4 4 4-4'/%3E%3C/svg%3E")`,
                          backgroundRepeat: 'no-repeat',
                          backgroundPosition: 'right 12px center',
                          backgroundSize: '16px',
                          paddingRight: 36,
                        }}
                      >
                        <option value="" style={{ background: '#0a1628' }}>{L.eventTypePlaceholder}</option>
                        {L.eventTypeOptions.map((o) => (
                          <option key={o.value} value={o.value} style={{ background: '#0a1628' }}>
                            {o.label}
                          </option>
                        ))}
                      </select>
                    </Field>
                  </div>
                </div>

                {/* Row: Guests + Date + City */}
                <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
                  <div style={{ flex: '0 1 110px' }}>
                    <Field id="estimatedGuests" label={L.estimatedGuests}>
                      <input
                        id="estimatedGuests"
                        type="number"
                        min="1"
                        placeholder={L.estimatedGuestsPlaceholder}
                        value={form.estimatedGuests}
                        onChange={set('estimatedGuests')}
                        onFocus={focusStyle}
                        onBlur={blurStyle}
                        style={inputStyle}
                      />
                    </Field>
                  </div>
                  <div style={{ flex: '0 1 150px' }}>
                    <Field id="eventDate" label={L.eventDate}>
                      <input
                        id="eventDate"
                        type="date"
                        value={form.eventDate}
                        onChange={set('eventDate')}
                        onFocus={focusStyle}
                        onBlur={blurStyle}
                        style={{
                          ...inputStyle,
                          colorScheme: 'dark',
                        }}
                      />
                    </Field>
                  </div>
                  <div style={{ flex: '1 1 140px' }}>
                    <Field id="city" label={L.city}>
                      <input
                        id="city"
                        type="text"
                        placeholder={L.cityPlaceholder}
                        value={form.city}
                        onChange={set('city')}
                        onFocus={focusStyle}
                        onBlur={blurStyle}
                        style={inputStyle}
                      />
                    </Field>
                  </div>
                </div>

                {/* Message */}
                <Field id="message" label={L.message}>
                  <textarea
                    id="message"
                    rows={4}
                    placeholder={L.messagePlaceholder}
                    value={form.message}
                    onChange={set('message')}
                    onFocus={focusStyle}
                    onBlur={blurStyle}
                    style={{
                      ...inputStyle,
                      resize: 'vertical',
                      minHeight: 96,
                    }}
                  />
                </Field>

                {/* Error banner */}
                <AnimatePresence>
                  {error && (
                    <motion.p
                      initial={{ opacity: 0, y: -6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -6 }}
                      style={{
                        margin: 0,
                        fontSize: 13,
                        color: '#ef4444',
                        background: 'rgba(239,68,68,0.1)',
                        border: '1px solid rgba(239,68,68,0.3)',
                        borderRadius: 8,
                        padding: '9px 14px',
                      }}
                    >
                      {error}
                    </motion.p>
                  )}
                </AnimatePresence>

                {/* Submit */}
                <button
                  type="submit"
                  disabled={submitting}
                  style={{
                    padding: '14px 20px',
                    borderRadius: 12,
                    border: 'none',
                    background: submitting
                      ? 'rgba(245,158,11,0.5)'
                      : `linear-gradient(135deg, ${C.amber}, #e68a00)`,
                    color: C.white,
                    fontWeight: 700,
                    fontSize: 15,
                    cursor: submitting ? 'not-allowed' : 'pointer',
                    boxShadow: submitting ? 'none' : '0 4px 20px rgba(245,158,11,0.35)',
                    letterSpacing: 0.2,
                    transition: 'all 0.2s ease',
                    width: '100%',
                  }}
                  onMouseEnter={(e) => {
                    if (!submitting) {
                      e.currentTarget.style.filter = 'brightness(1.1)';
                      e.currentTarget.style.transform = 'translateY(-1px)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.filter = 'none';
                    e.currentTarget.style.transform = 'none';
                  }}
                >
                  {submitting ? L.submitting : L.submitBtn}
                </button>

                {/* Back link */}
                <div style={{ textAlign: 'center' }}>
                  <Link
                    to="/"
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
                    {L.backHome}
                  </Link>
                </div>
              </motion.form>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
}
