import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { QRCodeSVG } from 'qrcode.react';
import { t } from '../utils/i18n.js';
import { sendDelivery } from '../utils/api.js';

const AUTO_RESET_SECONDS = 30;

// ─── Country codes ────────────────────────────────────────────────────────────
const COUNTRY_CODES = [
  { code: '+1',  flag: '🇺🇸', label: 'US/CA' },
  { code: '+52', flag: '🇲🇽', label: 'MX' },
  { code: '+34', flag: '🇪🇸', label: 'ES' },
  { code: '+57', flag: '🇨🇴', label: 'CO' },
  { code: '+54', flag: '🇦🇷', label: 'AR' },
  { code: '+56', flag: '🇨🇱', label: 'CL' },
];

// ─── Animated checkmark SVG ───────────────────────────────────────────────────
function Checkmark() {
  return (
    <motion.svg
      width="80"
      height="80"
      viewBox="0 0 80 80"
      fill="none"
      initial={{ scale: 0 }}
      animate={{ scale: 1 }}
      transition={{ duration: 0.4, ease: 'backOut' }}
    >
      <motion.circle
        cx="40"
        cy="40"
        r="36"
        stroke="var(--success)"
        strokeWidth="4"
        strokeLinecap="round"
        fill="none"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 0.5, delay: 0.1 }}
      />
      <motion.path
        d="M24 41l12 12 20-24"
        stroke="var(--success)"
        strokeWidth="4.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 0.4, delay: 0.4 }}
      />
    </motion.svg>
  );
}

// ─── Countdown progress bar ───────────────────────────────────────────────────
function CountdownBar({ seconds, totalSeconds, onComplete }) {
  useEffect(() => {
    if (seconds <= 0) onComplete?.();
  }, [seconds, onComplete]);

  const pct = (seconds / totalSeconds) * 100;

  return (
    <div style={{ width: '100%' }}>
      <div
        style={{
          height: 6,
          borderRadius: 3,
          background: 'rgba(255,255,255,0.1)',
          overflow: 'hidden',
        }}
      >
        <motion.div
          initial={{ width: '100%' }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.9, ease: 'linear' }}
          style={{
            height: '100%',
            borderRadius: 3,
            background: pct > 30
              ? 'linear-gradient(90deg, var(--accent), var(--accent-light))'
              : 'var(--danger)',
          }}
        />
      </div>
    </div>
  );
}

