import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import {
  getEventGallery,
  getEventStats,
  getPaymentHistory,
  openCustomerPortal,
  getNotifications,
  markNotificationRead,
  subscribeToPush,
  purchaseAddon,
} from '../utils/api.js';

// ── Utilities ─────────────────────────────────────────────────────────────────

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, []);
  return isMobile;
}

function formatDate(dateStr) {
  if (!dateStr) return '—';
  try {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

function formatDateTime(dateStr) {
  if (!dateStr) return '—';
  try {
    return new Date(dateStr).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  } catch {
    return dateStr;
  }
}

// ── Small reusable pieces ─────────────────────────────────────────────────────

function StatBadge({ active }) {
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '.35rem',
        padding: '.25rem .75rem',
        borderRadius: 99,
        fontSize: '.75rem',
        fontWeight: 600,
        background: active ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)',
        color: active ? 'var(--success)' : 'var(--danger)',
        border: `1px solid ${active ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)'}`,
      }}
    >
      <span
        style={{
          width: 6,
          height: 6,
          borderRadius: '50%',
          background: active ? 'var(--success)' : 'var(--danger)',
        }}
      />
      {active ? 'Active' : 'Expired'}
    </span>
  );
}

function StatItem({ label, value }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '.2rem' }}>
      <span
        style={{
          fontSize: '.7rem',
          color: 'var(--text-muted)',
          textTransform: 'uppercase',
          letterSpacing: '.08em',
        }}
      >
        {label}
      </span>
      <span style={{ fontSize: '.95rem', fontWeight: 600, color: 'var(--text)' }}>{value}</span>
    </div>
  );
}

function Spinner() {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        padding: '4rem',
      }}
    >
      <div
        style={{
          width: 40,
          height: 40,
          borderRadius: '50%',
          border: '3px solid var(--accent)',
          borderTopColor: 'transparent',
          animation: 'spin 0.8s linear infinite',
        }}
      />
    </div>
  );
}

function ErrorBanner({ children }) {
  return (
    <div
      style={{
        padding: '.75rem 1rem',
        marginBottom: '1.25rem',
        background: 'rgba(239,68,68,0.12)',
        border: '1px solid rgba(239,68,68,0.3)',
        borderRadius: 12,
        fontSize: '.85rem',
        color: 'var(--danger)',
      }}
    >
      {children}
    </div>
  );
}

function PaymentStatusBadge({ status }) {
  const cfg = {
    completed: { bg: 'rgba(16,185,129,0.15)', color: 'var(--success)', border: 'rgba(16,185,129,0.3)' },
    pending: { bg: 'rgba(245,158,11,0.15)', color: '#f59e0b', border: 'rgba(245,158,11,0.3)' },
    refunded: { bg: 'rgba(239,68,68,0.15)', color: 'var(--danger)', border: 'rgba(239,68,68,0.3)' },
  };
  const s = cfg[status?.toLowerCase()] || cfg.pending;
  return (
    <span
      style={{
        display: 'inline-block',
        padding: '.2rem .65rem',
        borderRadius: 99,
        fontSize: '.72rem',
        fontWeight: 600,
        background: s.bg,
        color: s.color,
        border: `1px solid ${s.border}`,
        textTransform: 'capitalize',
      }}
    >
      {status || 'unknown'}
    </span>
  );
}

// ── Tab: Gallery ──────────────────────────────────────────────────────────────

function StatsBar({ event }) {
  if (!event) return null;
  const isActive =
    event.status === 'active' || (!event.expiresAt || new Date(event.expiresAt) > new Date());
  return (
    <div
      className="card"
      style={{
        padding: '1.25rem 1.5rem',
        display: 'flex',
        flexWrap: 'wrap',
        gap: '1.5rem',
        alignItems: 'center',
        marginBottom: '1.5rem',
      }}
    >
      <div style={{ flex: '1 1 auto' }}>
        <div
          style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text)', marginBottom: '.2rem' }}
        >
          {event.name || 'Unnamed Event'}
        </div>
        <div style={{ fontSize: '.8rem', color: 'var(--text-muted)' }}>
          {event.eventDate ? formatDate(event.eventDate) : 'Date not set'}
        </div>
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1.25rem', alignItems: 'center' }}>
        <StatItem
          label="Guests"
          value={`${event.guest_count ?? 0} / ${event.max_guests ?? '∞'}`}
        />
        <StatItem
          label="SMS Credits"
          value={`${event.sms_credits_used ?? 0} / ${event.sms_credits_limit ?? '—'}`}
        />
        <div style={{ display: 'flex', flexDirection: 'column', gap: '.2rem' }}>
          <span
            style={{
              fontSize: '.7rem',
              color: 'var(--text-muted)',
              textTransform: 'uppercase',
              letterSpacing: '.08em',
            }}
          >
            Status
          </span>
          <StatBadge active={isActive} />
        </div>
        <StatItem label="Expires" value={event.expiresAt ? formatDate(event.expiresAt) : '—'} />
      </div>
    </div>
  );
}

