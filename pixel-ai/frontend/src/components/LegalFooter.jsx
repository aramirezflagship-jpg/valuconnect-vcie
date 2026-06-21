import { Link } from 'react-router-dom';
import { t } from '../utils/i18n.js';

/**
 * LegalFooter — small footer linking to the DRAFT Terms and Privacy pages.
 * Used on the host-facing Login / Register pages.
 *
 * @param {{ lang?: 'en'|'es' }} props
 */
export default function LegalFooter({ lang = 'en' }) {
  return (
    <footer style={styles.footer}>
      <Link to="/terms" style={styles.link}>
        {t('footer.terms', lang)}
      </Link>
      <span style={styles.dot}>·</span>
      <Link to="/privacy" style={styles.link}>
        {t('footer.privacy', lang)}
      </Link>
      <span style={styles.dot}>·</span>
      <Link to="/refund" style={styles.link}>
        {lang === 'es' ? 'Reembolsos' : 'Refunds'}
      </Link>
    </footer>
  );
}

const styles = {
  footer: {
    marginTop: '1.75rem',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    fontSize: '.78rem',
  },
  link: {
    color: 'var(--text-muted, #94a3b8)',
    textDecoration: 'none',
    fontWeight: 500,
  },
  dot: { color: 'rgba(255,255,255,0.25)' },
};
