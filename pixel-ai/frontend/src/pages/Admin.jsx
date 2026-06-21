import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import TemplateDesigner from './TemplateDesigner.jsx';
import AdminBackgrounds from '../components/admin/AdminBackgrounds.jsx';
import AdminMetrics from '../components/admin/AdminMetrics.jsx';
import AdminFullService from '../components/admin/AdminFullService.jsx';
import AdminCustomers from '../components/admin/AdminCustomers.jsx';
import AdminMessageTemplates from '../components/admin/AdminMessageTemplates.jsx';
import AdminLaunch from '../components/admin/AdminLaunch.jsx';
import AdminProducts from '../components/admin/AdminProducts.jsx';
import { serviceTypeBadge } from '../components/admin/adminStyles.js';
import { getAdminMetrics } from '../utils/api.js';

const S = {
  page: {
    background: '#0d0d1a', minHeight: '100dvh', color: '#f1f5f9',
    fontFamily: 'system-ui, sans-serif',
  },
  header: {
    background: '#1a1a2e', borderBottom: '1px solid rgba(255,255,255,0.08)',
    padding: '0 1.5rem', display: 'flex', alignItems: 'center',
    justifyContent: 'space-between', height: 60,
  },
  brand: {
    display: 'flex', alignItems: 'center', gap: '.6rem',
    fontSize: '1rem', fontWeight: 700, color: '#f1f5f9',
  },
  badge: {
    background: 'rgba(220,38,38,0.2)', color: '#f87171',
    border: '1px solid rgba(220,38,38,0.3)',
    borderRadius: 6, fontSize: '.65rem', fontWeight: 700,
    padding: '.2rem .45rem', letterSpacing: '.04em',
  },
  nav: {
    display: 'flex', gap: '.25rem', borderBottom: '1px solid rgba(255,255,255,0.06)',
    padding: '.5rem 1.5rem 0',
  },
  tab: (active) => ({
    background: active ? 'rgba(220,38,38,0.15)' : 'transparent',
    color: active ? '#f87171' : '#64748b',
    border: 'none', borderBottom: active ? '2px solid #dc2626' : '2px solid transparent',
    padding: '.6rem 1.1rem', fontSize: '.85rem', fontWeight: 600,
    cursor: 'pointer', borderRadius: '8px 8px 0 0', transition: 'all .15s',
  }),
  body: { padding: '1.5rem', maxWidth: 1100, margin: '0 auto' },
  card: {
    background: '#1a1a2e', border: '1px solid rgba(255,255,255,0.07)',
    borderRadius: 12, padding: '1.25rem',
  },
  statGrid: {
    display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '1rem',
    marginBottom: '1.5rem',
  },
  statCard: {
    background: '#1a1a2e', border: '1px solid rgba(255,255,255,0.07)',
    borderRadius: 12, padding: '1rem 1.25rem',
  },
  statLabel: { fontSize: '.7rem', color: '#64748b', fontWeight: 600, letterSpacing: '.06em', textTransform: 'uppercase' },
  statValue: { fontSize: '1.75rem', fontWeight: 700, color: '#f1f5f9', marginTop: '.25rem' },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: '.84rem' },
  th: {
    textAlign: 'left', padding: '.6rem .75rem',
    color: '#64748b', fontWeight: 600, fontSize: '.72rem',
    letterSpacing: '.06em', textTransform: 'uppercase',
    borderBottom: '1px solid rgba(255,255,255,0.07)',
  },
  td: { padding: '.65rem .75rem', borderBottom: '1px solid rgba(255,255,255,0.04)', verticalAlign: 'middle' },
};

