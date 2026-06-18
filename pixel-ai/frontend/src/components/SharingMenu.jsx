import { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { t } from '../utils/i18n.js';
import MarketingOptIn from './MarketingOptIn.jsx';

// Detect mobile once at module load time
const isMobile = /iPhone|iPad|Android/i.test(navigator.userAgent);

export default function SharingMenu({ photoUrl, gifUrl, eventName, eventId, onDone, qrCode, lang = 'en' }) {
  const [selected, setSelected] = useState(null); // 'qr' | 'sms' | 'email' | 'instagram' | 'facebook'
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');
  // TCPA/CAN-SPAM: marketing opt-in is SEPARATE, OPTIONAL, and UNCHECKED by
  // default. Delivering the photo (transactional) does NOT depend on it.
  const [marketingOptIn, setMarketingOptIn] = useState(false);
  const mediaUrl = gifUrl || photoUrl;

  // ── Social share helpers ──────────────────────────────────────────────────
  async function shareToInstagram() {
    try {
      const response = await fetch(photoUrl);
      const blob = await response.blob();
      const file = new File([blob], 'flash-it-photo.jpg', { type: 'image/jpeg' });
      await navigator.share({ files: [file], title: `${eventName || 'Flash-it'} Photo` });
      setSent(true);
    } catch {
      // Fallback: open the image URL directly + instruction
      window.open(photoUrl, '_blank');
      alert('Download saved! Open Instagram → tap + → select from your photos');
    }
  }

  function shareToFacebook() {
    const fbUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(photoUrl)}`;
    window.open(fbUrl, '_blank', 'noopener,width=600,height=400');
    setSent(true);
  }

  // ── Auto-trigger social shares when selected ──────────────────────────────
  useEffect(() => {
    if (selected === 'instagram') {
      setSending(true);
      shareToInstagram().finally(() => setSending(false));
    } else if (selected === 'facebook') {
      shareToFacebook();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected]);

  // ── Build methods list ────────────────────────────────────────────────────
  const METHODS = [
    { id: 'qr',    icon: '📲', label: 'Scan QR Code',     desc: 'Download instantly on your phone' },
    { id: 'sms',   icon: '💬', label: 'Send to Phone',     desc: 'Get it via text message' },
    { id: 'email', icon: '📧', label: 'Send to Email',     desc: 'Get it in your inbox' },
    ...(isMobile && photoUrl?.startsWith('http') ? [
      { id: 'instagram', icon: '📸', label: 'Instagram Story', desc: 'Share to your Instagram' },
    ] : []),
    ...(photoUrl?.startsWith('http') ? [
      { id: 'facebook', icon: '👍', label: 'Share to Facebook', desc: 'Post to your Facebook' },
    ] : []),
  ];

  // ── Standard delivery ─────────────────────────────────────────────────────
  async function handleSend() {
    if (!input && selected !== 'qr') {
      setError('Please enter your ' + (selected === 'sms' ? 'phone number' : 'email'));
      return;
    }
    setError(''); setSending(true);
    try {
      // The photo delivery itself is TRANSACTIONAL and is sent regardless of the
      // marketing opt-in. `marketingConsent` is passed as separate metadata so
      // the backend can record proof of consent only when the guest opted in.
      const res = await fetch('/api/deliver', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          method: selected,
          to: input,
          photoUrl,
          gifUrl,
          eventName,
          eventId,
          marketingConsent: marketingOptIn,
          marketingConsentChannel: marketingOptIn ? selected : null,
          marketingConsentText: marketingOptIn
            ? t(selected === 'email' ? 'marketing.optin.email' : 'marketing.optin.sms', lang)
            : null,
          marketingConsentAt: marketingOptIn ? new Date().toISOString() : null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setSent(true);
    } catch (err) {
      setError(err.message || 'Delivery failed. Try again.');
    } finally {
      setSending(false);
    }
  }

  // ── Success state ─────────────────────────────────────────────────────────
  if (sent) {
    return (
      <div style={styles.root}>
        <div style={styles.successBox}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>✅</div>
          <h2 style={styles.title}>On its way!</h2>
          <p style={styles.sub}>
            {selected === 'email'
              ? 'Check your inbox'
              : selected === 'sms'
              ? 'Check your messages'
              : selected === 'instagram'
              ? 'Opening Instagram…'
              : selected === 'facebook'
              ? 'Opening Facebook…'
              : 'Check your phone'}
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '.6rem', marginBottom: '1rem', width: '100%', maxWidth: 260 }}>
            <a href={`/api/print?url=${encodeURIComponent(photoUrl)}&eventName=${encodeURIComponent(eventName || '')}`} target="_blank" rel="noreferrer" style={styles.secondaryBtn}>🖨️ Print Photo</a>
            <a href={photoUrl} download target="_blank" rel="noreferrer" style={styles.secondaryBtn}>↓ Download</a>
          </div>
          <button style={styles.primaryBtn} onClick={onDone}>Take Another Photo</button>
        </div>
      </div>
    );
  }

  // ── Instagram loading state ───────────────────────────────────────────────
  if (selected === 'instagram' && sending) {
    return (
      <div style={styles.root}>
        <div style={styles.spinner} />
        <p style={{ color: '#94a3b8', marginTop: '1.5rem' }}>Preparing your photo…</p>
      </div>
    );
  }

  // ── QR selected ───────────────────────────────────────────────────────────
  if (selected === 'qr') {
    return (
      <div style={styles.root}>
        <h2 style={styles.title}>Scan to Download</h2>
        <div style={{ background: '#fff', padding: 16, borderRadius: 16, marginBottom: '1.5rem' }}>
          {qrCode ? (
            <img src={qrCode} alt="QR code" width={240} height={240} style={{ display: 'block' }} />
          ) : (
            <QRCodeSVG value={mediaUrl} size={240} />
          )}
        </div>
        <button
          style={styles.primaryBtn}
          onClick={() => {
            if (eventId) {
              fetch('/api/deliver', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ method: 'qr', photoUrl, eventId, eventName }),
              });
            }
            onDone();
          }}
        >
          Done
        </button>
        <button style={styles.backBtn} onClick={() => setSelected(null)}>← Back</button>
      </div>
    );
  }

  // ── SMS / Email input screen ──────────────────────────────────────────────
  if (selected && selected !== 'instagram' && selected !== 'facebook') {
    const isSms = selected === 'sms';
    return (
      <div style={styles.root}>
        <h2 style={styles.title}>{isSms ? '💬 Send to Phone' : '📧 Send to Email'}</h2>
        <p style={styles.sub}>{isSms ? 'Enter your phone number' : 'Enter your email address'}</p>
        <input
          type={isSms ? 'tel' : 'email'}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={isSms ? '+1 (555) 000-0000' : 'you@example.com'}
          style={styles.input}
          autoFocus
        />
        {error && <p style={styles.error}>{error}</p>}

        {/* TCPA/CAN-SPAM marketing opt-in — separate, optional, UNCHECKED.
            Does NOT gate the photo delivery below. */}
        <MarketingOptIn
          channel={selected}
          checked={marketingOptIn}
          onChange={setMarketingOptIn}
          lang={lang}
        />

        <button style={styles.primaryBtn} onClick={handleSend} disabled={sending}>
          {sending ? 'Sending…' : 'Send My Photo'}
        </button>
        <button
          style={styles.backBtn}
          onClick={() => { setSelected(null); setInput(''); setError(''); setMarketingOptIn(false); }}
        >
          ← Back
        </button>
      </div>
    );
  }

  // ── Method picker ─────────────────────────────────────────────────────────
  return (
    <div style={styles.root}>
      <h2 style={styles.title}>Get Your Photo!</h2>
      <p style={styles.sub}>Choose how you'd like to receive it</p>
      <div style={styles.methodGrid}>
        {METHODS.map((m) => (
          <button
            key={m.id}
            style={styles.methodCard}
            onClick={() => setSelected(m.id)}
            onMouseOver={(e) => (e.currentTarget.style.borderColor = '#7c3aed')}
            onMouseOut={(e) => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)')}
          >
            <span style={{ fontSize: '2.5rem', marginBottom: '.75rem', display: 'block' }}>{m.icon}</span>
            <div style={{ fontWeight: 700, fontSize: '1rem', marginBottom: '.4rem', color: '#f1f5f9' }}>{m.label}</div>
            <div style={{ fontSize: '.8rem', color: '#94a3b8' }}>{m.desc}</div>
          </button>
        ))}
      </div>
      <button style={{ ...styles.backBtn, marginTop: '1.5rem' }} onClick={onDone}>Skip</button>
    </div>
  );
}

const styles = {
  root: { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100%', padding: '2rem 1.5rem', textAlign: 'center' },
  title: { fontSize: 'clamp(1.5rem, 5vw, 2.5rem)', fontWeight: 800, color: '#f1f5f9', marginBottom: '.5rem', letterSpacing: '-.02em' },
  sub: { fontSize: '.95rem', color: '#94a3b8', marginBottom: '2rem' },
  methodGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '1rem', width: '100%', maxWidth: 520 },
  methodCard: { background: '#1a1a2e', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 16, padding: '1.5rem 1rem', cursor: 'pointer', transition: 'border-color .15s', textAlign: 'center', color: '#f1f5f9', minHeight: 48 },
  input: { background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 12, padding: '.85rem 1.1rem', color: '#f1f5f9', fontSize: '1.1rem', width: '100%', maxWidth: 360, outline: 'none', marginBottom: '1rem', textAlign: 'center' },
  primaryBtn: { background: 'linear-gradient(135deg, #7c3aed, #a855f7)', color: '#fff', border: 'none', borderRadius: 14, padding: '.9rem 2.5rem', fontSize: '1.05rem', fontWeight: 700, cursor: 'pointer', marginBottom: '.75rem', minWidth: 200, minHeight: 52 },
  backBtn: { background: 'transparent', color: '#64748b', border: 'none', fontSize: '.9rem', cursor: 'pointer', padding: '.5rem', minHeight: 44 },
  error: { color: '#f87171', fontSize: '.85rem', marginBottom: '.75rem' },
  successBox: { display: 'flex', flexDirection: 'column', alignItems: 'center' },
  secondaryBtn: { display: 'block', background: 'rgba(255,255,255,0.06)', color: '#f1f5f9', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 12, padding: '.75rem 1.5rem', fontSize: '.95rem', fontWeight: 600, cursor: 'pointer', textDecoration: 'none', textAlign: 'center' },
  spinner: { width: 52, height: 52, borderRadius: '50%', border: '4px solid #7c3aed', borderTopColor: 'transparent', animation: 'spin 0.8s linear infinite' },
};
