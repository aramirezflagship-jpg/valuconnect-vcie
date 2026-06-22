import { useState, useEffect, useCallback } from 'react';
import { getAdminProducts, patchAdminProduct } from '../../utils/api.js';

/**
 * AdminProducts — the Solo plan catalogue. Shows each tier (code defaults +
 * admin overrides) and lets the admin edit price/limits/label inline. Edits
 * persist to the plans table (migration 0005) and are what Stripe charges; if
 * 0005 isn't applied yet the save returns a clear message.
 */

const card = { background: '#1a1a2e', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 12, padding: '1.1rem' };
const input = { background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 6, padding: '.35rem .5rem', color: '#f1f5f9', fontSize: '.82rem', width: '100%', boxSizing: 'border-box', outline: 'none' };
const btn = (bg) => ({ background: bg, color: '#fff', border: 'none', borderRadius: 7, padding: '.4rem .7rem', fontSize: '.76rem', fontWeight: 600, cursor: 'pointer' });

function ProductCard({ p, editable, onSaved }) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState(p);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');

  useEffect(() => { setForm(p); }, [p]);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  async function save() {
    setBusy(true); setMsg('');
    try {
      const patch = {
        label: form.label,
        price: Number(form.price),
        smsCredits: Number(form.smsCredits),
        expiresDays: Number(form.expiresDays),
      };
      if (form.maxGuests !== '' && form.maxGuests != null && String(form.maxGuests).toLowerCase() !== 'unlimited') {
        patch.maxGuests = Number(form.maxGuests);
      }
      const res = await patchAdminProduct(p.key, patch);
      setEditing(false);
      onSaved(res.product);
    } catch (e) {
      setMsg(e?.response?.data?.error || e.message || 'Save failed');
    } finally {
      setBusy(false);
    }
  }

  if (!editing) {
    return (
      <div style={card}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div style={{ fontSize: '.95rem', fontWeight: 700, color: '#f1f5f9' }}>{p.label}</div>
          {editable && <button onClick={() => setEditing(true)} style={btn('rgba(99,102,241,0.2)')}>Edit</button>}
        </div>
        <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#fb923c', margin: '.25rem 0 .6rem' }}>${p.price}</div>
        <div style={{ fontSize: '.78rem', color: '#94a3b8', lineHeight: 1.8 }}>
          <div>👥 {p.maxGuests == null ? 'Unlimited' : p.maxGuests} guests</div>
          <div>💬 {p.smsCredits} SMS credits</div>
          <div>📅 {p.expiresDays}-day event</div>
          <div>🎨 {p.themes === 'all' ? 'All themes' : `${p.themes} theme(s)`}</div>
        </div>
        <div style={{ fontSize: '.62rem', color: '#475569', marginTop: '.6rem', fontFamily: 'monospace' }}>key: {p.key}</div>
      </div>
    );
  }

  return (
    <div style={{ ...card, border: '1px solid rgba(99,102,241,0.4)' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '.5rem' }}>
        <label style={{ fontSize: '.68rem', color: '#94a3b8' }}>Label<input style={input} value={form.label ?? ''} onChange={set('label')} /></label>
        <label style={{ fontSize: '.68rem', color: '#94a3b8' }}>Price (USD)<input type="number" min="0" style={input} value={form.price ?? ''} onChange={set('price')} /></label>
        <label style={{ fontSize: '.68rem', color: '#94a3b8' }}>Max guests (blank = unlimited)<input style={input} value={form.maxGuests ?? ''} onChange={set('maxGuests')} placeholder="Unlimited" /></label>
        <label style={{ fontSize: '.68rem', color: '#94a3b8' }}>SMS credits<input type="number" min="0" style={input} value={form.smsCredits ?? ''} onChange={set('smsCredits')} /></label>
        <label style={{ fontSize: '.68rem', color: '#94a3b8' }}>Event duration (days)<input type="number" min="1" style={input} value={form.expiresDays ?? ''} onChange={set('expiresDays')} /></label>
        {msg && <span style={{ fontSize: '.72rem', color: '#fbbf24' }}>{msg}</span>}
        <div style={{ display: 'flex', gap: '.5rem', marginTop: '.25rem' }}>
          <button onClick={save} disabled={busy} style={{ ...btn('linear-gradient(135deg,#16a34a,#22c55e)'), opacity: busy ? 0.6 : 1 }}>{busy ? 'Saving…' : 'Save'}</button>
          <button onClick={() => { setEditing(false); setForm(p); setMsg(''); }} style={{ ...btn('transparent'), border: '1px solid rgba(255,255,255,0.12)', color: '#94a3b8' }}>Cancel</button>
        </div>
      </div>
    </div>
  );
}

