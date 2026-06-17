import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { resetPassword } from '../utils/api.js';

export default function ResetPassword() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  // No token in the URL → the link is malformed/expired.
  const missingToken = !token;

  useEffect(() => {
    if (!done) return;
    const timer = setTimeout(() => navigate('/login', { replace: true }), 2500);
    return () => clearTimeout(timer);
  }, [done, navigate]);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');

    if (!password || !confirm) {
      setError('Please fill in both fields.');
      return;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    if (password !== confirm) {
      setError('Passwords do not match.');
      return;
    }

    setSubmitting(true);
    try {
      await resetPassword(token, password);
      setDone(true);
    } catch (err) {
      setError(
        err?.response?.data?.error ||
          err?.message ||
          'This reset link is invalid or has expired. Please request a new one.'
      );
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
          Set a new password
        </p>
      </div>

      {/* Card */}
      <div className="card" style={{ width: '100%', maxWidth: 420, padding: '2rem' }}>
        {done ? (
          <>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--success)', marginBottom: '.75rem' }}>
              Password updated
            </h2>
            <p style={{ fontSize: '.875rem', color: 'var(--text-muted)', lineHeight: 1.6 }}>
              Your password has been reset. Redirecting you to sign in…
            </p>
          </>
        ) : missingToken ? (
          <>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--text)', marginBottom: '.75rem' }}>
              Invalid reset link
            </h2>
            <p style={{ fontSize: '.875rem', color: 'var(--text-muted)', lineHeight: 1.6, marginBottom: '1.75rem' }}>
              This password reset link is missing or has expired. Please request a new one.
            </p>
            <Link
              to="/forgot-password"
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
              Request New Link
            </Link>
          </>
        ) : (
          <>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--text)', marginBottom: '.5rem' }}>
              New Password
            </h2>
            <p style={{ fontSize: '.875rem', color: 'var(--text-muted)', marginBottom: '1.75rem' }}>
              Choose a new password for your account.
            </p>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <Field
                id="password"
                label="New Password"
                type="password"
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Min. 8 characters"
              />
              <Field
                id="confirm"
                label="Confirm Password"
                type="password"
                autoComplete="new-password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                placeholder="Re-enter your password"
              />

              {error && <ErrorBanner>{error}</ErrorBanner>}

              <button
                type="submit"
                disabled={submitting}
                className="btn btn-primary"
                style={{ width: '100%', minHeight: 52, fontSize: '1rem', marginTop: '.25rem', borderRadius: 12 }}
              >
                {submitting ? 'Updating…' : 'Update Password'}
              </button>
            </form>

            <p style={{ textAlign: 'center', marginTop: '1.5rem', fontSize: '.8rem', color: 'var(--text-muted)' }}>
              <Link to="/login" style={{ color: 'var(--accent-light)', textDecoration: 'none', fontWeight: 500 }}>
                Back to Sign In
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
