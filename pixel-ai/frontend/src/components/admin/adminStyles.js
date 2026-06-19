// Shared admin UI tokens — mirrors the dark style in src/pages/Admin.jsx
// (red/orange accent, #1a1a2e cards) so the new dashboard pieces match.

export const card = {
  background: '#1a1a2e',
  border: '1px solid rgba(255,255,255,0.07)',
  borderRadius: 12,
  padding: '1.25rem',
};

export const statGrid = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
  gap: '1rem',
  marginBottom: '1.5rem',
};

export const statCard = {
  background: '#1a1a2e',
  border: '1px solid rgba(255,255,255,0.07)',
  borderRadius: 12,
  padding: '1rem 1.25rem',
};

export const statLabel = {
  fontSize: '.7rem',
  color: '#64748b',
  fontWeight: 600,
  letterSpacing: '.06em',
  textTransform: 'uppercase',
};

export const statValue = {
  fontSize: '1.75rem',
  fontWeight: 700,
  color: '#f1f5f9',
  marginTop: '.25rem',
};

export const sectionTitle = {
  fontSize: '.85rem',
  fontWeight: 700,
  color: '#94a3b8',
  marginBottom: '.75rem',
  letterSpacing: '.04em',
};

export const table = { width: '100%', borderCollapse: 'collapse', fontSize: '.84rem' };

export const th = {
  textAlign: 'left',
  padding: '.6rem .75rem',
  color: '#64748b',
  fontWeight: 600,
  fontSize: '.72rem',
  letterSpacing: '.06em',
  textTransform: 'uppercase',
  borderBottom: '1px solid rgba(255,255,255,0.07)',
};

export const td = {
  padding: '.65rem .75rem',
  borderBottom: '1px solid rgba(255,255,255,0.04)',
  verticalAlign: 'middle',
};

export const link = { color: '#a5b4fc', textDecoration: 'none' };

export const emptyCell = {
  ...td,
  textAlign: 'center',
  color: '#475569',
  padding: '2rem',
};

// Chart palette — warm accent first, then cool secondaries.
export const CHART_COLORS = ['#f97316', '#dc2626', '#a855f7', '#38bdf8', '#4ade80', '#fbbf24', '#f472b6'];

// Service-type badge styling shared by events + customers tables.
export function serviceTypeBadge(type) {
  const map = {
    managed: { bg: 'rgba(249,115,22,0.15)', color: '#fb923c', border: 'rgba(249,115,22,0.35)', label: 'MANAGED' },
    solo: { bg: 'rgba(56,189,248,0.12)', color: '#38bdf8', border: 'rgba(56,189,248,0.3)', label: 'SOLO' },
    none: { bg: 'rgba(100,116,139,0.18)', color: '#94a3b8', border: 'rgba(100,116,139,0.3)', label: '—' },
  };
  return map[type] || map.none;
}

// Lead pipeline status colours.
export function leadStatusColor(status) {
  const map = {
    new: { bg: 'rgba(234,179,8,0.14)', color: '#fbbf24', border: 'rgba(234,179,8,0.35)' },
    contacted: { bg: 'rgba(56,189,248,0.12)', color: '#38bdf8', border: 'rgba(56,189,248,0.3)' },
    won: { bg: 'rgba(34,197,94,0.15)', color: '#4ade80', border: 'rgba(34,197,94,0.3)' },
    lost: { bg: 'rgba(239,68,68,0.12)', color: '#f87171', border: 'rgba(239,68,68,0.3)' },
  };
  return map[status] || map.new;
}