export default function AdminProducts() {
  const [products, setProducts] = useState(null);
  const [editable, setEditable] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setError('');
    try {
      const d = await getAdminProducts();
      setProducts(d.products || []);
      setEditable(!!d.editable);
    } catch (e) {
      setError(e?.response?.data?.error || e.message || 'Failed to load products');
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const onSaved = useCallback((updated) => {
    setProducts((prev) => prev.map((p) => (p.key === updated.key ? { ...p, ...updated } : p)));
  }, []);

  if (error) return <p style={{ color: '#f87171', fontSize: '.85rem' }}>{error}</p>;
  if (!products) return <p style={{ color: '#64748b', textAlign: 'center', padding: '2rem' }}>Loading products…</p>;

  const solo = products.filter((p) => (p.serviceType || 'solo') === 'solo');
  const managed = products.filter((p) => p.serviceType === 'managed');

  const Section = ({ title, subtitle, list }) =>
    list.length === 0 ? null : (
      <div style={{ marginBottom: '1.75rem' }}>
        <h3 style={{ fontSize: '.85rem', fontWeight: 700, color: '#cbd5e1', margin: '0 0 .15rem' }}>{title}</h3>
        <p style={{ fontSize: '.72rem', color: '#64748b', margin: '0 0 .8rem' }}>{subtitle}</p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '1rem' }}>
          {list.map((p) => <ProductCard key={p.key} p={p} editable={editable} onSaved={onSaved} />)}
        </div>
      </div>
    );

  return (
    <div>
      <h2 style={{ fontSize: '1rem', fontWeight: 700, color: '#f1f5f9', margin: '0 0 .25rem' }}>Products & Pricing</h2>
      <p style={{ fontSize: '.78rem', color: '#64748b', margin: '0 0 1.25rem' }}>
        The packages your customers pay for. {editable
          ? 'Edit any tier and Save — changes take effect immediately (Stripe charges these for Solo).'
          : 'Editing turns on once Supabase is connected + migration 0005 is applied (until then these are the code defaults).'}
      </p>

      <Section
        title="Solo · self-serve"
        subtitle="Bought online via Stripe checkout. These exact prices are charged."
        list={solo}
      />
      <Section
        title="Full Service · managed"
        subtitle="You run the booth — booked by request and invoiced (not self-serve checkout). Prices below are starting points; edit to your real pricing."
        list={managed}
      />

      {/* Discounts how-to */}
      <div style={{ background: 'rgba(37,99,235,0.08)', border: '1px solid rgba(37,99,235,0.25)', borderRadius: 12, padding: '1rem 1.1rem', marginTop: '.5rem' }}>
        <div style={{ fontSize: '.82rem', fontWeight: 700, color: '#f1f5f9', marginBottom: '.35rem' }}>💸 How to apply discounts</div>
        <ul style={{ margin: 0, paddingLeft: '1.1rem', fontSize: '.78rem', color: '#94a3b8', lineHeight: 1.7 }}>
          <li><b>Solo (online):</b> create a <b>promotion code</b> in Stripe → Dashboard → <i>Products → Coupons</i> (set % or $ off, expiry, usage limits). Customers enter it at checkout — the discount box is already enabled.</li>
          <li><b>Full Service (invoiced):</b> apply the discount directly on the quote/invoice, or just edit the tier price here for a one-off.</li>
        </ul>
      </div>
    </div>
  );
}
