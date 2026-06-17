import { useState, useEffect, useCallback } from 'react';
import { createMyEvent, getMyEvents, getBackgrounds } from '../../utils/api.js';

// Occasion categories advertised by the backgrounds service.
const CATEGORIES = [
  { id: 'wedding', label: 'Wedding · Boda', icon: '💍' },
  { id: 'quinceanera', label: 'Quinceañera · XV', icon: '🌸' },
  { id: 'corporate', label: 'Corporate · Corporativo', icon: '🏢' },
  { id: 'birthday', label: 'Birthday · Cumpleaños', icon: '🎂' },
  { id: 'holiday', label: 'Holiday · Fiesta', icon: '🎄' },
  { id: 'fiesta', label: 'Fiesta · Party', icon: '🎉' },
];

const inputStyle = {
  background: 'rgba(255,255,255,0.06)',
  border: '1px solid var(--border)',
  borderRadius: 12,
  padding: '.7rem .9rem',
  color: 'var(--text)',
  fontSize: '.95rem',
  outline: 'none',
  width: '100%',
};

function Spinner() {
  return (
    <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}>
      <div
        style={{
          width: 36,
          height: 36,
          borderRadius: '50%',
          border: '3px solid var(--accent)',
          borderTopColor: 'transparent',
          animation: 'spin 0.8s linear infinite',
        }}
      />
    </div>
  );
}

function FieldLabel({ children }) {
  return (
    <label style={{ fontSize: '.78rem', color: 'var(--text-muted)', fontWeight: 500, display: 'block', marginBottom: '.4rem' }}>
      {children}
    </label>
  );
}

// ── Created-event success card: kiosk link + QR + PIN ─────────────────────────