function PhotoCard({ photo }) {
  function downloadPhoto() {
    const a = document.createElement('a');
    a.href = photo.photoUrl || photo.thumbnailUrl;
    a.download = `flash-it-photo-${photo.id || Date.now()}.jpg`;
    a.target = '_blank';
    a.rel = 'noopener';
    a.click();
  }
  return (
    <div
      className="card"
      style={{
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        transition: 'transform .15s',
      }}
      onMouseEnter={(e) => (e.currentTarget.style.transform = 'translateY(-2px)')}
      onMouseLeave={(e) => (e.currentTarget.style.transform = 'translateY(0)')}
    >
      <div
        style={{
          position: 'relative',
          paddingBottom: '100%',
          background: 'rgba(255,255,255,0.04)',
          overflow: 'hidden',
        }}
      >
        <img
          src={photo.thumbnailUrl || photo.photoUrl}
          alt="Event photo"
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            objectFit: 'cover',
          }}
          loading="lazy"
          onError={(e) => {
            e.target.style.display = 'none';
          }}
        />
      </div>
      <div
        style={{
          padding: '.75rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <span style={{ fontSize: '.72rem', color: 'var(--text-muted)' }}>
          {photo.takenAt ? formatDate(photo.takenAt) : 'No date'}
        </span>
        <button
          onClick={downloadPhoto}
          title="Download photo"
          style={{
            background: 'rgba(124,58,237,0.15)',
            border: '1px solid rgba(124,58,237,0.3)',
            borderRadius: 8,
            padding: '.3rem .6rem',
            color: 'var(--accent-light)',
            fontSize: '.75rem',
            cursor: 'pointer',
          }}
        >
          ↓
        </button>
      </div>
    </div>
  );
}

function GalleryGrid({ photos, isMobile }) {
  if (!photos || photos.length === 0) {
    return (
      <div
        style={{
          textAlign: 'center',
          padding: '4rem 2rem',
          color: 'var(--text-muted)',
          background: 'var(--card-bg)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius)',
        }}
      >
        <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📷</div>
        <p style={{ fontSize: '1rem', color: 'var(--text)', marginBottom: '.5rem' }}>
          No photos yet
        </p>
        <p style={{ fontSize: '.875rem' }}>
          Share your event link and let guests start taking photos!
        </p>
      </div>
    );
  }
  const cols = isMobile ? (window.innerWidth < 480 ? 1 : 2) : 3;
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: `repeat(${cols}, 1fr)`,
        gap: '1rem',
      }}
    >
      {photos.map((photo, i) => (
        <PhotoCard key={photo.id || i} photo={photo} />
      ))}
    </div>
  );
}

