import { useState, useEffect, useCallback } from 'react';
import { getAdminServiceRequests, patchServiceRequestStatus } from '../../utils/api.js';
import * as S from './adminStyles.js';

/**
 * AdminFullService — the "Full Service" leads pipeline.
 *
 * Lists service requests from GET /api/admin/service-requests (admin-only) and
 * lets Andres work each lead: email/phone are click-to-contact links and the
 * status is an inline dropdown that PATCHes /api/admin/service-requests/:id.
 */

const STATUSES = ['new', 'contacted', 'won', 'lost'];

function fmtDate(d) {
  if (!d) return '—';
  const t = new Date(d);
  return Number.isNaN(t.getTime()) ? '—' : t.toLocaleDateString();
}

function StatusSelect({ value, onChange, disabled }) {
  const c = S.leadStatusColor(value);
  return (
    <select
      value={value || 'new'}
      disabled={disabled}
      onChange={(e) => onChange(e.target.value)}
      style={{
        background: c.bg, color: c.color, border: `1px solid ${c.border}`,
        borderRadius: 6, fontSize: '.72rem', fontWeight: 700, padding: '.3rem .5rem',
        textTransform: 'uppercase', letterSpacing: '.04em', cursor: disabled ? 'wait' : 'pointer',
        outline: 'none',
      }}
    >
      {STATUSES.map((s) => (
        <option key={s} value={s} style={{ background: '#1a1a2e', color: '#f1f5f9' }}>
          {s.toUpperCase()}
        </option>
      ))}
    </select>
  );
}

export default function AdminFullService() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [savingId, setSavingId] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const { requests: list = [] } = await getAdminServiceRequests();
      setRequests(list);
    } catch (e) {
      console.error('[admin] service-requests error', e);
      setError('Could not load service requests.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const updateStatus = useCallback(async (id, status) => {
    const prev = requests;
    // Optimistic update.
    setRequests((rs) => rs.map((r) => (r.id === id ? { ...r, status } : r)));
    setSavingId(id);
    try {
      await patchServiceRequestStatus(id, status);
    } catch (e) {
      console.error('[admin] patch status error', e);
      setRequests(prev); // rollback
      setError('Could not update status — reverted.');
    } finally {
      setSavingId(null);
    }
  }, [requests]);

  const newCount = requests.filter((r) => (r.status || 'new') === 'new').length;

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '.75rem', marginBottom: '1rem' }}>
        <h2 style={{ fontSize: '1rem', fontWeight: 700, color: '#f1f5f9', margin: 0 }}>
          Full Service Leads ({requests.length})
        </h2>
        {newCount > 0 && (
          <span style={{
            background: 'rgba(234,179,8,0.16)', color: '#fbbf24',
            border: '1px solid rgba(234,179,8,0.35)', borderRadius: 999,
            fontSize: '.7rem', fontWeight: 700, padding: '.2rem .6rem', letterSpacing: '.03em',
          }}>
            {newCount} NEW
          </span>
        )}
      </div>

      {loading && <p style={{ color: '#64748b', textAlign: 'center', padding: '3rem' }}>Loading leads…</p>}
      {error && !loading && <p style={{ color: '#f87171', fontSize: '.85rem', marginBottom: '.75rem' }}>{error}</p>}

      {!loading && (
        <div style={S.card}>
          <div style={{ overflowX: 'auto' }}>
            <table style={S.table}>
              <thead>
                <tr>
                  <th style={S.th}>Name</th>
                  <th style={S.th}>Email</th>
                  <th style={S.th}>Phone</th>
                  <th style={S.th}>Event Type</th>
                  <th style={S.th}>Event Date</th>
                  <th style={S.th}>Message</th>
                  <th style={S.th}>Received</th>
                  <th style={S.th}>Status</th>
                </tr>
              </thead>
              <tbody>
                {requests.length === 0 && (
                  <tr><td colSpan={8} style={S.emptyCell}>No service requests yet</td></tr>
                )}
                {requests.map((r) => (
                  <tr key={r.id}>
                    <td style={{ ...S.td, fontWeight: 500 }}>{r.name || '—'}</td>
                    <td style={S.td}>
                      {r.email
                        ? <a href={`mailto:${r.email}`} style={S.link}>{r.email}</a>
                        : <span style={{ color: '#475569' }}>—</span>}
                    </td>
                    <td style={S.td}>
                      {r.phone
                        ? <a href={`tel:${r.phone}`} style={{ ...S.link, color: '#4ade80' }}>{r.phone}</a>
                        : <span style={{ color: '#475569' }}>—</span>}
                    </td>
                    <td style={{ ...S.td, color: '#94a3b8', textTransform: 'capitalize' }}>{r.event_type || '—'}</td>
                    <td style={{ ...S.td, color: '#94a3b8' }}>{fmtDate(r.event_date)}</td>
                    <td style={{ ...S.td, maxWidth: 280, color: '#cbd5e1' }}>
                      <span title={r.message || ''} style={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {r.message || '—'}
                      </span>
                    </td>
                    <td style={{ ...S.td, color: '#64748b', whiteSpace: 'nowrap' }}>{fmtDate(r.created_at)}</td>
                    <td style={S.td}>
                      <StatusSelect
                        value={r.status}
                        disabled={savingId === r.id}
                        onChange={(status) => updateStatus(r.id, status)}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
