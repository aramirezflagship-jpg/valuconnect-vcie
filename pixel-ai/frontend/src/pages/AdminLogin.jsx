import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

export default function AdminLogin() {
  const navigate = useNavigate();
  const { user, loading, signInAdmin } = useAuth();

  const [email, setEmail] = useState('admin@flash-it.app');
  const [secret, setSecret] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!loading && user?.role === 'admin') {
      navigate('/admin', { replace: true });
    }
  }, [user, loading, navigate]);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!secret) { setError('Enter the admin secret.'); return; }
    setError('');
    setSubmitting(true);
    try {
      await signInAdmin(email, secret);
      localStorage.setItem('flash_it_admin_secret', secret);
      navigate('/admin', { replace: true });
    } catch (err) {
      setError(err?.message || 'Invalid credentials.');
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) return null;

  return (
    <div style={{
      background: '#0d0d1a',
      position: 'fixed', inset: 0,
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      padding: '2rem 1rem',
    }}>
      <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
        <div style={{
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          width: 56, height: 56, borderRadius: '50%',
          background: 'linear-gradient(135deg, #dc2626, #f97316)',
          boxShadow: '0 0 24px rgba(220,38,38,0.4)',
          marginBottom: '.875rem', fontSize: '1.5rem',
        }}>⚡</div>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#f1f5f9', letterSpacing: '-.02em', margin: 0 }}>
          Flash-it Admin
        </h1>
        <p style={{ fontSize: '.8rem', color: '#64748b', marginTop: '.25rem' }}>Andres only</p>
      </div>

      <div style={{
        background: '#1a1a2e', border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: 16, padding: '2rem', width: '100%', maxWidth: 380,
      }}>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '.4rem' }}>
            <label style={{ fontSize: '.78rem', color: '#94a3b8', fontWeight: 500 }}>Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={inputStyle}
              onFocus={(e) => (e.target.style.borderColor = '#dc2626')}
              onBlur={(e) => (e.target.style.borderColor = 'rgba(255,255,255,0.1)')}
            />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '.4rem' }}>
            <label style={{ fontSize: '.78rem', color: '#94a3b8', fontWeight: 500 }}>Admin Secret</label>
            <input
              type="password"
              value={secret}
              onChange={(e) => setSecret(e.target.value)}
              placeholder="••••••••••••"
              autoComplete="current-password"
              style={inputStyle}
              onFocus={(e) => (e.target.style.borderColor = '#dc2626')}
              onBlur={(e) => (e.target.style.borderColor = 'rgba(255,255,255,0.1)')}
            />
          </div>

          {error && (
            <p style={{
              fontSize: '.78rem', color: '#f87171',
              background: 'rgba(239,68,68,0.1)',
              border: '1px solid rgba(239,68,68,0.25)',
              borderRadius: 8, padding: '.5rem .75rem', margin: 0,
            }}>{error}</p>
          )}

          <button
            type="submit"
            disabled={submitting}
            style={{
              background: 'linear-gradient(135deg, #dc2626, #f97316)',
              color: '#fff', border: 'none', borderRadius: 12,
              padding: '.85rem', fontSize: '1rem', fontWeight: 600,
              cursor: submitting ? 'not-allowed' : 'pointer',
              opacity: submitting ? 0.7 : 1, marginTop: '.25rem',
            }}
          >
            {submitting ? 'Signing in…' : 'Access Admin Panel'}
          </button>
        </form>
      </div>
    </div>
  );
}

const inputStyle = {
  background: 'rgba(255,255,255,0.05)',
  border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: 10, padding: '.7rem .9rem',
  color: '#f1f5f9', fontSize: '.95rem',
  outline: 'none', width: '100%',
  transition: 'border-color .15s',
  boxSizing: 'border-box',
};