function GalleryTab({ event, photos, isMobile, eventId, loading, error }) {
  const [copyFeedback, setCopyFeedback] = useState(false);

  function handleCopyLink() {
    const link = `${window.location.origin}/e/${eventId}`;
    navigator.clipboard.writeText(link).then(() => {
      setCopyFeedback(true);
      setTimeout(() => setCopyFeedback(false), 2000);
    });
  }

  async function handleDownloadZip() {
    try {
      const res = await fetch(`/api/events/${eventId}/gallery?format=zip`);
      if (!res.ok) throw new Error('Not available');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `flash-it-${eventId}-photos.zip`;
      a.click();
    } catch {
      alert('Download All (ZIP) is coming soon!');
    }
  }

  function handleViewQRPoster() {
    window.open(`/api/events/${eventId}/qr-poster`, '_blank', 'noopener');
  }

  if (loading) return <Spinner />;

  return (
    <>
      <StatsBar event={event} />
      {error && <ErrorBanner>{error}</ErrorBanner>}

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: isMobile ? '1fr' : '1fr 280px',
          gap: '1.5rem',
          alignItems: 'start',
        }}
      >
        {/* Photo grid */}
        <div>
          <h2
            style={{
              fontSize: '1rem',
              fontWeight: 600,
              color: 'var(--text)',
              marginBottom: '1rem',
              display: 'flex',
              alignItems: 'center',
              gap: '.5rem',
            }}
          >
            📷 Photos
            {photos.length > 0 && (
              <span
                style={{
                  fontSize: '.75rem',
                  color: 'var(--text-muted)',
                  background: 'var(--card-bg)',
                  border: '1px solid var(--border)',
                  borderRadius: 99,
                  padding: '.15rem .6rem',
                }}
              >
                {photos.length}
              </span>
            )}
          </h2>
          <GalleryGrid photos={photos} isMobile={isMobile} />
        </div>

        {/* Sidebar actions */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '.75rem' }}>
          <h2
            style={{
              fontSize: '1rem',
              fontWeight: 600,
              color: 'var(--text)',
              marginBottom: '.25rem',
            }}
          >
            Actions
          </h2>

          <button
            onClick={handleCopyLink}
            className="btn btn-primary"
            style={{ width: '100%', minHeight: 48, fontSize: '.875rem', borderRadius: 12 }}
          >
            {copyFeedback ? '✓ Copied!' : '🔗 Copy Event Link'}
          </button>

          <button
            onClick={handleDownloadZip}
            className="btn btn-ghost"
            style={{ width: '100%', minHeight: 48, fontSize: '.875rem', borderRadius: 12 }}
          >
            ⬇ Download All Photos (ZIP)
          </button>

          <button
            onClick={handleViewQRPoster}
            className="btn btn-ghost"
            style={{ width: '100%', minHeight: 48, fontSize: '.875rem', borderRadius: 12 }}
          >
            🖼 View QR Poster
          </button>

          {eventId && (
            <div
              style={{
                marginTop: '.5rem',
                padding: '.875rem',
                background: 'var(--card-bg)',
                border: '1px solid var(--border)',
                borderRadius: 12,
              }}
            >
              <p
                style={{
                  fontSize: '.7rem',
                  color: 'var(--text-muted)',
                  marginBottom: '.4rem',
                }}
              >
                Guest Link
              </p>
              <code
                style={{
                  fontSize: '.72rem',
                  color: 'var(--accent-light)',
                  wordBreak: 'break-all',
                  lineHeight: 1.5,
                }}
              >
                {window.location.origin}/e/{eventId}
              </code>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

// ── Tab: Payments ─────────────────────────────────────────────────────────────

function PaymentsTab({ token }) {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [portalLoading, setPortalLoading] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const data = await getPaymentHistory(token);
        setPayments(Array.isArray(data) ? data : []);
      } catch (err) {
        setError('Could not load payment history.');
        console.error('[Payments]', err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [token]);

  async function handleManageBilling() {
    setPortalLoading(true);
    try {
      const { url } = await openCustomerPortal(token);
      window.open(url, '_blank', 'noopener');
    } catch (err) {
      alert('Could not open billing portal. Please try again.');
      console.error('[Portal]', err);
    } finally {
      setPortalLoading(false);
    }
  }

  if (loading) return <Spinner />;

  return (
    <div>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '1.5rem',
          flexWrap: 'wrap',
          gap: '.75rem',
        }}
      >
        <h2 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text)' }}>
          Payment History
        </h2>
        <button
          onClick={handleManageBilling}
          disabled={portalLoading}
          className="btn btn-primary"
          style={{ minHeight: 40, fontSize: '.875rem', padding: '0 1.25rem', borderRadius: 10 }}
        >
          {portalLoading ? 'Opening…' : '💳 Manage Billing'}
        </button>
      </div>

      {error && <ErrorBanner>{error}</ErrorBanner>}

      {payments.length === 0 ? (
        <div
          style={{
            textAlign: 'center',
            padding: '4rem 2rem',
            background: 'var(--card-bg)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius)',
            color: 'var(--text-muted)',
          }}
        >
          <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>💳</div>
          <p style={{ fontSize: '1rem', color: 'var(--text)', marginBottom: '.5rem' }}>
            No payments yet
          </p>
          <p style={{ fontSize: '.875rem' }}>Your payment history will appear here.</p>
        </div>
      ) : (
        <div
          className="card"
          style={{ overflow: 'hidden', padding: 0 }}
        >
          {/* Table header */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr 1fr auto auto',
              gap: '1rem',
              padding: '.75rem 1.25rem',
              borderBottom: '1px solid var(--border)',
              fontSize: '.7rem',
              color: 'var(--text-muted)',
              textTransform: 'uppercase',
              letterSpacing: '.06em',
              fontWeight: 600,
            }}
          >
            <span>Date</span>
            <span>Package</span>
            <span>Event</span>
            <span>Amount</span>
            <span>Status</span>
          </div>
          {/* Rows */}
          {payments.map((p, i) => (
            <div
              key={p.id || i}
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr 1fr auto auto',
                gap: '1rem',
                padding: '.875rem 1.25rem',
                borderBottom:
                  i < payments.length - 1 ? '1px solid var(--border)' : 'none',
                alignItems: 'center',
                fontSize: '.875rem',
              }}
            >
              <span style={{ color: 'var(--text-muted)' }}>{formatDate(p.date || p.created_at)}</span>
              <span style={{ color: 'var(--text)' }}>{p.package || p.plan || '—'}</span>
              <span style={{ color: 'var(--text-muted)' }}>{p.eventName || p.event_name || '—'}</span>
              <span style={{ color: 'var(--text)', fontWeight: 600 }}>
                {p.amount != null
                  ? `$${(p.amount / 100).toFixed(2)}`
                  : '—'}
              </span>
              <PaymentStatusBadge status={p.status} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Tab: Add-ons ──────────────────────────────────────────────────────────────

const ADDONS = [
  {
    id: 'sms_50',
    label: '50 SMS Credits',
    price: '$5',
    description: 'Send up to 50 more photo delivery texts.',
    icon: '💬',
  },
  {
    id: 'sms_100',
    label: '100 SMS Credits',
    price: '$9',
    description: 'Best value — 100 SMS deliveries for your event.',
    icon: '💬',
  },
  {
    id: 'custom_theme',
    label: 'Custom AI Theme',
    price: '$99',
    description: 'A one-of-a-kind AI art style designed for your brand.',
    icon: '🎨',
  },
  {
    id: 'branded_overlay',
    label: 'Branded Overlay',
    price: '$49',
    description: 'Your logo watermarked on every event photo.',
    icon: '🏷️',
  },
];

function AddonsTab({ eventId, token }) {
  const [loadingAddon, setLoadingAddon] = useState(null);

  async function handleAddon(addonId) {
    if (!eventId) {
      alert('No active event found. Please make sure your event is set up.');
      return;
    }
    setLoadingAddon(addonId);
    try {
      const { url } = await purchaseAddon(eventId, addonId, token);
      window.location.href = url;
    } catch (err) {
      alert('Could not start checkout. Please try again.');
      console.error('[Addon]', err);
    } finally {
      setLoadingAddon(null);
    }
  }

  return (
    <div>
      <h2
        style={{
          fontSize: '1rem',
          fontWeight: 600,
          color: 'var(--text)',
          marginBottom: '.5rem',
        }}
      >
        Add-ons
      </h2>
      <p style={{ fontSize: '.875rem', color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
        Enhance your current event with extra credits and features.
      </p>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
          gap: '1rem',
        }}
      >
        {ADDONS.map((addon) => (
          <div
            key={addon.id}
            className="card"
            style={{
              padding: '1.5rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '1rem',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '.75rem' }}>
              <span style={{ fontSize: '1.75rem' }}>{addon.icon}</span>
              <div>
                <div style={{ fontWeight: 700, color: 'var(--text)', fontSize: '.95rem' }}>
                  {addon.label}
                </div>
                <div
                  style={{
                    fontSize: '1.1rem',
                    fontWeight: 700,
                    color: 'var(--accent-light)',
                  }}
                >
                  {addon.price}
                </div>
              </div>
            </div>
            <p style={{ fontSize: '.8rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
              {addon.description}
            </p>
            <button
              onClick={() => handleAddon(addon.id)}
              disabled={loadingAddon === addon.id}
              className="btn btn-primary"
              style={{
                width: '100%',
                minHeight: 44,
                fontSize: '.875rem',
                borderRadius: 10,
                marginTop: 'auto',
              }}
            >
              {loadingAddon === addon.id
                ? 'Opening checkout…'
                : addon.id === 'custom_theme'
                ? 'Request Theme'
                : 'Add Credits'}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Tab: Settings ─────────────────────────────────────────────────────────────

function SettingsTab({ user, token }) {
  const [pushStatus, setPushStatus] = useState(
    typeof Notification !== 'undefined' ? Notification.permission : 'unsupported'
  );
  const [pushLoading, setPushLoading] = useState(false);

  async function handleEnablePush() {
    setPushLoading(true);
    try {
      const permission = await Notification.requestPermission();
      setPushStatus(permission);

      if (permission === 'granted') {
        // Register service worker and get push subscription
        const reg = await navigator.serviceWorker.ready;
        const existing = await reg.pushManager.getSubscription();
        const subscription =
          existing ||
          (await reg.pushManager.subscribe({
            userVisibleOnly: true,
            // applicationServerKey would go here if you have VAPID keys
            // applicationServerKey: urlBase64ToUint8Array(import.meta.env.VITE_VAPID_PUBLIC_KEY),
          }).catch(() => null));

        if (subscription) {
          await subscribeToPush(subscription.toJSON(), token);
        }
      }
    } catch (err) {
      console.error('[Push]', err);
      alert('Could not enable push notifications.');
    } finally {
      setPushLoading(false);
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Account info */}
      <div className="card" style={{ padding: '1.5rem' }}>
        <h3
          style={{
            fontSize: '.95rem',
            fontWeight: 600,
            color: 'var(--text)',
            marginBottom: '1.25rem',
          }}
        >
          Account
        </h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <SettingsRow
            label="Email"
            value={user?.email || '—'}
            hint="Contact support to change your email."
            readOnly
          />
          <SettingsRow
            label="User ID"
            value={user?.id ? String(user.id).slice(0, 8) + '…' : '—'}
            readOnly
          />
        </div>
      </div>

      {/* Push notifications */}
      <div className="card" style={{ padding: '1.5rem' }}>
        <h3
          style={{
            fontSize: '.95rem',
            fontWeight: 600,
            color: 'var(--text)',
            marginBottom: '1rem',
          }}
        >
          Push Notifications
        </h3>

        {pushStatus === 'unsupported' && (
          <p style={{ fontSize: '.875rem', color: 'var(--text-muted)' }}>
            Push notifications are not supported in this browser.
          </p>
        )}

        {pushStatus === 'granted' && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '.6rem',
              fontSize: '.875rem',
              color: 'var(--success)',
            }}
          >
            <span
              style={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                background: 'var(--success)',
                flexShrink: 0,
              }}
            />
            Notifications enabled
          </div>
        )}

        {pushStatus === 'default' && (
          <div>
            <p
              style={{
                fontSize: '.875rem',
                color: 'var(--text-muted)',
                marginBottom: '1rem',
                lineHeight: 1.5,
              }}
            >
              Get notified when new photos are taken or your event is about to expire.
            </p>
            <button
              onClick={handleEnablePush}
              disabled={pushLoading}
              className="btn btn-primary"
              style={{ minHeight: 44, fontSize: '.875rem', padding: '0 1.25rem', borderRadius: 10 }}
            >
              {pushLoading ? 'Enabling…' : '🔔 Enable Push Notifications'}
            </button>
          </div>
        )}

        {pushStatus === 'denied' && (
          <p style={{ fontSize: '.875rem', color: 'var(--text-muted)' }}>
            Notifications are blocked in your browser settings. To enable them, update your browser
            permissions for this site.
          </p>
        )}
      </div>

      {/* Danger zone */}
      <div className="card" style={{ padding: '1.5rem' }}>
        <h3
          style={{
            fontSize: '.95rem',
            fontWeight: 600,
            color: 'var(--danger)',
            marginBottom: '1rem',
          }}
        >
          Danger Zone
        </h3>
        <button
          disabled
          className="btn btn-ghost"
          style={{
            minHeight: 44,
            fontSize: '.875rem',
            padding: '0 1.25rem',
            borderRadius: 10,
            opacity: 0.45,
            cursor: 'not-allowed',
          }}
          title="Contact support to delete your account"
        >
          Delete Account — Contact Support
        </button>
      </div>
    </div>
  );
}

function SettingsRow({ label, value, hint, readOnly }) {
  return (
    <div>
      <label
        style={{
          fontSize: '.75rem',
          color: 'var(--text-muted)',
          textTransform: 'uppercase',
          letterSpacing: '.06em',
          fontWeight: 600,
          display: 'block',
          marginBottom: '.4rem',
        }}
      >
        {label}
      </label>
      <input
        type="text"
        value={value}
        readOnly
        style={{
          background: readOnly ? 'rgba(255,255,255,0.03)' : 'rgba(255,255,255,0.06)',
          border: '1px solid var(--border)',
          borderRadius: 10,
          padding: '.6rem .875rem',
          color: readOnly ? 'var(--text-muted)' : 'var(--text)',
          fontSize: '.875rem',
          width: '100%',
          outline: 'none',
          cursor: readOnly ? 'default' : 'text',
        }}
      />
      {hint && (
        <p style={{ fontSize: '.72rem', color: 'var(--text-muted)', marginTop: '.35rem' }}>
          {hint}
        </p>
      )}
    </div>
  );
}

// ── Notification dropdown ─────────────────────────────────────────────────────

function NotificationBell({ token }) {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);
  const ref = useRef(null);

  const unreadCount = notifications.filter((n) => !n.read && !n.read_at).length;

  // Close on outside click
  useEffect(() => {
    function handler(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  async function fetchNotifications() {
    setLoading(true);
    try {
      const data = await getNotifications(token);
      setNotifications(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('[Notifications]', err);
    } finally {
      setLoading(false);
    }
  }

  function handleToggle() {
    const next = !open;
    setOpen(next);
    if (next) fetchNotifications();
  }

  async function handleMarkRead(id) {
    try {
      await markNotificationRead(id, token);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, read: true, read_at: new Date().toISOString() } : n))
      );
    } catch (err) {
      console.error('[Mark read]', err);
    }
  }

  const notifIcon = (type) => {
    if (type?.includes('payment') || type?.includes('billing')) return '💳';
    if (type?.includes('photo') || type?.includes('capture')) return '📷';
    if (type?.includes('expire') || type?.includes('expir')) return '⏰';
    if (type?.includes('sms')) return '💬';
    return '🔔';
  };

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      {/* Bell button */}
      <button
        onClick={handleToggle}
        style={{
          background: 'transparent',
          border: '1px solid var(--border)',
          borderRadius: 8,
          padding: '.4rem .65rem',
          cursor: 'pointer',
          color: 'var(--text-muted)',
          fontSize: '1.1rem',
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
        title="Notifications"
      >
        🔔
        {unreadCount > 0 && (
          <span
            style={{
              position: 'absolute',
              top: -5,
              right: -5,
              background: 'var(--danger)',
              color: '#fff',
              borderRadius: '50%',
              width: 17,
              height: 17,
              fontSize: '.65rem',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: '2px solid var(--bg)',
            }}
          >
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {open && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 8px)',
            right: 0,
            width: 320,
            maxHeight: 400,
            overflowY: 'auto',
            background: 'var(--bg2)',
            border: '1px solid var(--border)',
            borderRadius: 14,
            boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
            zIndex: 200,
          }}
        >
          <div
            style={{
              padding: '.875rem 1rem',
              borderBottom: '1px solid var(--border)',
              fontSize: '.8rem',
              fontWeight: 600,
              color: 'var(--text)',
            }}
          >
            Notifications
          </div>

          {loading ? (
            <div
              style={{
                padding: '2rem',
                textAlign: 'center',
                color: 'var(--text-muted)',
                fontSize: '.875rem',
              }}
            >
              Loading…
            </div>
          ) : notifications.length === 0 ? (
            <div
              style={{
                padding: '2rem',
                textAlign: 'center',
                color: 'var(--text-muted)',
                fontSize: '.875rem',
              }}
            >
              <div style={{ fontSize: '2rem', marginBottom: '.5rem' }}>🔔</div>
              No notifications
            </div>
          ) : (
            notifications.map((n) => {
              const isUnread = !n.read && !n.read_at;
              return (
                <div
                  key={n.id}
                  onClick={() => isUnread && handleMarkRead(n.id)}
                  style={{
                    padding: '.875rem 1rem',
                    borderBottom: '1px solid var(--border)',
                    cursor: isUnread ? 'pointer' : 'default',
                    background: isUnread ? 'rgba(124,58,237,0.08)' : 'transparent',
                    transition: 'background .15s',
                    display: 'flex',
                    gap: '.75rem',
                    alignItems: 'flex-start',
                  }}
                  onMouseEnter={(e) => {
                    if (isUnread) e.currentTarget.style.background = 'rgba(124,58,237,0.14)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = isUnread
                      ? 'rgba(124,58,237,0.08)'
                      : 'transparent';
                  }}
                >
                  <span style={{ fontSize: '1.1rem', flexShrink: 0 }}>{notifIcon(n.type)}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        fontSize: '.8rem',
                        fontWeight: isUnread ? 600 : 400,
                        color: 'var(--text)',
                        marginBottom: '.2rem',
                      }}
                    >
                      {n.title || 'Notification'}
                    </div>
                    {n.body && (
                      <div
                        style={{
                          fontSize: '.75rem',
                          color: 'var(--text-muted)',
                          lineHeight: 1.4,
                        }}
                      >
                        {n.body}
                      </div>
                    )}
                    <div
                      style={{
                        fontSize: '.68rem',
                        color: 'var(--text-muted)',
                        marginTop: '.3rem',
                      }}
                    >
                      {formatDateTime(n.created_at || n.createdAt)}
                    </div>
                  </div>
                  {isUnread && (
                    <span
                      style={{
                        width: 7,
                        height: 7,
                        borderRadius: '50%',
                        background: 'var(--accent)',
                        flexShrink: 0,
                        marginTop: 4,
                      }}
                    />
                  )}
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}

// ── Tab switcher ──────────────────────────────────────────────────────────────

const TABS = ['Gallery', 'Payments', 'Add-ons', 'Settings'];

function TabBar({ activeTab, onChange }) {
  return (
    <div
      style={{
        display: 'flex',
        gap: '.375rem',
        marginBottom: '1.75rem',
        flexWrap: 'wrap',
      }}
    >
      {TABS.map((tab) => {
        const active = activeTab === tab;
        return (
          <button
            key={tab}
            onClick={() => onChange(tab)}
            style={{
              background: active
                ? 'var(--accent)'
                : 'var(--card-bg)',
              color: active ? '#fff' : 'var(--text-muted)',
              border: active ? 'none' : '1px solid var(--border)',
              borderRadius: 10,
              padding: '.45rem 1.1rem',
              fontSize: '.875rem',
              fontWeight: active ? 600 : 400,
              cursor: 'pointer',
              transition: 'background .15s, color .15s',
              boxShadow: active ? '0 2px 12px var(--accent-glow)' : 'none',
            }}
          >
            {tab}
          </button>
        );
      })}
    </div>
  );
}

// ── Dashboard shell ───────────────────────────────────────────────────────────

function DashboardShell({ event, user, token, isMobile, onSignOut, children }) {
  return (
    <div
      style={{
        minHeight: '100dvh',
        background: 'var(--bg)',
        color: 'var(--text)',
        display: 'flex',
        flexDirection: 'column',
        overflowY: 'auto',
        WebkitUserSelect: 'text',
        userSelect: 'text',
      }}
    >
      {/* Navbar */}
      <nav
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 100,
          background: 'rgba(13,13,26,0.92)',
          backdropFilter: 'blur(12px)',
          borderBottom: '1px solid var(--border)',
          padding: '0 1.25rem',
          height: 60,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '1rem',
        }}
      >
        {/* Left: Logo */}
        <div
          style={{
            fontWeight: 700,
            fontSize: '1rem',
            color: 'var(--text)',
            flexShrink: 0,
            display: 'flex',
            alignItems: 'center',
            gap: '.5rem',
          }}
        >
          📸 Flash-it
        </div>

        {/* Center: Event + status badge */}
        {event?.name && !isMobile && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '.6rem',
              flex: 1,
              justifyContent: 'center',
            }}
          >
            <span style={{ fontSize: '.875rem', color: 'var(--text-muted)' }}>{event.name}</span>
            <StatBadge
              active={
                event.status === 'active' ||
                (!event.expiresAt || new Date(event.expiresAt) > new Date())
              }
            />
          </div>
        )}

        {/* Right: Bell + email + sign out */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '.6rem', flexShrink: 0 }}>
          <NotificationBell token={token} />

          {!isMobile && user?.email && (
            <span
              style={{
                fontSize: '.75rem',
                color: 'var(--text-muted)',
                maxWidth: 160,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {user.email}
            </span>
          )}

          <button
            onClick={onSignOut}
            style={{
              background: 'transparent',
              border: '1px solid var(--border)',
              borderRadius: 8,
              padding: '.4rem .875rem',
              color: 'var(--text-muted)',
              fontSize: '.8rem',
              cursor: 'pointer',
            }}
          >
            Sign Out
          </button>
        </div>
      </nav>

      {/* Content */}
      <main style={{ padding: '1.5rem', maxWidth: 1200, width: '100%', margin: '0 auto' }}>
        {children}
      </main>
    </div>
  );
}

// ── Service worker registration (push support) ────────────────────────────────

async function registerServiceWorker() {
  if ('serviceWorker' in navigator) {
    try {
      await navigator.serviceWorker.register('/sw.js');
    } catch (err) {
      console.warn('[SW] Registration failed:', err);
    }
  }
}

// ── Main Dashboard export ─────────────────────────────────────────────────────

export default function Dashboard() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const isMobile = useIsMobile();
  const { user, loading: authLoading, signOut, getToken } = useAuth();

  const [activeTab, setActiveTab] = useState('Gallery');
  const [event, setEvent] = useState(null);
  const [photos, setPhotos] = useState([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [dataError, setDataError] = useState('');

  // Auth guard
  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/login', { replace: true });
    }
  }, [user, authLoading, navigate]);

  // Register SW on mount for push support
  useEffect(() => {
    registerServiceWorker();
  }, []);

  const token = getToken();

  const [eventId, setEventId] = useState(
    () => searchParams.get('event') || localStorage.getItem('flash_it_event') || null
  );

  // Auto-discover event from account when no event ID is present in URL or storage
  useEffect(() => {
    if (!user || eventId) return;
    const t = getToken();
    if (!t) return;
    fetch('/api/accounts/me', { headers: { Authorization: `Bearer ${t}` } })
      .then((r) => r.json())
      .then((data) => {
        const first = data.events?.[0];
        const id = first?.id || first?.eventId || first?.event_id;
        if (id) {
          localStorage.setItem('flash_it_event', String(id));
          setEventId(String(id));
        }
      })
      .catch(() => {});
  }, [user, eventId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Load gallery data
  useEffect(() => {
    if (!user || !eventId) {
      setDataLoading(false);
      return;
    }

    async function loadData() {
      setDataLoading(true);
      try {
        const [statsData, galleryData] = await Promise.all([
          getEventStats(eventId),
          getEventGallery(eventId),
        ]);
        setEvent(statsData);
        setPhotos(Array.isArray(galleryData?.photos) ? galleryData.photos : []);
      } catch (err) {
        console.error('[Dashboard] load error:', err);
        setDataError('Could not load event data. The backend may be unavailable.');
        setEvent({ name: 'Event', status: 'unknown' });
        setPhotos([]);
      } finally {
        setDataLoading(false);
      }
    }

    loadData();
  }, [user, eventId]);

  async function handleSignOut() {
    await signOut();
    navigate('/login', { replace: true });
  }

  // Still checking auth
  if (authLoading) {
    return (
      <div
        style={{
          minHeight: '100dvh',
          background: 'var(--bg)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Spinner />
      </div>
    );
  }

  if (!user) return null;

  // No event configured
  if (!dataLoading && !eventId) {
    return (
      <DashboardShell
        event={null}
        user={user}
        token={token}
        isMobile={isMobile}
        onSignOut={handleSignOut}
      >
        <TabBar activeTab={activeTab} onChange={setActiveTab} />

        {activeTab === 'Gallery' && (
          <div
            style={{
              textAlign: 'center',
              padding: '4rem 2rem',
              color: 'var(--text-muted)',
            }}
          >
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🔍</div>
            <p style={{ fontSize: '1.1rem', color: 'var(--text)', marginBottom: '.5rem' }}>
              No event found
            </p>
            <p style={{ fontSize: '.875rem' }}>Contact support to get your event set up.</p>
          </div>
        )}
        {activeTab === 'Payments' && <PaymentsTab token={token} />}
        {activeTab === 'Add-ons' && <AddonsTab eventId={null} token={token} />}
        {activeTab === 'Settings' && <SettingsTab user={user} token={token} />}
      </DashboardShell>
    );
  }

  return (
    <DashboardShell
      event={event}
      user={user}
      token={token}
      isMobile={isMobile}
      onSignOut={handleSignOut}
    >
      <TabBar activeTab={activeTab} onChange={setActiveTab} />

      {activeTab === 'Gallery' && (
        <GalleryTab
          event={event}
          photos={photos}
          isMobile={isMobile}
          eventId={eventId}
          loading={dataLoading}
          error={dataError}
        />
      )}
      {activeTab === 'Payments' && <PaymentsTab token={token} />}
      {activeTab === 'Add-ons' && <AddonsTab eventId={eventId} token={token} />}
      {activeTab === 'Settings' && <SettingsTab user={user} token={token} />}
    </DashboardShell>
  );
}
