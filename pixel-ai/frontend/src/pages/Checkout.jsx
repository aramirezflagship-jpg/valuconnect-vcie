import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';

const PLANS = {
  starter: {
    name: 'Starter',
    price: '$39',
    description: 'Up to 30 guests',
    features: [
      '1 AI theme',
      '30 SMS credits',
      '7-day photo gallery',
      'QR code event poster',
      'Instant digital delivery',
    ],
  },
  party: {
    name: 'Party',
    price: '$79',
    description: 'Up to 100 guests',
    features: [
      '3 AI themes',
      '100 SMS credits',
      '30-day photo gallery',
      'QR code event poster',
      'Instant digital delivery',
    ],
    hot: true,
  },
  celebration: {
    name: 'Celebration',
    price: '$149',
    description: 'Unlimited guests',
    features: [
      'All AI themes',
      '200 SMS credits',
      '90-day photo gallery',
      'Custom event name',
      'Priority support',
    ],
  },
  brand: {
    name: 'Brand',
    price: '$299',
    description: 'For businesses',
    features: [
      'Custom branding overlay',
      '500 SMS credits',
      '1-year gallery',
      'All AI themes',
      'Logo on every photo',
    ],
  },
};

export default function Checkout() {
  const [searchParams] = useSearchParams();
  const planKey = searchParams.get('plan') || 'party';
  const plan = PLANS[planKey] || PLANS.party;

  const [eventName, setEventName] = useState('');
  const [eventDate, setEventDate] = useState('');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    if (!eventName.trim() || !eventDate || !email.trim()) {
      setError('Please fill in all fields to continue.');
      return;
    }
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/payments/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          plan: planKey,
          customerEmail: email.trim(),
          eventName: eventName.trim(),
          eventDate,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || `Server error (${res.status})`);
      }

      const { url } = await res.json();
      if (!url) throw new Error('No checkout URL returned.');
      window.location.href = url;
    } catch (err) {
      setError(err.message || 'Something went wrong. Please try again.');
      setLoading(false);
    }
  }

  return (
    <div
      style={{
        minHeight: '100dvh',
        background: 'var(--bg)',
        color: 'var(--text)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '2rem 1rem',
        overflowY: 'auto',
        WebkitUserSelect: 'text',
        userSelect: 'text',
      }}
    >
      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 56,
            height: 56,
            borderRadius: '50%',
            background: 'linear-gradient(135deg, var(--accent), var(--accent-light))',
            boxShadow: '0 0 28px var(--accent-glow)',
            marginBottom: '.875rem',
            fontSize: '1.5rem',
          }}
        >
          📸
        </div>
        <h1
          style={{
            fontSize: '1.5rem',
            fontWeight: 700,
            color: 'var(--text)',
            letterSpacing: '-.02em',
          }}
        >
          Flash-it
        </h1>
      </div>

      <div
        style={{
          width: '100%',
          maxWidth: 760,
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: '1.5rem',
          alignItems: 'start',
        }}
      >
        {/* Plan summary */}
        <div className="card" style={{ padding: '1.75rem' }}>
          {plan.hot && (
            <span
              style={{
                display: 'inline-block',
                fontSize: '.65rem',
                letterSpacing: '.18em',
                textTransform: 'uppercase',
                color: 'var(--accent-light)',
                background: 'rgba(124,58,237,0.15)',
                border: '1px solid rgba(124,58,237,0.3)',
                borderRadius: 99,
                padding: '.2rem .65rem',
                marginBottom: '1rem',
              }}
            >
              ★ Most Popular
            </span>
          )}
          <div style={{ marginBottom: '1.25rem' }}>
            <h2
              style={{
                fontSize: '1.4rem',
                fontWeight: 700,
                color: 'var(--text)',
                marginBottom: '.25rem',
              }}
            >
              {plan.name}
            </h2>
            <p style={{ fontSize: '.875rem', color: 'var(--text-muted)', marginBottom: '.75rem' }}>
              {plan.description}
            </p>
            <div style={{ fontSize: '2.5rem', fontWeight: 300, color: 'var(--text)' }}>
              {plan.price}
            </div>
          </div>
          <ul
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '.6rem',
              listStyle: 'none',
              padding: 0,
              margin: 0,
            }}
          >
            {plan.features.map((f, i) => (
              <li
                key={i}
                style={{
                  display: 'flex',
                  gap: '.6rem',
                  fontSize: '.875rem',
                  color: 'var(--text-muted)',
                  alignItems: 'flex-start',
                }}
              >
                <span style={{ color: 'var(--success)', flexShrink: 0 }}>✓</span>
                {f}
              </li>
            ))}
          </ul>
        </div>

        {/* Checkout form */}
        <div className="card" style={{ padding: '1.75rem' }}>
          <h3
            style={{
              fontSize: '1.1rem',
              fontWeight: 600,
              color: 'var(--text)',
              marginBottom: '1.5rem',
            }}
          >
            Your Event Details
          </h3>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <FormField
              id="eventName"
              label="Event Name"
              type="text"
              value={eventName}
              onChange={setEventName}
              placeholder="e.g. Maria's Quinceañera"
            />

            <FormField
              id="eventDate"
              label="Event Date"
              type="date"
              value={eventDate}
              onChange={setEventDate}
            />

            <FormField
              id="email"
              label="Your Email"
              type="email"
              value={email}
              onChange={setEmail}
              placeholder="you@example.com"
            />

            {error && (
              <p
                style={{
                  fontSize: '.8rem',
                  color: 'var(--danger)',
                  background: 'var(--danger-glow)',
                  border: '1px solid rgba(239,68,68,0.3)',
                  borderRadius: 8,
                  padding: '.6rem .875rem',
                }}
              >
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="btn btn-primary"
              style={{
                width: '100%',
                minHeight: 52,
                fontSize: '1rem',
                borderRadius: 12,
                marginTop: '.25rem',
              }}
            >
              {loading ? (
                <span style={{ display: 'flex', alignItems: 'center', gap: '.5rem' }}>
                  <span
                    style={{
                      width: 18,
                      height: 18,
                      borderRadius: '50%',
                      border: '2px solid rgba(255,255,255,0.4)',
                      borderTopColor: '#fff',
                      animation: 'spin 0.7s linear infinite',
                      display: 'inline-block',
                    }}
                  />
                  Redirecting to payment…
                </span>
              ) : (
                'Proceed to Payment →'
              )}
            </button>

            <p style={{ fontSize: '.72rem', color: 'var(--text-muted)', textAlign: 'center' }}>
              Secured by Stripe · No equipment needed · Instant setup
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}

function FormField({ id, label, type, value, onChange, placeholder }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '.4rem' }}>
      <label
        htmlFor={id}
        style={{ fontSize: '.8rem', color: 'var(--text-muted)', fontWeight: 500 }}
      >
        {label}
      </label>
      <input
        id={id}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
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
          colorScheme: 'dark',
        }}
        onFocus={(e) => (e.target.style.borderColor = 'var(--accent)')}
        onBlur={(e) => (e.target.style.borderColor = 'var(--border)')}
      />
    </div>
  );
}
