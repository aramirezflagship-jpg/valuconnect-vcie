import { useState, useEffect, useCallback } from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
} from 'recharts';
import { getAdminMetrics } from '../../utils/api.js';
import * as S from './adminStyles.js';

/**
 * AdminMetrics — the upgraded overview/analytics dashboard.
 *
 * Pulls aggregate platform stats from GET /api/admin/metrics (admin-only,
 * x-admin-secret header) and renders KPI widgets + real recharts charts:
 *   • KPI cards: events, photos, customers, new leads
 *   • Area chart: events/day + photos/day over the last 30 days
 *   • Donut: Managed vs Solo events, Natural vs Character photos
 *   • Bar: top event categories
 *   • Marketing widget: opt-in rate
 *
 * Lays out as a responsive grid of #1a1a2e cards matching the admin style.
 */

const AXIS = { fontSize: 11, fill: '#64748b' };
const TOOLTIP_STYLE = {
  background: '#0d0d1a',
  border: '1px solid rgba(255,255,255,0.12)',
  borderRadius: 8,
  fontSize: '.78rem',
  color: '#f1f5f9',
};

function StatCard({ label, value, accent = '#f1f5f9' }) {
  return (
    <div style={S.statCard}>
      <div style={S.statLabel}>{label}</div>
      <div style={{ ...S.statValue, color: accent }}>{value}</div>
    </div>
  );
}

function ChartCard({ title, children, span = 1 }) {
  return (
    <div style={{ ...S.card, gridColumn: `span ${span}`, minWidth: 0 }}>
      <h3 style={{ ...S.sectionTitle, marginBottom: '1rem' }}>{title}</h3>
      {children}
    </div>
  );
}

/** Merge the two timeseries (events + photos) into one date-keyed array. */
function mergeTimeseries(eventsTs = [], photosTs = []) {
  const byDate = new Map();
  for (const { date, count } of eventsTs) {
    byDate.set(date, { date, events: count, photos: 0 });
  }
  for (const { date, count } of photosTs) {
    const row = byDate.get(date) || { date, events: 0, photos: 0 };
    row.photos = count;
    byDate.set(date, row);
  }
  return [...byDate.values()].sort((a, b) => (a.date < b.date ? -1 : 1));
}

/** Turn a { key: n } record into a sorted [{ name, value }] array (top N). */
function recordToBars(record = {}, topN = 8) {
  return Object.entries(record)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, topN);
}

const fmtDate = (d) => {
  // 'YYYY-MM-DD' → 'M/D' without constructing a TZ-shifted Date.
  const parts = String(d).split('-');
  return parts.length === 3 ? `${Number(parts[1])}/${Number(parts[2])}` : d;
};

function Donut({ data, colors }) {
  const total = data.reduce((s, d) => s + d.value, 0);
  if (total === 0) {
    return <p style={{ color: '#475569', textAlign: 'center', padding: '2.5rem 0', fontSize: '.85rem' }}>No data yet</p>;
  }
  return (
    <ResponsiveContainer width="100%" height={220}>
      <PieChart>
        <Pie data={data} dataKey="value" nameKey="name" innerRadius={50} outerRadius={80} paddingAngle={2} stroke="none">
          {data.map((entry, i) => (
            <Cell key={entry.name} fill={colors[i % colors.length]} />
          ))}
        </Pie>
        <Tooltip contentStyle={TOOLTIP_STYLE} />
        <Legend wrapperStyle={{ fontSize: '.78rem', color: '#94a3b8' }} />
      </PieChart>
    </ResponsiveContainer>
  );
}

