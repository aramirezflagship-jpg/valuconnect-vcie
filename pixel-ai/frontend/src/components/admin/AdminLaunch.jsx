import { useState, useEffect, useCallback } from 'react';
import { getLaunchStatus } from '../../utils/api.js';

/**
 * AdminLaunch — the auto-updating launch-readiness panel. Each load asks the
 * backend what's actually configured (env) and present (DB), so the checklist
 * reflects real state. Items with done===null are manual ("you confirm").
 */

const S = {
  card: { background: '#1a1a2e', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 12, padding: '1.1rem' },
  group: { fontSize: '.72rem', fontWeight: 700, color: '#64748b', letterSpacing: '.06em', margin: '1.25rem 0 .5rem' },
};

// Target launch: Saturday, July 11, 2026 (3 weeks from June 20).
const LAUNCH_DATE = new Date('2026-07-11T00:00:00');

function StatusIcon({ done }) {
  if (done === true) return <span style={{ color: '#4ade80' }}>✅</span>;
  if (done === false) return <span style={{ color: '#f87171' }}>⬜</span>;
  return <span title="Manual — you confirm" style={{ color: '#fbbf24' }}>◻️</span>;
}

export default function AdminLaunch() {
  const [status, setStatus] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      setStatus(await getLaunchStatus());
    } catch (e) {
      setError(e?.response?.data?.error || e.message || 'Failed to load launch status');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const daysLeft = Math.ceil((LAUNCH_DATE - new Date()) / 86400000);

  if (loading && !status) return <p style={{ color: '#64748b', textAlign: 'center', padding: '2rem' }}>Checking launch readiness…</p>;

  const items = status?.items || [];
  const summary = status?.summary || { autoTotal: 0, autoDone: 0, blockersOpen: 0, manualOpen: 0 };
  const pct = summary.autoTotal ? Math.round((summary.autoDone / summary.autoTotal) * 100) : 0;
  const groups = [...new Set(items.map((i) => i.group))];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '1rem' }}>
        <div>
          <h2 style={{ fontSize: '1rem', fontWeight: 700, color: '#f1f5f9', margin: 0 }}>Launch Readiness</h2>
          <p style={{ fontSize: '.78rem', color: '#64748b', margin: '.25rem 0 0' }}>
            Auto-checked every time you open this tab. Target: <b style={{ color: '#cbd5e1' }}>Sat, Jul 11, 2026</b>
            {daysLeft >= 0 ? ` · ${daysLeft} day${daysLeft === 1 ? '' : 's'} left` : ' · past target'}
          </p>
        </div>
        <button onClick={load} style={{ background: 'rgba(255,255,255,0.08)', color: '#cbd5e1', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 8, padding: '.45rem .8rem', fontSize: '.78rem', fontWeight: 600, cursor: 'pointer' }}>
          ↻ Re-check
        </button>
      </div>

      {error && <p style={{ color: '#f87171', fontSize: '.82rem' }}>{error}</p>}

      {/* Progress + blockers */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '.85rem', marginBottom: '.5rem' }}>
        <div style={S.card}>
          <div style={{ fontSize: '.7rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.05em' }}>Auto-checks passing</div>
          <div style={{ fontSize: '1.6rem', fontWeight: 700, color: '#f1f5f9', marginTop: '.2rem' }}>{summary.autoDone}/{summary.autoTotal} <span style={{ fontSize: '.9rem', color: '#94a3b8' }}>({pct}%)</span></div>
          <div style={{ height: 6, borderRadius: 4, background: 'rgba(255,255,255,0.07)', marginTop: '.5rem' }}>
            <div style={{ height: '100%', borderRadius: 4, width: `${pct}%`, background: pct === 100 ? '#22c55e' : 'linear-gradient(90deg,#dc2626,#f97316)', transition: 'width .4s' }} />
          </div>
        </div>
        <div style={S.card}>
          <div style={{ fontSize: '.7rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.05em' }}>Blockers open</div>
          <div style={{ fontSize: '1.6rem', fontWeight: 700, color: summary.blockersOpen ? '#f87171' : '#4ade80', marginTop: '.2rem' }}>{summary.blockersOpen}</div>
        </div>
        <div style={S.card}>
          <div style={{ fontSize: '.7rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.05em' }}>Manual to confirm</div>
          <div style={{ fontSize: '1.6rem', fontWeight: 700, color: '#fbbf24', marginTop: '.2rem' }}>{summary.manualOpen}</div>
        </div>
      </div>

      {/* Checklist by group */}
      {groups.map((g) => (
        <div key={g}>
          <div style={S.group}>{g.toUpperCase()}</div>
          <div style={{ ...S.card, padding: '.4rem .9rem' }}>
            {items.filter((i) => i.group === g).map((i) => (
              <div key={i.key} style={{ display: 'flex', alignItems: 'flex-start', gap: '.6rem', padding: '.5rem 0', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                <StatusIcon done={i.done} />
                <div style={{ flex: 1 }}>
                  <span style={{ fontSize: '.84rem', color: i.done === false && i.blocker ? '#fca5a5' : '#e2e8f0' }}>
                    {i.label}{i.blocker && <span title="Launch blocker" style={{ color: '#f87171', marginLeft: 4 }}>•</span>}
                  </span>
                  {i.note && <span style={{ display: 'block', fontSize: '.7rem', color: '#64748b' }}>{i.note}</span>}
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}

      <p style={{ fontSize: '.7rem', color: '#475569', marginTop: '1rem' }}>
        • = launch blocker. ◻️ = manual item only you can confirm (A2P, attorney, dry-run). Full plan + steps in <code style={{ color: '#a5b4fc' }}>flash-it-v1/LAUNCH.md</code>.
      </p>
    </div>
  );
}