function StatusPill({ status }) {
  const colors = {
    active: { bg: 'rgba(34,197,94,0.15)', color: '#4ade80', border: 'rgba(34,197,94,0.3)' },
    expired: { bg: 'rgba(239,68,68,0.12)', color: '#f87171', border: 'rgba(239,68,68,0.3)' },
    pending: { bg: 'rgba(234,179,8,0.12)', color: '#fbbf24', border: 'rgba(234,179,8,0.3)' },
    cancelled: { bg: 'rgba(100,116,139,0.2)', color: '#94a3b8', border: 'rgba(100,116,139,0.3)' },
  };
  const c = colors[status] || colors.pending;
  return (
    <span style={{
      background: c.bg, color: c.color, border: `1px solid ${c.border}`,
      borderRadius: 6, fontSize: '.7rem', fontWeight: 700, padding: '.2rem .5rem',
    }}>
      {status?.toUpperCase() || 'UNKNOWN'}
    </span>
  );
}

export default function Admin() {
  const navigate = useNavigate();
  const { user, loading, signOut, getToken, isAdmin } = useAuth();
  const [tab, setTab] = useState('overview');
  const [events, setEvents] = useState([]);
  const [newLeadsCount, setNewLeadsCount] = useState(0);
  const [dataLoading, setDataLoading] = useState(false);

  // Guard: only admins
  useEffect(() => {
    if (!loading && (!user || !isAdmin)) {
      navigate('/admin/login', { replace: true });
    }
  }, [user, loading, isAdmin, navigate]);

  const authHeaders = useCallback(() => ({
    Authorization: `Bearer ${getToken()}`,
    'Content-Type': 'application/json',
    'X-Admin-Secret': localStorage.getItem('flash_it_admin_secret') || '',
  }), [getToken]);

  const loadData = useCallback(async () => {
    setDataLoading(true);
    try {
      const evRes = await fetch('/api/events', { headers: authHeaders() });
      if (evRes.ok) {
        const body = await evRes.json();
        setEvents(Array.isArray(body) ? body : body.events || []);
      }
      // New-leads count powers the Full Service tab badge. Best-effort — never
      // block the rest of the dashboard if the metrics endpoint is unavailable.
      try {
        const metrics = await getAdminMetrics();
        setNewLeadsCount(metrics?.totals?.newServiceRequests || 0);
      } catch (err) {
        console.warn('[admin] metrics (lead count) unavailable', err);
      }
    } catch (e) {
      console.error('[admin] loadData error', e);
    } finally {
      setDataLoading(false);
    }
  }, [authHeaders]);

  useEffect(() => {
    if (user && isAdmin) loadData();
  }, [user, isAdmin, loadData]);

  if (loading || !user) return null;

  return (
    <div style={S.page}>
      {/* Header */}
      <header style={S.header}>
        <div style={S.brand}>
          <span>⚡</span>
          <span>Flash-it Admin</span>
          <span style={S.badge}>ADMIN</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <span style={{ fontSize: '.8rem', color: '#64748b' }}>{user.email}</span>
          <button
            onClick={async () => { await signOut(); navigate('/admin/login'); }}
            style={{
              background: 'rgba(239,68,68,0.1)', color: '#f87171',
              border: '1px solid rgba(239,68,68,0.25)', borderRadius: 8,
              padding: '.4rem .75rem', fontSize: '.78rem', fontWeight: 600, cursor: 'pointer',
            }}
          >
            Sign out
          </button>
        </div>
      </header>

      {/* Nav tabs */}
      <nav style={S.nav}>
        {['overview', 'launch', 'events', 'full-service', 'customers', 'messages', 'products', 'analytics', 'create-event', 'templates', 'backgrounds'].map((t) => (
          <button key={t} style={S.tab(tab === t)} onClick={() => setTab(t)}>
            {{ overview: 'Overview', launch: '🚀 Launch', events: 'Events', 'full-service': 'Full Service', customers: 'Customers', messages: 'Messages', products: 'Products', analytics: 'Analytics', 'create-event': '+ New Event', templates: 'Templates', backgrounds: 'Backgrounds' }[t]}
            {t === 'full-service' && newLeadsCount > 0 && (
              <span style={{
                marginLeft: '.4rem', background: 'rgba(234,179,8,0.18)', color: '#fbbf24',
                border: '1px solid rgba(234,179,8,0.4)', borderRadius: 999,
                fontSize: '.62rem', fontWeight: 700, padding: '.05rem .4rem', verticalAlign: 'middle',
              }}>
                {newLeadsCount}
              </span>
            )}
          </button>
        ))}
      </nav>

      <div style={S.body}>
        {dataLoading && <p style={{ color: '#64748b', textAlign: 'center', padding: '3rem' }}>Loading…</p>}

        {/* Overview — KPI widgets + charts from /api/admin/metrics */}
        {tab === 'overview' && !dataLoading && (
          <>
            <AdminMetrics />

            <h3 style={{ fontSize: '.85rem', fontWeight: 700, color: '#94a3b8', margin: '1.75rem 0 .75rem', letterSpacing: '.04em' }}>
              RECENT EVENTS
            </h3>
            <div style={S.card}>
              <EventTable events={events.slice(0, 8)} authHeaders={authHeaders} onChanged={loadData} />
            </div>
          </>
        )}

        {/* Events */}
        {tab === 'events' && !dataLoading && (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h2 style={{ fontSize: '1rem', fontWeight: 700, color: '#f1f5f9', margin: 0 }}>
                All Events ({events.length})
              </h2>
              <button
                onClick={() => setTab('create-event')}
                style={{
                  background: 'linear-gradient(135deg, #dc2626, #f97316)',
                  color: '#fff', border: 'none', borderRadius: 8,
                  padding: '.5rem 1rem', fontSize: '.82rem', fontWeight: 600, cursor: 'pointer',
                }}
              >
                + New Event
              </button>
            </div>
            <div style={S.card}>
              <EventTable events={events} authHeaders={authHeaders} onChanged={loadData} />
            </div>
          </>
        )}

        {/* Full Service — leads pipeline from /api/admin/service-requests */}
        {tab === 'full-service' && !dataLoading && (
          <AdminFullService />
        )}

        {/* Customers — full contact table from /api/admin/customers */}
        {tab === 'customers' && !dataLoading && (
          <AdminCustomers />
        )}

        {/* Launch — auto-updating readiness checklist */}
        {tab === 'launch' && <AdminLaunch />}

        {/* Messages — bilingual email/SMS templates (self-contained CRM) */}
        {tab === 'messages' && <AdminMessageTemplates />}

        {/* Products — Solo plan catalogue (read-only view) */}
        {tab === 'products' && <AdminProducts />}

        {/* Analytics — platform charts + per-event delivery breakdown */}
        {tab === 'analytics' && !dataLoading && (
          <>
            <h2 style={{ fontSize: '1rem', fontWeight: 700, color: '#f1f5f9', marginBottom: '1.5rem' }}>Analytics</h2>
            <AdminMetrics />
            <div style={{ marginTop: '1.75rem' }}>
              <AnalyticsTab events={events} authHeaders={authHeaders} />
            </div>
          </>
        )}

        {/* Create Event */}
        {tab === 'create-event' && (
          <CreateEventForm
            getToken={getToken}
            adminHeaders={authHeaders}
            onCreated={() => { loadData(); setTab('events'); }}
          />
        )}

        {/* Templates */}
        {tab === 'templates' && (
          <TemplateDesigner adminHeaders={authHeaders} />
        )}

        {/* Backgrounds — global catalogue builder (admin-only, x-admin-secret) */}
        {tab === 'backgrounds' && <AdminBackgrounds />}
      </div>
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function StatCard({ label, value, accent = '#f1f5f9' }) {
  return (
    <div style={S.statCard}>
      <div style={S.statLabel}>{label}</div>
      <div style={{ ...S.statValue, color: accent }}>{value}</div>
    </div>
  );
}

function EventTable({ events, authHeaders, onChanged }) {
  const [copiedId, setCopiedId] = useState(null);

  async function patchEvent(id, body) {
    const res = await fetch(`/api/events/${id}`, { method: 'PATCH', headers: authHeaders(), body: JSON.stringify(body) });
    if (!res.ok) {
      const e = await res.json().catch(() => ({}));
      throw new Error(e.error || `Update failed (${res.status})`);
    }
    return res.json();
  }
  async function editName(ev) {
    const name = window.prompt('Event name:', ev.name || ev.eventName || '');
    if (name === null) return;
    try { await patchEvent(ev.id, { name: name.trim() }); onChanged && onChanged(); }
    catch (e) { alert(e.message); }
  }
  async function toggleCancel(ev) {
    const cancel = ev.status !== 'cancelled';
    if (!window.confirm(cancel ? `Cancel "${ev.name || ev.eventName}"? Guests can't capture while it's cancelled.` : `Re-activate "${ev.name || ev.eventName}"?`)) return;
    try { await patchEvent(ev.id, { status: cancel ? 'cancelled' : 'active' }); onChanged && onChanged(); }
    catch (e) { alert(e.message); }
  }
  async function extend(ev) {
    const d = window.prompt('Extend until (YYYY-MM-DD):', '');
    if (!d) return;
    const ts = Date.parse(`${d}T23:59:59`);
    if (Number.isNaN(ts)) { alert('Please enter a valid date like 2026-08-15.'); return; }
    try { await patchEvent(ev.id, { expires_at: new Date(ts).toISOString() }); onChanged && onChanged(); }
    catch (e) { alert(e.message); }
  }

  function copyVirtualBoothUrl(code, evId) {
    const url = `${window.location.origin}/v/${code}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopiedId(evId);
      setTimeout(() => setCopiedId(null), 2000);
    });
  }

  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={S.table}>
        <thead>
          <tr>
            <th style={S.th}>Event</th>
            <th style={S.th}>Code</th>
            <th style={S.th}>Date</th>
            <th style={S.th}>Type</th>
            <th style={S.th}>Plan</th>
            <th style={S.th}>Guests</th>
            <th style={S.th}>Status</th>
            <th style={S.th}>Virtual Booth</th>
            <th style={S.th}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {events.length === 0 && (
            <tr><td colSpan={9} style={{ ...S.td, textAlign: 'center', color: '#475569', padding: '2rem' }}>No events yet</td></tr>
          )}
          {events.map((ev) => {
            const code = ev.event_code || ev.eventCode || ev.id?.slice(0, 6) || '';
            const vbUrl = code ? `${window.location.origin}/v/${code}` : null;
            return (
              <tr key={ev.id}>
                <td style={{ ...S.td, fontWeight: 500 }}>{ev.name || ev.eventName || '—'}</td>
                <td style={{ ...S.td, fontFamily: 'monospace', color: '#a5b4fc', fontSize: '.82rem' }}>
                  {code || '—'}
                </td>
                <td style={{ ...S.td, color: '#94a3b8' }}>
                  {ev.date ? new Date(ev.date).toLocaleDateString() : '—'}
                </td>
                <td style={S.td}>
                  {(() => {
                    const st = ev.serviceType || ev.service_type || 'none';
                    const c = serviceTypeBadge(st);
                    return (
                      <span style={{
                        background: c.bg, color: c.color, border: `1px solid ${c.border}`,
                        borderRadius: 6, fontSize: '.68rem', fontWeight: 700, padding: '.2rem .45rem',
                        letterSpacing: '.03em',
                      }}>
                        {c.label}
                      </span>
                    );
                  })()}
                </td>
                <td style={{ ...S.td, color: '#94a3b8', fontSize: '.8rem', textTransform: 'capitalize' }}>
                  {ev.plan_tier || ev.planTier || '—'}
                </td>
                <td style={{ ...S.td, textAlign: 'center' }}>{ev.guest_count || 0}</td>
                <td style={S.td}><StatusPill status={ev.status} /></td>
                {/* Virtual Booth column */}
                <td style={{ ...S.td, whiteSpace: 'nowrap' }}>
                  {code ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '.3rem' }}>
                      <div style={{ position: 'relative', display: 'inline-block' }}>
                        <button
                          onClick={() => copyVirtualBoothUrl(code, ev.id)}
                          title="Copy virtual booth URL"
                          style={{
                            background: 'rgba(124,58,237,0.12)', color: '#a78bfa',
                            border: '1px solid rgba(124,58,237,0.25)', borderRadius: 6,
                            padding: '.25rem .45rem', fontSize: '.85rem',
                            cursor: 'pointer',
                          }}
                        >
                          📲
                        </button>
                        {copiedId === ev.id && (
                          <span style={{
                            position: 'absolute', bottom: '115%', left: '50%', transform: 'translateX(-50%)',
                            background: '#1e1b4b', color: '#a78bfa', border: '1px solid rgba(124,58,237,0.3)',
                            borderRadius: 6, padding: '.2rem .5rem', fontSize: '.7rem', fontWeight: 600,
                            whiteSpace: 'nowrap', pointerEvents: 'none',
                          }}>
                            Copied!
                          </span>
                        )}
                      </div>
                      <a
                        href={vbUrl}
                        target="_blank"
                        rel="noreferrer"
                        style={{
                          color: '#7c3aed', fontSize: '.68rem', textDecoration: 'underline',
                          fontFamily: 'monospace', maxWidth: 120, overflow: 'hidden',
                          textOverflow: 'ellipsis', display: 'block', whiteSpace: 'nowrap',
                        }}
                        title={vbUrl}
                      >
                        /v/{code}
                      </a>
                    </div>
                  ) : (
                    <span style={{ color: '#475569', fontSize: '.75rem' }}>—</span>
                  )}
                </td>
                <td style={{ ...S.td, whiteSpace: 'nowrap' }}>
                  <div style={{ display: 'flex', gap: '.4rem', alignItems: 'center' }}>
                    {/* Manage: edit name · extend · cancel/activate */}
                    <button onClick={() => editName(ev)} title="Edit name" style={{ background: 'rgba(99,102,241,0.15)', color: '#a5b4fc', border: '1px solid rgba(99,102,241,0.3)', borderRadius: 6, padding: '.25rem .45rem', fontSize: '.8rem', cursor: 'pointer', lineHeight: 1 }}>✏️</button>
                    <button onClick={() => extend(ev)} title="Extend expiry" style={{ background: 'rgba(234,179,8,0.12)', color: '#fbbf24', border: '1px solid rgba(234,179,8,0.25)', borderRadius: 6, padding: '.25rem .45rem', fontSize: '.8rem', cursor: 'pointer', lineHeight: 1 }}>🗓️</button>
                    <button onClick={() => toggleCancel(ev)} title={ev.status === 'cancelled' ? 'Re-activate' : 'Cancel'} style={{ background: ev.status === 'cancelled' ? 'rgba(34,197,94,0.12)' : 'rgba(239,68,68,0.12)', color: ev.status === 'cancelled' ? '#4ade80' : '#f87171', border: `1px solid ${ev.status === 'cancelled' ? 'rgba(34,197,94,0.3)' : 'rgba(239,68,68,0.3)'}`, borderRadius: 6, padding: '.25rem .45rem', fontSize: '.8rem', cursor: 'pointer', lineHeight: 1 }}>{ev.status === 'cancelled' ? '▶' : '✕'}</button>
                    {/* Export Guests CSV */}
                    {ev.id && (
                      <a
                        href={`/api/events/${ev.id}/export`}
                        target="_blank"
                        rel="noreferrer"
                        style={{
                          background: 'rgba(99,102,241,0.15)', color: '#a5b4fc',
                          border: '1px solid rgba(99,102,241,0.3)', borderRadius: 6,
                          padding: '.25rem .55rem', fontSize: '.7rem', fontWeight: 600,
                          textDecoration: 'none', cursor: 'pointer',
                        }}
                        title="Export guests as CSV"
                      >
                        CSV
                      </a>
                    )}
                    {/* Gallery link */}
                    {code && (
                      <a
                        href={`/gallery/${code}`}
                        target="_blank"
                        rel="noreferrer"
                        style={{
                          background: 'rgba(168,85,247,0.12)', color: '#c084fc',
                          border: '1px solid rgba(168,85,247,0.25)', borderRadius: 6,
                          padding: '.25rem .45rem', fontSize: '.85rem', textDecoration: 'none',
                          cursor: 'pointer',
                        }}
                        title="View gallery"
                      >
                        🖼️
                      </a>
                    )}
                    {/* Slideshow link */}
                    {code && (
                      <a
                        href={`/slideshow/${code}`}
                        target="_blank"
                        rel="noreferrer"
                        style={{
                          background: 'rgba(234,179,8,0.1)', color: '#fbbf24',
                          border: '1px solid rgba(234,179,8,0.25)', borderRadius: 6,
                          padding: '.25rem .45rem', fontSize: '.85rem', textDecoration: 'none',
                          cursor: 'pointer',
                        }}
                        title="View slideshow"
                      >
                        📺
                      </a>
                    )}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function CreateEventForm({ adminHeaders, onCreated }) {
  const [form, setForm] = useState({
    name: '', date: '', planTier: 'celebration', maxGuests: 100,
    smsCredits: 50, themes: '', eventCode: '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.name || !form.date) { setError('Name and date are required.'); return; }
    setError(''); setSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        date: form.date,
        planTier: form.planTier,
        maxGuests: Number(form.maxGuests) || 100,
        smsCredits: Number(form.smsCredits) || 50,
        themes: form.themes ? form.themes.split(',').map((t) => t.trim()).filter(Boolean) : [],
        eventCode: form.eventCode.trim().toUpperCase() || undefined,
      };
      const res = await fetch('/api/events', { method: 'POST', headers: adminHeaders(), body: JSON.stringify(payload) });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || 'Failed to create event');
      setSuccess(`Event created! Code: ${body.event_code || body.eventCode || body.id}`);
      setTimeout(onCreated, 1500);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  const plans = ['snapshot', 'celebration', 'premier'];

  return (
    <div style={{ maxWidth: 520 }}>
      <h2 style={{ fontSize: '1rem', fontWeight: 700, color: '#f1f5f9', marginBottom: '1.5rem' }}>Create New Event</h2>
      <div style={S.card}>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '.9rem' }}>
          <FormField label="Event Name" value={form.name} onChange={set('name')} placeholder="Maria & Carlos Wedding" />
          <FormField label="Event Date" value={form.date} onChange={set('date')} type="date" />
          <div style={{ display: 'flex', flexDirection: 'column', gap: '.4rem' }}>
            <label style={{ fontSize: '.75rem', color: '#94a3b8', fontWeight: 600 }}>Plan</label>
            <select
              value={form.planTier}
              onChange={set('planTier')}
              style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: '.65rem .85rem', color: '#f1f5f9', fontSize: '.9rem', outline: 'none' }}
            >
              {plans.map((p) => <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>)}
            </select>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '.75rem' }}>
            <FormField label="Max Guests" value={form.maxGuests} onChange={set('maxGuests')} type="number" />
            <FormField label="SMS Credits" value={form.smsCredits} onChange={set('smsCredits')} type="number" />
          </div>
          <FormField label="Event Code (optional)" value={form.eventCode} onChange={set('eventCode')} placeholder="AUTO-GENERATED" />
          <FormField label="Themes (comma-separated)" value={form.themes} onChange={set('themes')} placeholder="beach,galaxy,floral" />

          {error && <p style={{ color: '#f87171', fontSize: '.8rem', margin: 0 }}>{error}</p>}
          {success && <p style={{ color: '#4ade80', fontSize: '.8rem', margin: 0 }}>{success}</p>}

          <button
            type="submit"
            disabled={saving}
            style={{
              background: 'linear-gradient(135deg, #dc2626, #f97316)',
              color: '#fff', border: 'none', borderRadius: 10,
              padding: '.8rem', fontSize: '.95rem', fontWeight: 600,
              cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1,
            }}
          >
            {saving ? 'Creating…' : 'Create Event'}
          </button>
        </form>
      </div>
    </div>
  );
}

function AnalyticsTab({ events, authHeaders }) {
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(false);

  // Load analytics for first event (or aggregate if no specific event)
  useEffect(() => {
    if (events.length === 0) return;
    const firstEvent = events[0];
    if (!firstEvent?.id) return;
    setLoading(true);
    fetch(`/api/events/${firstEvent.id}/analytics`, { headers: authHeaders() })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => setAnalytics(data))
      .catch(() => setAnalytics(null))
      .finally(() => setLoading(false));
  }, [events]); // eslint-disable-line react-hooks/exhaustive-deps

  const totalSessions = events.reduce((sum, e) => sum + (e.guest_count || 0), 0);

  // Merge API analytics with local totals
  const qrCount = analytics?.deliveryBreakdown?.qr ?? analytics?.qr ?? 0;
  const smsCount = analytics?.deliveryBreakdown?.sms ?? analytics?.sms ?? 0;
  const emailCount = analytics?.deliveryBreakdown?.email ?? analytics?.email ?? 0;

  return (
    <div>
      <h3 style={{ fontSize: '.85rem', fontWeight: 700, color: '#94a3b8', marginBottom: '1rem', letterSpacing: '.04em' }}>
        PER-EVENT DELIVERY (FIRST EVENT)
      </h3>
      {loading && <p style={{ color: '#64748b' }}>Loading analytics…</p>}
      {!loading && (
        <>
          <div style={S.statGrid}>
            <StatCard label="Total Sessions" value={totalSessions} accent="#a855f7" />
            <StatCard label="QR Scans" value={qrCount} accent="#38bdf8" />
            <StatCard label="SMS Deliveries" value={smsCount} accent="#4ade80" />
            <StatCard label="Email Deliveries" value={emailCount} accent="#fbbf24" />
          </div>

          <h3 style={{ fontSize: '.85rem', fontWeight: 700, color: '#94a3b8', marginBottom: '.75rem', letterSpacing: '.04em' }}>
            DELIVERY METHOD BREAKDOWN
          </h3>
          <div style={S.card}>
            {(qrCount + smsCount + emailCount) === 0 ? (
              <p style={{ color: '#475569', textAlign: 'center', padding: '2rem 0', fontSize: '.9rem' }}>
                No delivery data yet. Data populates once guests use sharing.
              </p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '.75rem' }}>
                {[
                  { label: 'QR Code', count: qrCount, color: '#38bdf8' },
                  { label: 'SMS', count: smsCount, color: '#4ade80' },
                  { label: 'Email', count: emailCount, color: '#fbbf24' },
                ].map(({ label, count, color }) => {
                  const total = qrCount + smsCount + emailCount;
                  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
                  return (
                    <div key={label}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '.3rem' }}>
                        <span style={{ fontSize: '.82rem', color: '#94a3b8' }}>{label}</span>
                        <span style={{ fontSize: '.82rem', fontWeight: 700, color }}>{count} ({pct}%)</span>
                      </div>
                      <div style={{ height: 6, borderRadius: 4, background: 'rgba(255,255,255,0.06)' }}>
                        <div style={{ height: '100%', borderRadius: 4, background: color, width: `${pct}%`, transition: 'width .4s' }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function FormField({ label, value, onChange, type = 'text', placeholder = '' }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '.4rem' }}>
      <label style={{ fontSize: '.75rem', color: '#94a3b8', fontWeight: 600 }}>{label}</label>
      <input
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        style={{
          background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: 8, padding: '.65rem .85rem', color: '#f1f5f9',
          fontSize: '.9rem', outline: 'none', width: '100%', boxSizing: 'border-box',
        }}
        onFocus={(e) => (e.target.style.borderColor = '#dc2626')}
        onBlur={(e) => (e.target.style.borderColor = 'rgba(255,255,255,0.1)')}
      />
    </div>
  );
}