export default function Delivery({ lang, config, photoUrl, onNewPhoto }) {
  const [countryCode, setCountryCode] = useState(lang === 'es' ? '+52' : '+1');
  const [phone, setPhone] = useState('');
  const [sending, setSending] = useState(false);
  const [sentChannel, setSentChannel] = useState(null); // null | 'sms' | 'whatsapp'
  const [sendError, setSendError] = useState(null);
  const [autoResetSecs, setAutoResetSecs] = useState(AUTO_RESET_SECONDS);
  const [showCountryPicker, setShowCountryPicker] = useState(false);

  const inputRef = useRef(null);
  const timerRef = useRef(null);

  // ─── Auto-reset countdown ────────────────────────────────────────────────
  useEffect(() => {
    timerRef.current = setInterval(() => {
      setAutoResetSecs((s) => {
        if (s <= 1) {
          clearInterval(timerRef.current);
          onNewPhoto();
          return 0;
        }
        return s - 1;
      });
    }, 1000);

    return () => clearInterval(timerRef.current);
  }, [onNewPhoto]);

  // ─── Reset countdown on any interaction ──────────────────────────────────
  const resetCountdown = useCallback(() => {
    setAutoResetSecs(AUTO_RESET_SECONDS);
  }, []);

  // ─── Phone input handler ──────────────────────────────────────────────────
  const handlePhoneChange = useCallback((e) => {
    resetCountdown();
    // Allow only digits, spaces, dashes, parens
    const raw = e.target.value.replace(/[^\d\s\-()]/g, '');
    setPhone(raw);
    setSentChannel(null);
    setSendError(null);
  }, [resetCountdown]);

  // ─── Send handler ─────────────────────────────────────────────────────────
  const handleSend = useCallback(async (channel) => {
    const fullPhone = `${countryCode}${phone.replace(/\D/g, '')}`;
    if (!phone.trim() || fullPhone.replace(/\D/g, '').length < 8) {
      setSendError(lang === 'es' ? 'Ingresa un número válido' : 'Enter a valid number');
      return;
    }

    setSending(true);
    setSendError(null);
    resetCountdown();

    try {
      await sendDelivery(channel, fullPhone, photoUrl, config.eventId);
      setSentChannel(channel);
    } catch (err) {
      console.error('[Delivery] send error:', err);
      setSendError(t('errors.generic', lang));
    } finally {
      setSending(false);
    }
  }, [countryCode, phone, photoUrl, config.eventId, lang, resetCountdown]);

  // ─── QR value — the direct photo URL (or a fallback) ─────────────────────
  const qrValue = photoUrl || 'https://pixel-ai.app';

  return (
    <div
      className="screen"
      style={{
        flexDirection: 'row',
        gap: 0,
        background: 'var(--bg)',
        overflow: 'hidden',
      }}
      onPointerDown={resetCountdown}
    >
      {/* ══════════════════════ LEFT PANEL — QR ══════════════════════ */}
      <motion.div
        initial={{ opacity: 0, x: -40 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.5 }}
        style={{
          flex: 1,
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 24,
          padding: '48px 56px',
          borderRight: '1px solid var(--border)',
        }}
      >
        <h1
          style={{
            fontSize: '2.4rem',
            fontWeight: 800,
            color: 'var(--text)',
            textAlign: 'center',
          }}
        >
          {t('delivery.title', lang)}
        </h1>

        {/* QR Code */}
        <motion.div
          initial={{ scale: 0.7, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.25, duration: 0.55, ease: 'backOut' }}
          style={{
            background: '#fff',
            borderRadius: 24,
            padding: 20,
            boxShadow: '0 0 60px rgba(124,58,237,0.35), 0 12px 40px rgba(0,0,0,0.5)',
          }}
        >
          <QRCodeSVG
            value={qrValue}
            size={280}
            level="M"
            includeMargin={false}
            style={{ display: 'block', borderRadius: 8 }}
          />
        </motion.div>

        <p
          style={{
            color: 'var(--text-muted)',
            fontSize: '1.1rem',
            textAlign: 'center',
          }}
        >
          {t('delivery.qr_hint', lang)}
        </p>

        {/* Auto-reset bar */}
        <div style={{ width: '100%', maxWidth: 340 }}>
          <p style={{
            color: 'var(--text-muted)',
            fontSize: '0.9rem',
            textAlign: 'center',
            marginBottom: 8,
          }}>
            {t('delivery.auto_reset', lang)}: {autoResetSecs}s
          </p>
          <CountdownBar
            seconds={autoResetSecs}
            totalSeconds={AUTO_RESET_SECONDS}
          />
        </div>
      </motion.div>

      {/* ══════════════════════ RIGHT PANEL — Phone ══════════════════════ */}
      <motion.div
        initial={{ opacity: 0, x: 40 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
        style={{
          width: 460,
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 20,
          padding: '48px 40px',
          background: 'rgba(255,255,255,0.03)',
          flexShrink: 0,
        }}
      >
        <AnimatePresence mode="wait">
          {sentChannel ? (
            /* ── Sent success state ── */
            <motion.div
              key="sent"
              initial={{ opacity: 0, scale: 0.85 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.4 }}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 20,
                textAlign: 'center',
              }}
            >
              <Checkmark />
              <h2 style={{ fontSize: '2.2rem', fontWeight: 800, color: 'var(--success)' }}>
                {t('delivery.sent', lang)}
              </h2>
              <p style={{ color: 'var(--text-muted)', fontSize: '1.05rem' }}>
                {lang === 'es'
                  ? `Enviado vía ${sentChannel === 'sms' ? 'SMS' : 'WhatsApp'} a ${countryCode} ${phone}`
                  : `Sent via ${sentChannel === 'sms' ? 'SMS' : 'WhatsApp'} to ${countryCode} ${phone}`}
              </p>
            </motion.div>
          ) : (
            /* ── Phone entry form ── */
            <motion.div
              key="form"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 20,
                width: '100%',
              }}
            >
              <div style={{ textAlign: 'center' }}>
                <h2
                  style={{
                    fontSize: '1.7rem',
                    fontWeight: 700,
                    color: 'var(--text)',
                    marginBottom: 8,
                  }}
                >
                  {t('delivery.phone_label', lang)}
                </h2>
                <p style={{ color: 'var(--text-muted)', fontSize: '1rem' }}>
                  {lang === 'es' ? 'Ingresa tu número y elige cómo recibirla' : 'Enter your number and choose how to receive it'}
                </p>
              </div>

              {/* ── Phone input row ── */}
              <div
                style={{
                  display: 'flex',
                  gap: 10,
                  width: '100%',
                  alignItems: 'stretch',
                }}
              >
                {/* Country code selector */}
                <div style={{ position: 'relative', flexShrink: 0 }}>
                  <button
                    onPointerDown={(e) => { e.stopPropagation(); resetCountdown(); setShowCountryPicker((v) => !v); }}
                    style={{
                      height: '100%',
                      minHeight: 68,
                      padding: '0 16px',
                      background: 'var(--card-bg)',
                      border: '1px solid var(--border)',
                      borderRadius: 14,
                      color: 'var(--text)',
                      fontSize: '1.1rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                      whiteSpace: 'nowrap',
                      touchAction: 'manipulation',
                      WebkitTapHighlightColor: 'transparent',
                    }}
                  >
                    {COUNTRY_CODES.find((c) => c.code === countryCode)?.flag || '🌐'}{' '}
                    {countryCode}
                    <span style={{ fontSize: '0.7rem', opacity: 0.6 }}>▼</span>
                  </button>

                  {/* Dropdown */}
                  <AnimatePresence>
                    {showCountryPicker && (
                      <motion.div
                        initial={{ opacity: 0, y: -8, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -8, scale: 0.95 }}
                        transition={{ duration: 0.15 }}
                        style={{
                          position: 'absolute',
                          bottom: '110%',
                          left: 0,
                          background: 'var(--bg2)',
                          border: '1px solid var(--border)',
                          borderRadius: 14,
                          overflow: 'hidden',
                          zIndex: 100,
                          minWidth: 160,
                          boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
                        }}
                      >
                        {COUNTRY_CODES.map((cc) => (
                          <button
                            key={cc.code}
                            onPointerDown={(e) => {
                              e.stopPropagation();
                              setCountryCode(cc.code);
                              setShowCountryPicker(false);
                              resetCountdown();
                            }}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: 10,
                              width: '100%',
                              padding: '14px 18px',
                              background: cc.code === countryCode ? 'rgba(124,58,237,0.2)' : 'transparent',
                              border: 'none',
                              borderBottom: '1px solid var(--border)',
                              color: 'var(--text)',
                              fontSize: '1.05rem',
                              cursor: 'pointer',
                              textAlign: 'left',
                              touchAction: 'manipulation',
                              WebkitTapHighlightColor: 'transparent',
                            }}
                          >
                            <span>{cc.flag}</span>
                            <span style={{ fontWeight: 600 }}>{cc.code}</span>
                            <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>{cc.label}</span>
                          </button>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Phone number input */}
                <input
                  ref={inputRef}
                  type="tel"
                  inputMode="numeric"
                  pattern="[0-9\s\-()]*"
                  placeholder={t('delivery.phone_placeholder', lang)}
                  value={phone}
                  onChange={handlePhoneChange}
                  onFocus={resetCountdown}
                  autoComplete="tel"
                  style={{
                    flex: 1,
                    minHeight: 68,
                    padding: '0 20px',
                    background: 'var(--card-bg)',
                    border: `1px solid ${sendError ? 'var(--danger)' : 'var(--border)'}`,
                    borderRadius: 14,
                    color: 'var(--text)',
                    fontSize: '1.4rem',
                    fontWeight: 600,
                    letterSpacing: '0.05em',
                    outline: 'none',
                    WebkitAppearance: 'none',
                    transition: 'border-color 0.2s',
                  }}
                />
              </div>

              {/* Error message */}
              <AnimatePresence>
                {sendError && (
                  <motion.p
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    style={{ color: 'var(--danger)', fontSize: '0.95rem', textAlign: 'center' }}
                  >
                    {sendError}
                  </motion.p>
                )}
              </AnimatePresence>

              {/* ── Send buttons ── */}
              <div style={{ display: 'flex', gap: 12, width: '100%' }}>
                <button
                  className="btn btn-ghost"
                  onPointerDown={(e) => { e.stopPropagation(); handleSend('sms'); }}
                  disabled={sending}
                  style={{
                    flex: 1,
                    minHeight: 68,
                    fontSize: '1.05rem',
                    border: '1px solid var(--border)',
                    gap: 8,
                  }}
                >
                  <span style={{ fontSize: '1.3rem' }}>💬</span>
                  {t('delivery.send_sms', lang)}
                </button>

                <button
                  className="btn"
                  onPointerDown={(e) => { e.stopPropagation(); handleSend('whatsapp'); }}
                  disabled={sending}
                  style={{
                    flex: 1,
                    minHeight: 68,
                    fontSize: '1.05rem',
                    background: 'linear-gradient(135deg, #128c7e, #25d366)',
                    color: '#fff',
                    border: 'none',
                    boxShadow: '0 4px 20px rgba(37,211,102,0.3)',
                    gap: 8,
                  }}
                >
                  <span style={{ fontSize: '1.3rem' }}>📱</span>
                  {t('delivery.send_whatsapp', lang)}
                </button>
              </div>

              {sending && (
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  style={{ color: 'var(--text-muted)', fontSize: '0.95rem' }}
                >
                  {lang === 'es' ? 'Enviando...' : 'Sending...'}
                </motion.p>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── New Photo button ── */}
        <motion.button
          className="btn btn-primary"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          whileTap={{ scale: 0.95 }}
          onPointerDown={(e) => { e.stopPropagation(); onNewPhoto(); }}
          style={{
            width: '100%',
            fontSize: '1.2rem',
            minHeight: 68,
            marginTop: 8,
          }}
        >
          📸 {t('delivery.new_photo', lang)}
        </motion.button>
      </motion.div>
    </div>
  );
}
