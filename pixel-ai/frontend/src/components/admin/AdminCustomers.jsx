import { useState, useEffect, useCallback, useMemo } from 'react';
import { getAdminCustomers } from '../../utils/api.js';
import * as S from './adminStyles.js';

/**
 * AdminCustomers — the full customer contact table.
 *
 * Pulls every account from GET /api/admin/customers (admin-only) so Andres can
 * reach customers: email is a mailto:, phone (when present) a tel:. The table is
 * searchable (name/email) and sortable (joined / events / last active).
 * Host accounts may not have a phone — those cells render a dash.
 */

const SORTS = {
  joined: { label: 'Joined', key: 'createdAt', type: 'date' },
  events: { label: 'Events', key: 'eventsCount', type: 'num' },
  lastActive: { label: 'Last Active', key: 'lastActiveAt', type: 'date' },
};

function fmtDate(d) {
  if (!d) return '—';
  const t = new Date(d);
  return Number.isNaN(t.getTime()) ? '—' : t.toLocaleDateString();
}

function ServiceTypeBadge({ type }) {
  const c = S.serviceTypeBadge(type || 'none');
  return (
    <span style={{
      background: c.bg, color: c.color, border: `1px solid ${c.border}`,
      borderRadius: 6, fontSize: '.68rem', fontWeight: 700, padding: '.2rem .45rem',
      letterSpacing: '.03em',
    }}>
      {c.label}
    </span>
  );
}

export default function AdminCustomers() {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [sortKey, setSortKey] = useState('joined');
  const [sortDir, setSortDir] = useState('desc');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const { customers: list = [] } = await getAdminCustomers();
      setCustomers(list);
    } catch (e) {
      console.error('[admin] customers error', e);
      setError('Could not load customers.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const toggleSort = useCallback((key) => {
    setSortKey((prevKey) => {
      if (prevKey === key) {
        setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
        return prevKey;
      }
      setSortDir('desc');
      return key;
    });
  }, []);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = q
      ? customers.filter((c) =>
          (c.name || '').toLowerCase().includes(q) ||
          (c.email || '').toLowerCase().includes(q))
      : customers.slice();

    const { key, type } = SORTS[sortKey];
    const dir = sortDir === 'asc' ? 1 : -1;
    filtered.sort((a, b) => {
      const av = a[key];
      const bv = b[key];
      let cmp;
      if (type === 'date') {
        cmp = (new Date(av || 0).getTime() || 0) - (new Date(bv || 0).getTime() || 0);
      } else {
        cmp = (Number(av) || 0) - (Number(bv) || 0);
      }
      return cmp * dir;
    });
    return filtered;
  }, [customers, query, sortKey, sortDir]);

  const sortArrow = (key) => (sortKey === key ? (sortDir === 'asc' ? ' ▲' : ' ▼') : '');
  const sortableTh = (key, label) => (
    <th
      style={{ ...S.th, cursor: 'pointer', userSelect: 'none', color: sortKey === key ? '#fb923c' : S.th.color }}
      onClick={() => toggleSort(key)}
      title={`Sort by ${label}`}
    >
      {label}{sortArrow(key)}
    </th>
  );

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
        <h2 style={{ fontSize: '1rem', fontWeight: 700, color: '#f1f5f9', margin: 0 }}>
          Customers ({customers.length})
        </h2>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search name or email…"
          style={{
            background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 8, padding: '.5rem .75rem', color: '#f1f5f9',
            fontSize: '.85rem', outline: 'none', minWidth: 220,
          }}
          onFocus={(e) => (e.target.style.borderColor = '#dc2626')}
          onBlur={(e) => (e.target.style.borderColor = 'rgba(255,255,255,0.1)')}
        />
      </div>

      {loading && <p style={{ color: '#64748b', textAlign: 'center', padding: '3rem' }}>Loading customers…</p>}
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
                  <th style={S.th}>Type</th>
                  {sortableTh('events', 'Events')}
                  <th style={S.th}>Photos</th>
                  {sortableTh('lastActive', 'Last Active')}
                  {sortableTh('joined', 'Joined')}
                </tr>
              </thead>
              <tbody>
                {visible.length === 0 && (
                  <tr>
                    <td colSpan={8} style={S.emptyCell}>
                      {query ? 'No customers match your search' : 'No customers yet'}
                    </td>
                  </tr>
                )}
                {visible.map((c) => (
                  <tr key={c.id}>
                    <td style={{ ...S.td, fontWeight: 500 }}>{c.name || '—'}</td>
                    <td style={S.td}>
                      {c.email
                        ? <a href={`mailto:${c.email}`} style={S.link}>{c.email}</a>
                        : <span style={{ color: '#475569' }}>—</span>}
                    </td>
                    <td style={S.td}>
                      {c.phone
                        ? <a href={`tel:${c.phone}`} style={{ ...S.link, color: '#4ade80' }}>{c.phone}</a>
                        : <span style={{ color: '#475569' }}>—</span>}
                    </td>
                    <td style={S.td}><ServiceTypeBadge type={c.serviceType} /></td>
                    <td style={{ ...S.td, textAlign: 'center' }}>{c.eventsCount ?? 0}</td>
                    <td style={{ ...S.td, textAlign: 'center' }}>{c.photosCount ?? 0}</td>
                    <td style={{ ...S.td, color: '#94a3b8', whiteSpace: 'nowrap' }}>{fmtDate(c.lastActiveAt)}</td>
                    <td style={{ ...S.td, color: '#64748b', whiteSpace: 'nowrap' }}>{fmtDate(c.createdAt)}</td>
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
