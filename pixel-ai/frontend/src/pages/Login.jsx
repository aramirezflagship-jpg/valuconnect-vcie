import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import LegalFooter from '../components/LegalFooter.jsx';

export default function Login() {
  const navigate = useNavigate();
  const { user, loading, signIn } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // If already logged in, redirect to dashboard
  useEffect(() => {
    if (!loading && user) {
      navigate('/dashboard', { replace: true });
    }
  }, [user, loading, navigate]);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!email || !password) {
      setError('Please enter your email and password.');
      return;
    }
    setError('');
    setSubmitting(true);
    try {
      await signIn(email, password);
      navigate('/dashboard', { replace: true });
    } catch (err) {
      setError(err?.message || 'Login failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) return null;

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
        <p style={{ fontSize: '.9rem', color: 'var(--text-muted)', letterSpacing: '0.12em', textTransform: 'uppercase' }}>Host Dashboard</p>
      </div>

      {/* Card */}
      <div className="card" style={{ width: '100%', maxWidth: 420, padding: '2rem' }}>
        <h2
          style={{
            fontSize: '1.25rem',
            fontWeight: 600,
            color: 'var(--text)',
            marginBottom: '.5rem',
          }}
        >
          Sign In
        </h2>
        <p style={{ fontSize: '.875rem', color: 'var(--text-muted)', marginBottom: '1.75rem' }}>
          Access your event dashboard
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
          <Field
            id="password"
            label="Password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
          />

          {error && <ErrorBanner>{error}</ErrorBanner>}

          <div style={{ textAlign: 'right', marginTop: '-.35rem' }}>
            <Link
              to="/forgot-password"
              style={{ color: 'var(--accent-light)', textDecoration: 'none', fontSize: '.78rem', fontWeight: 500 }}
            >
              Forgot password?
            </Link>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="btn btn-primary"
            style={{
              width: '100%',
              minHeight: 52,
              fontSize: '1rem',
              marginTop: '.25rem',
              borderRadius: 12,
            }}
          >
            {submitting ? 'Signing in…' : 'Sign In'}
          </button>
        </form>

        <p
          style={{
            textAlign: 'center',
            marginTop: '1.5rem',
            fontSize: '.8rem',
            color: 'var(--text-muted)',
          }}
        >
          Don't have an account?{' '}
          <Link
            to="/register"
            style={{ color: 'var(--accent-light)', textDecoration: 'none', fontWeight: 500 }}
          >
            Create account
          </Link>
        </p>

        <LegalFooter lang="en" />
      </div>
    </div>
  );
}

// ── Shared sub-components ─────────────────────────────────────────────────────

function Field({ id, label, type, autoComplete, value, onChange, placeholder }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '.5rem' }}>
      <label
        htmlFor={id}
        style={{ fontSize: '.8rem', color: 'var(--text-muted)', fontWeight: 500 }}
      >
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
