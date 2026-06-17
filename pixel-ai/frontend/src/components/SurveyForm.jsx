import { useState, useEffect } from 'react';

export default function SurveyForm({ eventCode, onComplete }) {
  const [survey, setSurvey] = useState(null);
  const [answers, setAnswers] = useState({});
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    fetch(`/api/surveys/${eventCode}`)
      .then(r => r.json())
      .then(data => setSurvey(data.survey))
      .catch(() => setSurvey(null));
  }, [eventCode]);

  if (!survey || !survey.questions?.length) {
    // No survey configured for this event — skip
    if (onComplete) setTimeout(onComplete, 0);
    return null;
  }

  if (done) return (
    <div style={{ textAlign: 'center', padding: '2rem' }}>
      <div style={{ fontSize: '2.5rem', marginBottom: '.75rem' }}>🙏</div>
      <h3 style={{ color: '#f1f5f9', fontWeight: 700 }}>Thanks!</h3>
      <p style={{ color: '#94a3b8', fontSize: '.9rem' }}>Your feedback helps us improve.</p>
    </div>
  );

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    try {
      await fetch(`/api/surveys/${eventCode}/respond`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ responses: answers, guestEmail: email || undefined }),
      });
      setDone(true);
      setTimeout(() => onComplete?.(), 2000);
    } catch { onComplete?.(); }
    finally { setSubmitting(false); }
  }

  return (
    <div style={{ padding: '1.5rem', maxWidth: 440, margin: '0 auto' }}>
      <h3 style={{ color: '#f1f5f9', fontWeight: 700, fontSize: '1.1rem', marginBottom: '.4rem' }}>Quick question{survey.questions.length > 1 ? 's' : ''}</h3>
      <p style={{ color: '#64748b', fontSize: '.8rem', marginBottom: '1.25rem' }}>Optional — takes 10 seconds</p>
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {survey.questions.map(q => (
          <div key={q.id}>
            <label style={{ display: 'block', color: '#94a3b8', fontSize: '.8rem', fontWeight: 600, marginBottom: '.4rem' }}>{q.label}</label>
            {q.type === 'choice' ? (
              <div style={{ display: 'flex', gap: '.5rem', flexWrap: 'wrap' }}>
                {q.options?.map(opt => (
                  <button key={opt} type="button"
                    onClick={() => setAnswers(a => ({ ...a, [q.id]: opt }))}
                    style={{ background: answers[q.id] === opt ? 'rgba(124,58,237,0.3)' : 'rgba(255,255,255,0.05)', border: `1px solid ${answers[q.id] === opt ? '#7c3aed' : 'rgba(255,255,255,0.1)'}`, borderRadius: 8, padding: '.45rem .85rem', color: '#f1f5f9', fontSize: '.85rem', cursor: 'pointer' }}>
                    {opt}
                  </button>
                ))}
              </div>
            ) : (
              <input type="text" value={answers[q.id] || ''} onChange={e => setAnswers(a => ({ ...a, [q.id]: e.target.value }))}
                style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: '.6rem .85rem', color: '#f1f5f9', fontSize: '.9rem', outline: 'none', boxSizing: 'border-box' }} />
            )}
          </div>
        ))}
        <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="Email (optional)" style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: '.6rem .85rem', color: '#f1f5f9', fontSize: '.9rem', outline: 'none', boxSizing: 'border-box' }} />
        <div style={{ display: 'flex', gap: '.75rem' }}>
          <button type="submit" disabled={submitting} style={{ flex: 1, background: 'linear-gradient(135deg,#7c3aed,#a855f7)', color: '#fff', border: 'none', borderRadius: 10, padding: '.75rem', fontWeight: 700, cursor: 'pointer' }}>
            {submitting ? 'Sending…' : 'Submit'}
          </button>
          <button type="button" onClick={onComplete} style={{ background: 'rgba(255,255,255,0.05)', color: '#64748b', border: 'none', borderRadius: 10, padding: '.75rem 1rem', cursor: 'pointer', fontSize: '.85rem' }}>Skip</button>
        </div>
      </form>
    </div>
  );
}
