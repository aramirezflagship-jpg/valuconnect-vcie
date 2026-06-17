import { useState } from 'react';
import { Link } from 'react-router-dom';
import { requestPasswordReset } from '../utils/api.js';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    if (!email) {
      setError('Please enter your email.');
      return;
    }
    setSubmitting(true);
    try {
      // Backend always responds 200 (no user enumeration).
      await requestPasswordReset(email.trim());
      setSent(true);
    } catch (err) {
      // Even on a transport error, show the neutral message — we never reveal
      // whether the email exists.
      setSent(true);
      console.error('[ForgotPassword]', err);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      style={{
        background: 'var(--bg)',
        overflowY: 'auto',
        position: 'fixed',
        inset: 0,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '2rem 1rem',
      }}
    >
      {/* Branding */}
      <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
        <h1
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: 'clamp(2.8rem, 8vw, 5.25rem)',
            fontWeight: 900,
            background: 'linear-gradient(135deg, #fff 10%, #69b3e7 55%, #4a8fc4 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            letterSpacing: '0.04em',
            lineHeight: 1.1,
            marginBottom: '.5rem',
            filter: 'drop-shadow(0 0 24px rgba(74,143,196,0.5))',
          }}
        >
          Flash-it
        </h1>
        <p style={{ fontSize: '.9rem', color: 'var(--text-muted)', letterSpacing: '0.12em', textTransform: 'uppercase' }}>
          Reset your password
        </p>
      </div>

      {/* Card */}
      <div className="card" style={{ width: '100%', maxWidth: 420, padding: '2rem' }}>
        {sent ? (
          <>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--text)', marginBottom: '.75rem' }}>
              Check your email
            </h2>
            <p style={{ fontSize: '.875rem', color: 'var(--text-muted)', lineHeight: 1.6, marginBottom: '1.75rem' }}>
              If an account exists for <strong style={{ color: 'var(--text)' }}>{email}</strong>, we've sent a link to
              reset your password. The link expires in 15 minutes.
              <br />
              <br />
              <span style={{ color: 'var(--text-muted)' }}>
                Si existe una cuenta para ese correo, te enviamos un enlace para restablecer tu contraseña.
              </span>
            </p>
            <Link
              to="/login"
              className="btn btn-primary"
              style={{
                width: '100%',
                minHeight: 52,
                fontSize: '1rem',
                borderRadius: 12,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                textDecoration: 'none',
              }}
            >
              Back to Sign In
            </Link>
          </>
        ) : (
          <>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--text)', marginBottom: '.5rem' }}>
              Forgot Password
            </h2>
            <p style={{ fontSize: '.875rem', color: 'var(--text-muted)', marginBottom: '1.75rem' }}>
              Enter your email and we'll send you a reset link.
            </p>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <Field
                id="email"
                label="Email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
              />

              {error && <ErrorBanner>{error}</ErrorBanner>}

              <button
                type="submit"
                disabled={submitting}
                className="btn btn-primary"
                style={{ width: '100%', minHeight: 52, fontSize: '1rem', marginTop: '.25rem', borderRadius: 12 }}
              >
                {submitting ? 'Sending…' : 'Send Reset Link'}
              </button>
            </form>

            <p style={{ textAlign: 'center', marginTop: '1.5rem', fontSize: '.8rem', color: 'var(--text-muted)' }}>
              Remembered it?{' '}
              <Link to="/login" style={{ color: 'var(--accent-light)', textDecoration: 'none', fontWeight: 500 }}>
                Sign in
              </Link>
            </p>
          </>
        )}
      </div>
    </div>
  );
}

function Field({ id, label, type, autoComplete, value, onChange, placeholder }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '.5rem' }}>
      <label htmlFor={id} style={{ fontSize: '.8rem', color: 'var(--text-muted)', fontWeight: 500 }}>
        {label}
      </label>
      <input
        id={id}
        type={type}
        autoComplete={autoComplete}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        style={{
          background: 'rgba(255,255,255,0.06)',
          border: '1px solid var(--border)',
          borderRadius: 12,
          padding: '.75rem 1rem',
          color: 'var(--text)',
          fontSize: '1rem',
          outline: 'none',
          width: '100%',
          transition: 'border-color .15s',
        }}
        onFocus={(e) => (e.target.style.borderColor = 'var(--accent)')}
        onBlur={(e) => (e.target.style.borderColor = 'var(--border)')}
      />
    </div>
  );
}

function ErrorBanner({ children }) {
  return (
    <p
      style={{
        fontSize: '.8rem',
        color: 'var(--danger)',
        background: 'rgba(239,68,68,0.12)',
        border: '1px solid rgba(239,68,68,0.3)',
        borderRadius: 8,
        padding: '.6rem .875rem',
      }}
    >
      {children}
    </p>
  );
}