function EventSuccessCard({ event, onDone }) {
  const [copied, setCopied] = useState(false);
  const code = event.code || event.event_code || event.id;
  const kioskLink = `${window.location.origin}/e/${code}`;
  const qrSrc = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(kioskLink)}`;

  function copy() {
    navigator.clipboard.writeText(kioskLink).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <div className="card" style={{ padding: '1.75rem', textAlign: 'center' }}>
      <div style={{ fontSize: '2rem', marginBottom: '.5rem' }}>🎉</div>
      <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--text)', marginBottom: '.35rem' }}>
        Event created!
      </h3>
      <p style={{ fontSize: '.85rem', color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
        Share this link or QR with your guests. <strong style={{ color: 'var(--text)' }}>{event.name}</strong>
      </p>

      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1.25rem' }}>
        <img
          src={qrSrc}
          alt="Kiosk QR code"
          width={200}
          height={200}
          style={{ borderRadius: 12, background: '#fff', padding: 8 }}
        />
      </div>

      <div
        style={{
          display: 'flex',
          gap: '1rem',
          justifyContent: 'center',
          flexWrap: 'wrap',
          marginBottom: '1.25rem',
        }}
      >
        {event.code && (
          <div>
            <div style={{ fontSize: '.68rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '.06em' }}>
              Event Code
            </div>
            <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--accent-light)' }}>{event.code}</div>
          </div>
        )}
        {event.pin && (
          <div>
            <div style={{ fontSize: '.68rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '.06em' }}>
              PIN
            </div>
            <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--accent-light)' }}>{event.pin}</div>
          </div>
        )}
      </div>

      <code
        style={{
          display: 'block',
          fontSize: '.78rem',
          color: 'var(--accent-light)',
          wordBreak: 'break-all',
          background: 'rgba(255,255,255,0.04)',
          border: '1px solid var(--border)',
          borderRadius: 10,
          padding: '.6rem .8rem',
          marginBottom: '1rem',
        }}
      >
        {kioskLink}
      </code>

      <div style={{ display: 'flex', gap: '.6rem', justifyContent: 'center', flexWrap: 'wrap' }}>
        <button onClick={copy} className="btn btn-primary" style={{ minHeight: 44, borderRadius: 10, padding: '0 1.25rem' }}>
          {copied ? '✓ Copied!' : '🔗 Copy Link'}
        </button>
        <button onClick={onDone} className="btn btn-ghost" style={{ minHeight: 44, borderRadius: 10, padding: '0 1.25rem' }}>
          Create Another
        </button>
      </div>
    </div>
  );
}

// ── Create-event form ─────────────────────────────────────────────────────────

function CreateEventForm({ token, onCreated }) {
  const [name, setName] = useState('');
  const [date, setDate] = useState('');
  const [venue, setVenue] = useState('');
  const [channels, setChannels] = useState({ qr: true, sms: false });
  const [category, setCategory] = useState('');
  const [backgrounds, setBackgroundsState] = useState([]);
  const [bgLoading, setBgLoading] = useState(false);
  const [selectedBgs, setSelectedBgs] = useState([]); // backgroundIds
  const [defaultBg, setDefaultBg] = useState(''); // defaultBackgroundId
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Load backgrounds when a category is picked, so the host can pre-assign art.
  useEffect(() => {
    if (!category) {
      setBackgroundsState([]);
      return;
    }
    let active = true;
    setBgLoading(true);
    getBackgrounds(category)
      .then((data) => {
        if (active) setBackgroundsState(data.backgrounds || []);
      })
      .catch(() => active && setBackgroundsState([]))
      .finally(() => active && setBgLoading(false));
    return () => {
      active = false;
    };
  }, [category]);

  function toggleBg(id) {
    setSelectedBgs((prev) => {
      const next = prev.includes(id) ? prev.filter((b) => b !== id) : [...prev, id];
      // Keep defaultBg valid.
      if (!next.includes(defaultBg)) setDefaultBg(next[0] || '');
      else if (!defaultBg && next.length) setDefaultBg(next[0]);
      return next;
    });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    if (!name.trim()) {
      setError('Event name is required.');
      return;
    }
    const deliveryChannels = Object.entries(channels)
      .filter(([, on]) => on)
      .map(([k]) => k);

    setSubmitting(true);
    try {
      const payload = {
        name: name.trim(),
        ...(date ? { date } : {}),
        ...(venue.trim() ? { venue: venue.trim() } : {}),
        deliveryChannels,
        backgroundIds: selectedBgs,
        ...(defaultBg ? { defaultBackgroundId: defaultBg } : {}),
      };
      const event = await createMyEvent(payload, token);
      onCreated(event);
    } catch (err) {
      setError(err?.response?.data?.error || err?.message || 'Could not create event. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="card" style={{ padding: '1.75rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      <div>
        <FieldLabel>Event Name *</FieldLabel>
        <input style={inputStyle} value={name} onChange={(e) => setName(e.target.value)} placeholder="María's Quinceañera" />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
        <div>
          <FieldLabel>Date</FieldLabel>
          <input type="date" style={inputStyle} value={date} onChange={(e) => setDate(e.target.value)} />
        </div>
        <div>
          <FieldLabel>Venue</FieldLabel>
          <input style={inputStyle} value={venue} onChange={(e) => setVenue(e.target.value)} placeholder="Salón Fiesta" />
        </div>
      </div>

      <div>
        <FieldLabel>Photo Delivery</FieldLabel>
        <div style={{ display: 'flex', gap: '1.25rem' }}>
          {[
            { id: 'qr', label: 'QR Code' },
            { id: 'sms', label: 'SMS Text' },
          ].map((ch) => (
            <label key={ch.id} style={{ display: 'flex', alignItems: 'center', gap: '.5rem', fontSize: '.9rem', color: 'var(--text)', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={!!channels[ch.id]}
                onChange={(e) => setChannels((c) => ({ ...c, [ch.id]: e.target.checked }))}
              />
              {ch.label}
            </label>
          ))}
        </div>
      </div>

      <div>
        <FieldLabel>Themed Backgrounds (optional)</FieldLabel>
        <select style={inputStyle} value={category} onChange={(e) => { setCategory(e.target.value); setSelectedBgs([]); setDefaultBg(''); }}>
          <option value="">— Choose an occasion to load art —</option>
          {CATEGORIES.map((c) => (
            <option key={c.id} value={c.id}>
              {c.icon} {c.label}
            </option>
          ))}
        </select>

        {category && (bgLoading ? (
          <Spinner />
        ) : backgrounds.length === 0 ? (
          <p style={{ fontSize: '.8rem', color: 'var(--text-muted)', marginTop: '.75rem' }}>
            No backgrounds in this category yet. Upload art in the Backgrounds tab first.
          </p>
        ) : (
          <>
            <p style={{ fontSize: '.75rem', color: 'var(--text-muted)', margin: '.75rem 0 .5rem' }}>
              Tap to include backgrounds. The starred one is the default.
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(90px, 1fr))', gap: '.6rem' }}>
              {backgrounds.map((bg) => {
                const on = selectedBgs.includes(bg.id);
                const isDefault = defaultBg === bg.id;
                return (
                  <div key={bg.id} style={{ position: 'relative' }}>
                    <button
                      type="button"
                      onClick={() => toggleBg(bg.id)}
                      title={bg.name}
                      style={{
                        width: '100%',
                        aspectRatio: '3/4',
                        borderRadius: 10,
                        overflow: 'hidden',
                        padding: 0,
                        cursor: 'pointer',
                        border: 'none',
                        outline: on ? '3px solid var(--accent)' : '2px solid var(--border)',
                        outlineOffset: -1,
                        background: 'rgba(255,255,255,0.04)',
                      }}
                    >
                      <img
                        src={bg.thumbnailUrl || bg.url}
                        alt={bg.name}
                        style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                      />
                    </button>
                    {on && (
                      <button
                        type="button"
                        onClick={() => setDefaultBg(bg.id)}
                        title={isDefault ? 'Default background' : 'Set as default'}
                        style={{
                          position: 'absolute',
                          top: 4,
                          right: 4,
                          background: isDefault ? 'var(--accent)' : 'rgba(0,0,0,0.6)',
                          border: 'none',
                          borderRadius: '50%',
                          width: 24,
                          height: 24,
                          cursor: 'pointer',
                          fontSize: '.8rem',
                          color: '#fff',
                          lineHeight: 1,
                        }}
                      >
                        ★
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </>
        ))}
      </div>

      {error && (
        <p style={{ fontSize: '.8rem', color: 'var(--danger)', background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 8, padding: '.6rem .875rem' }}>
          {error}
        </p>
      )}

      <button type="submit" disabled={submitting} className="btn btn-primary" style={{ minHeight: 50, borderRadius: 12, fontSize: '1rem' }}>
        {submitting ? 'Creating…' : 'Create Event'}
      </button>
    </form>
  );
}

// ── Host's event list ─────────────────────────────────────────────────────────

function EventList({ events }) {
  if (!events.length) {
    return (
      <div style={{ textAlign: 'center', padding: '2.5rem 1rem', color: 'var(--text-muted)', fontSize: '.875rem' }}>
        You haven't created any events yet.
      </div>
    );
  }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '.6rem' }}>
      {events.map((ev) => {
        const code = ev.code || ev.event_code || ev.eventCode || ev.id;
        return (
          <div
            key={ev.id || code}
            className="card"
            style={{ padding: '1rem 1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}
          >
            <div>
              <div style={{ fontWeight: 600, color: 'var(--text)', fontSize: '.95rem' }}>{ev.name || 'Unnamed Event'}</div>
              <div style={{ fontSize: '.75rem', color: 'var(--text-muted)' }}>
                {ev.date ? new Date(ev.date).toLocaleDateString() : 'No date'} · Code {code}
                {ev.pin ? ` · PIN ${ev.pin}` : ''}
              </div>
            </div>
            <a
              href={`/e/${code}`}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-ghost"
              style={{ minHeight: 38, borderRadius: 8, padding: '0 1rem', fontSize: '.8rem', textDecoration: 'none' }}
            >
              Open Kiosk →
            </a>
          </div>
        );
      })}
    </div>
  );
}

// ── Main tab ──────────────────────────────────────────────────────────────────

export default function EventsTab({ token }) {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [created, setCreated] = useState(null);

  const loadEvents = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getMyEvents(token);
      setEvents(Array.isArray(data?.events) ? data.events : []);
    } catch (err) {
      console.error('[EventsTab]', err);
      setEvents([]);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    loadEvents();
  }, [loadEvents]);

  function handleCreated(event) {
    setCreated(event);
    loadEvents();
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 360px)', gap: '1.5rem', alignItems: 'start' }}>
      <div>
        <h2 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text)', marginBottom: '1rem' }}>
          {created ? 'Your New Event' : 'Create Event'}
        </h2>
        {created ? (
          <EventSuccessCard event={created} onDone={() => setCreated(null)} />
        ) : (
          <CreateEventForm token={token} onCreated={handleCreated} />
        )}
      </div>

      <div>
        <h2 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text)', marginBottom: '1rem' }}>Your Events</h2>
        {loading ? <Spinner /> : <EventList events={events} />}
      </div>
    </div>
  );
}
