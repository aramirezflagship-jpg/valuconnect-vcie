import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  getAdminCustomers,
  adminCreateCustomer,
  adminUpdateCustomer,
  adminResetCustomerPassword,
} from '../../utils/api.js';
import * as S from './adminStyles.js';

const inputStyle = {
  background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: 8, padding: '.5rem .7rem', color: '#f1f5f9', fontSize: '.85rem',
  outline: 'none', boxSizing: 'border-box',
};
const btn = (bg) => ({ background: bg, color: '#fff', border: 'none', borderRadius: 8, padding: '.45rem .8rem', fontSize: '.78rem', fontWeight: 600, cursor: 'pointer' });

function AddCustomerForm({ onCreated }) {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState('customer');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null); // {kind, text}

  async function submit(e) {
    e.preventDefault();
    if (!email.trim()) { setMsg({ kind: 'err', text: 'Email is required.' }); return; }
    setBusy(true); setMsg(null);
    try {
      const res = await adminCreateCustomer({ email: email.trim(), name: name.trim() || undefined, role });
      setMsg({ kind: 'ok', text: res.tempPassword ? `Created. Temp password: ${res.tempPassword} (share it; they can reset later).` : 'Customer created.' });
      setEmail(''); setName(''); setRole('customer');
      onCreated();
    } catch (err) {
      setMsg({ kind: 'err', text: err?.response?.data?.error || err.message || 'Create failed' });
    } finally {
      setBusy(false);
    }
  }

  if (!open) {
    return <button onClick={() => setOpen(true)} style={btn('linear-gradient(135deg,#dc2626,#f97316)')}>+ Add customer</button>;
  }
  return (
    <form onSubmit={submit} style={{ ...S.card, display: 'flex', flexWrap: 'wrap', gap: '.6rem', alignItems: 'flex-end' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '.25rem' }}>
        <label style={{ fontSize: '.7rem', color: '#94a3b8' }}>Email *</label>
        <input style={{ ...inputStyle, minWidth: 200 }} value={email} onChange={(e) => setEmail(e.target.value)} placeholder="customer@email.com" />
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '.25rem' }}>
        <label style={{ fontSize: '.7rem', color: '#94a3b8' }}>Name</label>
        <input style={{ ...inputStyle, minWidth: 160 }} value={name} onChange={(e) => setName(e.target.value)} placeholder="Optional" />
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '.25rem' }}>
        <label style={{ fontSize: '.7rem', color: '#94a3b8' }}>Role</label>
        <select style={inputStyle} value={role} onChange={(e) => setRole(e.target.value)}>
          <option value="customer">customer</option>
          <option value="admin">admin</option>
        </select>
      </div>
      <button type="submit" disabled={busy} style={{ ...btn('linear-gradient(135deg,#16a34a,#22c55e)'), opacity: busy ? 0.6 : 1 }}>{busy ? 'Creating…' : 'Create'}</button>
      <button type="button" onClick={() => { setOpen(false); setMsg(null); }} style={{ ...btn('transparent'), border: '1px solid rgba(255,255,255,0.12)', color: '#94a3b8' }}>Cancel</button>
      {msg && <div style={{ flexBasis: '100%', fontSize: '.78rem', color: msg.kind === 'ok' ? '#4ade80' : '#f87171' }}>{msg.text}</div>}
    </form>
  );
}

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

  const handleEdit = useCallback(async (c) => {
    const name = window.prompt(`Edit name for ${c.email}:`, c.name || '');
    if (name === null) return; // cancelled
    const role = window.confirm('Make this account an ADMIN? (OK = admin, Cancel = customer)') ? 'admin' : 'customer';
    try {
      await adminUpdateCustomer(c.id, { name: name.trim(), role });
      await load();
    } catch (e) {
      alert(e?.response?.data?.error || e.message || 'Update failed');
    }
  }, [load]);

  const handleReset = useCallback(async (c) => {
    if (!window.confirm(`Reset password for ${c.email}? A temporary password will be generated for you to share.`)) return;
    try {
      const res = await adminResetCustomerPassword(c.id);
      alert(res.tempPassword ? `New temporary password for ${c.email}:\n\n${res.tempPassword}\n\nShare it; they can change it via "Forgot password".` : 'Password reset.');
    } catch (e) {
      alert(e?.response?.data?.error || e.message || 'Reset failed');
    }
  }, []);

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
        <div style={{ display: 'flex', gap: '.6rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search name or email…"
            style={{
              background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: 8, padding: '.5rem .75rem', color: '#f1f5f9',
              fontSize: '.85rem', outline: 'none', minWidth: 200,
            }}
            onFocus={(e) => (e.target.style.borderColor = '#dc2626')}
            onBlur={(e) => (e.target.style.borderColor = 'rgba(255,255,255,0.1)')}
          />
          <AddCustomerForm onCreated={load} />
        </div>
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
                  <th style={S.th}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {visible.length === 0 && (
                  <tr>
                    <td colSpan={9} style={S.emptyCell}>
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
                    <td style={{ ...S.td, whiteSpace: 'nowrap' }}>
                      <div style={{ display: 'flex', gap: '.35rem' }}>
                        <button onClick={() => handleEdit(c)} title="Edit name / role" style={btn('rgba(99,102,241,0.2)')}>Edit</button>
                        <button onClick={() => handleReset(c)} title="Reset password" style={btn('rgba(234,179,8,0.2)')}>Reset PW</button>
                      </div>
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
