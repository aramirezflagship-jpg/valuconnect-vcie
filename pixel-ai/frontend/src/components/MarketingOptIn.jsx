import { Link } from 'react-router-dom';
import { t } from '../utils/i18n.js';

/**
 * MarketingOptIn — a reusable, TCPA/CAN-SPAM-compliant marketing opt-in
 * checkbox for the photo-delivery / contact flow.
 *
 * Compliance rules baked in (see legal/sms-email-marketing-consent.md):
 *  - UNCHECKED by default (the parent owns `checked` state; pass false initially).
 *  - SEPARATE and OPTIONAL — never a condition of receiving the photo.
 *  - The word "marketing/promos" links to the full marketing-consent page.
 *  - Wording comes from i18n keys, not hardcoded strings.
 *
 * @param {{
 *   channel: 'sms'|'email',
 *   checked: boolean,
 *   onChange: (checked: boolean) => void,
 *   lang?: 'en'|'es',
 *   id?: string,
 * }} props
 */
export default function MarketingOptIn({ channel, checked, onChange, lang = 'en', id = 'marketing-optin' }) {
  const textKey = channel === 'email' ? 'marketing.optin.email' : 'marketing.optin.sms';
  const fullText = t(textKey, lang);
  const linkWord = t('marketing.optin.linkLabel', lang);

  // Link the first occurrence of the "marketing/promos" word to the consent page.
  const idx = fullText.toLowerCase().indexOf(linkWord.toLowerCase());
  let before = fullText;
  let match = '';
  let after = '';
  if (idx !== -1) {
    before = fullText.slice(0, idx);
    match = fullText.slice(idx, idx + linkWord.length);
    after = fullText.slice(idx + linkWord.length);
  }

  return (
    <div style={styles.wrap}>
      <label htmlFor={id} style={styles.label}>
        <input
          id={id}
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          style={styles.checkbox}
        />
        <span style={styles.text}>
          {idx !== -1 ? (
            <>
              {before}
              <Link
                to="/marketing-consent"
                target="_blank"
                rel="noopener"
                onClick={(e) => e.stopPropagation()}
                style={styles.link}
              >
                {match}
              </Link>
              {after}
            </>
          ) : (
            fullText
          )}
        </span>
      </label>
      <p style={styles.note}>{t('marketing.optin.note', lang)}</p>
    </div>
  );
}

const styles = {
  wrap: {
    width: '100%',
    maxWidth: 360,
    margin: '0 auto 1rem',
    textAlign: 'left',
  },
  label: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '.55rem',
    fontSize: '.72rem',
    lineHeight: 1.45,
    color: '#94a3b8',
    cursor: 'pointer',
  },
  checkbox: {
    width: 18,
    height: 18,
    marginTop: 1,
    flexShrink: 0,
    accentColor: '#7c3aed',
  },
  text: { flex: 1 },
  link: { color: '#a78bfa', fontWeight: 600 },
  note: {
    margin: '.4rem 0 0 1.75rem',
    fontSize: '.68rem',
    color: '#64748b',
    fontStyle: 'italic',
  },
};