export default function AdminMetrics() {
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await getAdminMetrics();
      setMetrics(data);
    } catch (e) {
      console.error('[admin] metrics error', e);
      setError(e?.response?.status === 401 || e?.response?.status === 403
        ? 'Not authorized — check the admin secret.'
        : 'Could not load metrics.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  if (loading) {
    return <p style={{ color: '#64748b', textAlign: 'center', padding: '3rem' }}>Loading metrics…</p>;
  }
  if (error) {
    return (
      <div style={{ ...S.card, textAlign: 'center' }}>
        <p style={{ color: '#f87171', margin: 0 }}>{error}</p>
        <button
          onClick={load}
          style={{
            marginTop: '1rem', background: 'rgba(239,68,68,0.1)', color: '#f87171',
            border: '1px solid rgba(239,68,68,0.25)', borderRadius: 8,
            padding: '.45rem .9rem', fontSize: '.8rem', fontWeight: 600, cursor: 'pointer',
          }}
        >
          Retry
        </button>
      </div>
    );
  }
  if (!metrics) return null;

  const {
    totals = {},
    eventsByServiceType = {},
    photosByMode = {},
    eventsByCategory = {},
    eventsTimeseries = [],
    photosTimeseries = [],
    marketing = {},
  } = metrics;

  const timeseries = mergeTimeseries(eventsTimeseries, photosTimeseries);
  const serviceTypeData = [
    { name: 'Managed', value: eventsByServiceType.managed || 0 },
    { name: 'Solo', value: eventsByServiceType.solo || 0 },
  ];
  const modeData = [
    { name: 'Natural', value: photosByMode.natural || 0 },
    { name: 'Character', value: photosByMode.character || 0 },
    ...(photosByMode.unknown ? [{ name: 'Unknown', value: photosByMode.unknown }] : []),
  ];
  const categoryBars = recordToBars(eventsByCategory);
  const optInRate = Math.round((marketing.optInRate || 0) * (marketing.optInRate <= 1 ? 100 : 1));

  return (
    <div>
      {/* KPI widgets */}
      <div style={S.statGrid}>
        <StatCard label="Events" value={totals.events ?? 0} accent="#fb923c" />
        <StatCard label="Photos" value={totals.photos ?? 0} accent="#a855f7" />
        <StatCard label="Customers" value={totals.customers ?? 0} accent="#38bdf8" />
        <StatCard label="New Leads" value={totals.newServiceRequests ?? 0} accent="#fbbf24" />
      </div>

      {/* Charts grid — responsive 2-up that collapses to 1-up on narrow screens */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
          gap: '1rem',
        }}
      >
        {/* Activity area chart spans full width */}
        <ChartCard title="ACTIVITY — LAST 30 DAYS" span={2}>
          {timeseries.length === 0 ? (
            <p style={{ color: '#475569', textAlign: 'center', padding: '2.5rem 0', fontSize: '.85rem' }}>No activity yet</p>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={timeseries} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                <defs>
                  <linearGradient id="gEvents" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#f97316" stopOpacity={0.5} />
                    <stop offset="100%" stopColor="#f97316" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gPhotos" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#a855f7" stopOpacity={0.5} />
                    <stop offset="100%" stopColor="#a855f7" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" vertical={false} />
                <XAxis dataKey="date" tickFormatter={fmtDate} tick={AXIS} stroke="rgba(255,255,255,0.1)" minTickGap={24} />
                <YAxis tick={AXIS} stroke="rgba(255,255,255,0.1)" allowDecimals={false} width={32} />
                <Tooltip contentStyle={TOOLTIP_STYLE} labelFormatter={fmtDate} />
                <Legend wrapperStyle={{ fontSize: '.78rem', color: '#94a3b8' }} />
                <Area type="monotone" dataKey="events" name="Events" stroke="#f97316" strokeWidth={2} fill="url(#gEvents)" />
                <Area type="monotone" dataKey="photos" name="Photos" stroke="#a855f7" strokeWidth={2} fill="url(#gPhotos)" />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        {/* Managed vs Solo donut */}
        <ChartCard title="EVENTS — MANAGED vs SOLO">
          <Donut data={serviceTypeData} colors={['#fb923c', '#38bdf8']} />
        </ChartCard>

        {/* Natural vs Character donut */}
        <ChartCard title="PHOTOS — NATURAL vs CHARACTER">
          <Donut data={modeData} colors={['#4ade80', '#a855f7', '#64748b']} />
        </ChartCard>

        {/* Top categories bar */}
        <ChartCard title="TOP EVENT CATEGORIES" span={2}>
          {categoryBars.length === 0 ? (
            <p style={{ color: '#475569', textAlign: 'center', padding: '2.5rem 0', fontSize: '.85rem' }}>No categories yet</p>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={categoryBars} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" vertical={false} />
                <XAxis dataKey="name" tick={AXIS} stroke="rgba(255,255,255,0.1)" interval={0} angle={-15} textAnchor="end" height={50} />
                <YAxis tick={AXIS} stroke="rgba(255,255,255,0.1)" allowDecimals={false} width={32} />
                <Tooltip contentStyle={TOOLTIP_STYLE} cursor={{ fill: 'rgba(255,255,255,0.04)' }} />
                <Bar dataKey="value" name="Events" radius={[6, 6, 0, 0]}>
                  {categoryBars.map((entry, i) => (
                    <Cell key={entry.name} fill={S.CHART_COLORS[i % S.CHART_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        {/* Marketing opt-in widget */}
        <ChartCard title="MARKETING OPT-IN" span={2}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', flexWrap: 'wrap' }}>
            <div>
              <div style={{ ...S.statValue, fontSize: '2.5rem', color: '#4ade80' }}>{optInRate}%</div>
              <div style={S.statLabel}>opt-in rate</div>
            </div>
            <div style={{ color: '#94a3b8', fontSize: '.85rem' }}>
              <strong style={{ color: '#f1f5f9' }}>{marketing.optInCount ?? 0}</strong> guests opted in to marketing
            </div>
            <div style={{ flex: 1, minWidth: 160 }}>
              <div style={{ height: 10, borderRadius: 6, background: 'rgba(255,255,255,0.06)', overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${Math.min(optInRate, 100)}%`, background: 'linear-gradient(90deg, #4ade80, #38bdf8)', transition: 'width .5s' }} />
              </div>
            </div>
          </div>
        </ChartCard>
      </div>
    </div>
  );
}
