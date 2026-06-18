import { useState } from 'react';
import { Link } from 'react-router-dom';
import { t } from '../../utils/i18n.js';

/**
 * LegalPage — renders a DRAFT legal document (bilingual) with a clearly visible
 * "DRAFT — pending attorney review" banner. Bracketed placeholders in the
 * content are intentionally preserved and visible.
 *
 * @param {{ doc: { titleKey, meta, sections, source } }} props
 */
export default function LegalPage({ doc }) {
  const initialLang =
    (typeof localStorage !== 'undefined' && localStorage.getItem('flash_it_lang')) || 'en';
  const [lang, setLang] = useState(initialLang === 'es' ? 'es' : 'en');

  const changeLang = (l) => {
    setLang(l);
    try {
      localStorage.setItem('flash_it_lang', l);
    } catch {
      /* ignore */
    }
  };

  return (
    <div style={styles.root}>
      <div style={styles.container}>
        {/* Top bar: back link + language toggle */}
        <div style={styles.topBar}>
          <Link to="/" style={styles.backLink}>
            {t('legal.back', lang)}
          </Link>
          <div style={styles.langToggle}>
            {['en', 'es'].map((l) => (
              <button
                key={l}
                onClick={() => changeLang(l)}
                style={{
                  ...styles.langBtn,
                  ...(lang === l ? styles.langBtnActive : null),
                }}
              >
                {l.toUpperCase()}
              </button>
            ))}
          </div>
        </div>

        {/* DRAFT banner — always shown */}
        <div role="alert" style={styles.draftBanner}>
          <strong style={{ display: 'block', marginBottom: 4 }}>
            {t('legal.draftBanner.title', lang)}
          </strong>
          <span style={{ fontSize: '.85rem', opacity: 0.95 }}>
            {t('legal.draftBanner.body', lang)}
          </span>
        </div>

        <h1 style={styles.title}>{t(doc.titleKey, lang)}</h1>

        {doc.meta && <p style={styles.meta}>{doc.meta[lang]}</p>}

        {doc.sections.map((section, i) => (
          <section key={i} style={styles.section}>
            <h2 style={styles.heading}>{section.heading[lang]}</h2>
            {section.body[lang].split('\n\n').map((para, j) => (
              <p key={j} style={styles.para}>
                {para}
              </p>
            ))}
          </section>
        ))}

        {/* Footer note + source reference */}
        <div style={styles.docFooter}>
          <p style={{ margin: 0 }}>{t('legal.draftBanner.title', lang)}</p>
          {doc.source && (
            <p style={{ margin: '4px 0 0', opacity: 0.5, fontSize: '.72rem' }}>
              Source draft: {doc.source}
            </p>
          )}
          <div style={{ marginTop: 12, display: 'flex', gap: 16, flexWrap: 'wrap' }}>
            <Link to="/terms" style={styles.footerLink}>
              {t('footer.terms', lang)}
            </Link>
            <Link to="/privacy" style={styles.footerLink}>
              {t('footer.privacy', lang)}
            </Link>
            <Link to="/marketing-consent" style={styles.footerLink}>
              {t('legal.marketing.title', lang)}
            </Link>
            <Link to="/photo-consent" style={styles.footerLink}>
              {t('legal.photo.title', lang)}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

const styles = {
  root: {
    background: 'var(--bg, #0b0b16)',
    minHeight: '100vh',
    width: '100%',
    overflowY: 'auto',
    color: 'var(--text, #f1f5f9)',
  },
  container: {
    maxWidth: 760,
    margin: '0 auto',
    padding: '2rem 1.25rem 4rem',
  },
  topBar: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: '1.5rem',
  },
  backLink: {
    color: 'var(--accent-light, #69b3e7)',
    textDecoration: 'none',
    fontSize: '.9rem',
    fontWeight: 600,
  },
  langToggle: { display: 'flex', gap: 4 },
  langBtn: {
    padding: '6px 14px',
    borderRadius: 20,
    border: '1px solid rgba(255,255,255,0.15)',
    background: 'transparent',
    color: 'var(--text-muted, #94a3b8)',
    fontSize: '.8rem',
    fontWeight: 700,
    cursor: 'pointer',
  },
  langBtnActive: {
    border: '1px solid #4a8fc4',
    color: '#fff',
    background: 'rgba(74,143,196,0.15)',
  },
  draftBanner: {
    background: 'rgba(245,158,11,0.12)',
    border: '1px solid rgba(245,158,11,0.5)',
    borderRadius: 12,
    padding: '1rem 1.25rem',
    color: '#fbbf24',
    marginBottom: '2rem',
    lineHeight: 1.45,
  },
  title: {
    fontSize: 'clamp(1.6rem, 5vw, 2.4rem)',
    fontWeight: 800,
    letterSpacing: '-.02em',
    marginBottom: '.75rem',
  },
  meta: {
    fontSize: '.82rem',
    color: 'var(--text-muted, #94a3b8)',
    lineHeight: 1.6,
    marginBottom: '2rem',
    paddingBottom: '1.5rem',
    borderBottom: '1px solid rgba(255,255,255,0.08)',
  },
  section: { marginBottom: '1.75rem' },
  heading: {
    fontSize: '1.05rem',
    fontWeight: 700,
    marginBottom: '.6rem',
    color: 'var(--text, #f1f5f9)',
  },
  para: {
    fontSize: '.92rem',
    lineHeight: 1.65,
    color: 'rgba(241,245,249,0.85)',
    marginBottom: '.6rem',
    whiteSpace: 'pre-line',
  },
  docFooter: {
    marginTop: '2.5rem',
    paddingTop: '1.5rem',
    borderTop: '1px solid rgba(255,255,255,0.08)',
    fontSize: '.78rem',
    color: '#fbbf24',
  },
  footerLink: {
    color: 'var(--accent-light, #69b3e7)',
    textDecoration: 'none',
    fontSize: '.8rem',
    fontWeight: 600,
  },
};
