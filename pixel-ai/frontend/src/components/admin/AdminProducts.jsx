import { useState, useEffect } from 'react';
import { getAdminProducts } from '../../utils/api.js';

/**
 * AdminProducts — read-only view of the Solo plan catalogue. Editing
 * prices/limits will persist once a `plans` table is added (future migration);
 * for now these are the live values used by Stripe checkout.
 */
export default function AdminProducts() {
  const [products, setProducts] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    getAdminProducts()
      .then((d) => setProducts(d.products || []))
      .catch((e) => setError(e?.response?.data?.error || e.message || 'Failed to load products'));
  }, []);

  if (error) return <p style={{ color: '#f87171', fontSize: '.85rem' }}>{error}</p>;
  if (!products) return <p style={{ color: '#64748b', textAlign: 'center', padding: '2rem' }}>Loading products…</p>;

  return (
    <div>
      <h2 style={{ fontSize: '1rem', fontWeight: 700, color: '#f1f5f9', margin: '0 0 .25rem' }}>Products & Pricing</h2>
      <p style={{ fontSize: '.78rem', color: '#64748b', margin: '0 0 1rem' }}>
        The self-serve (Solo) plans your customers buy at checkout. <b>View-only for now</b> — in-app
        editing persists once the products table is added (next DB pass). Stripe uses these values live.
      </p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(190px, 1fr))', gap: '1rem' }}>
        {products.map((p) => (
          <div key={p.key} style={{ background: '#1a1a2e', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 12, padding: '1.1rem' }}>
            <div style={{ fontSize: '.95rem', fontWeight: 700, color: '#f1f5f9' }}>{p.label}</div>
            <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#fb923c', margin: '.25rem 0 .6rem' }}>${p.price}</div>
            <div style={{ fontSize: '.78rem', color: '#94a3b8', lineHeight: 1.8 }}>
              <div>👥 {p.maxGuests == null ? 'Unlimited' : p.maxGuests} guests</div>
              <div>💬 {p.smsCredits} SMS credits</div>
              <div>📅 {p.expiresDays}-day event</div>
              <div>🎨 {p.themes === 'all' ? 'All themes' : `${p.themes} theme(s)`}</div>
            </div>
            <div style={{ fontSize: '.62rem', color: '#475569', marginTop: '.6rem', fontFamily: 'monospace' }}>key: {p.key}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
