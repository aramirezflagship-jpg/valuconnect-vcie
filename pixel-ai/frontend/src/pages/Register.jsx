import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

export default function Register() {
  const navigate = useNavigate();
  const { user, loading, register } = useAuth();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Already logged in → go to dashboard
  useEffect(() => {
    if (!loading && user) navigate('/dashboard', { replace: true });
  }, [user, loading, navigate]);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');

    if (!name.trim() || !email || !password) {
      setError('Please fill in all fields.');
      return;
    }
    if (password !== confirm) {
      setError('Passwords do not match.');
      return;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }

    setSubmitting(true);
    try {
      await register(email, password, name.trim());
      navigate('/dashboard', { replace: true });
    } catch (err) {
      setError(err?.message || 'Registration failed. Please try again.');
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
        <p style={{ fontSize: '.9rem', color: 'var(--text-muted)', letterSpacing: '0.12em', textTransform: 'uppercase' }}>Create your host account</p>
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
          Create Account
        </h2>
        <p style={{ fontSize: '.875rem', color: 'var(--text-muted)', marginBottom: '1.75rem' }}>
          Start hosting events today
        </p>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <Field
            id="name"
            label="Name"
            type="text"
            autoComplete="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Your name"
          />
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
            style={{
              width: '100%',
              minHeight: 52,
              fontSize: '1rem',
              marginTop: '.25rem',
              borderRadius: 12,
            }}
          >
            {submitting ? 'Creating account…' : 'Create Account'}
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
          Already have an account?{' '}
          <Link
            to="/login"
            style={{ color: 'var(--accent-light)', textDecoration: 'none', fontWeight: 500 }}
          >
            Sign in
          </Link>
        </p>
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
