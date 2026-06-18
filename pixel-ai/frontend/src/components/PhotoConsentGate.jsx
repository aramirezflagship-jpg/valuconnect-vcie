import { motion } from 'framer-motion';
import { t } from '../utils/i18n.js';

/**
 * PhotoConsentGate — a fast, one-tap photo / biometric consent acknowledgment
 * shown before a guest takes a photo. For character mode (which detects and
 * crops a face), it also shows the biometric-processing note.
 *
 * Source: legal/photo-biometric-consent.md (short on-kiosk version).
 * This is a DRAFT consent — the linked Photo Consent page carries the full
 * "pending attorney review" banner and details.
 *
 * Designed to stay out of the way: one "I Agree / Continue" tap proceeds.
 *
 * @param {{
 *   lang?: 'en'|'es',
 *   character?: boolean,    // true when face detection/cropping will run
 *   onAgree: () => void,
 *   onDecline?: () => void,
 * }} props
 */
export default function PhotoConsentGate({ lang = 'en', character = false, onAgree, onDecline }) {
  // Open the full Photo Consent draft in a new tab so the booth flow isn't lost.
  const openPhotoConsent = (e) => {
    e.stopPropagation();
    window.open('/photo-consent', '_blank', 'noopener');
  };

  return (
    <div style={styles.overlay}>
      <motion.div
        initial={{ opacity: 0, y: 16, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.25, ease: 'easeOut' }}
        style={styles.card}
        role="dialog"
        aria-modal="true"
      >
        <h2 style={styles.title}>{t('photoConsent.title', lang)}</h2>

        <p style={styles.body}>{t('photoConsent.body', lang)}</p>

        {character && (
          <p style={styles.bioNote}>{t('photoConsent.bodyCharacter', lang)}</p>
        )}

        <button type="button" onClick={openPhotoConsent} style={styles.linkBtn}>
          {t('photoConsent.link', lang)} ↗
        </button>

        <button
          type="button"
          className="btn btn-primary"
          onClick={onAgree}
          style={styles.agreeBtn}
        >
          {t('photoConsent.agree', lang)}
        </button>

        {onDecline && (
          <button type="button" onClick={onDecline} style={styles.declineBtn}>
            {t('photoConsent.decline', lang)}
          </button>
        )}
      </motion.div>
    </div>
  );
}

const styles = {
  overlay: {
    position: 'fixed',
    inset: 0,
    zIndex: 200,
    background: 'rgba(5,7,15,0.82)',
    backdropFilter: 'blur(6px)',
    WebkitBackdropFilter: 'blur(6px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '1.5rem',
  },
  card: {
    width: '100%',
    maxWidth: 460,
    background: 'var(--card-bg, #161427)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: 20,
    padding: '1.75rem 1.5rem',
    textAlign: 'center',
    boxShadow: '0 24px 60px rgba(0,0,0,0.55)',
  },
  title: {
    fontSize: '1.35rem',
    fontWeight: 800,
    color: 'var(--text, #f1f5f9)',
    marginBottom: '.75rem',
  },
  body: {
    fontSize: '.92rem',
    lineHeight: 1.55,
    color: 'rgba(241,245,249,0.82)',
    marginBottom: '.9rem',
  },
  bioNote: {
    fontSize: '.85rem',
    lineHeight: 1.5,
    color: '#fbbf24',
    background: 'rgba(245,158,11,0.1)',
    border: '1px solid rgba(245,158,11,0.35)',
    borderRadius: 10,
    padding: '.7rem .85rem',
    marginBottom: '.9rem',
  },
  linkBtn: {
    background: 'transparent',
    border: 'none',
    color: 'var(--accent-light, #69b3e7)',
    fontSize: '.85rem',
    fontWeight: 600,
    cursor: 'pointer',
    marginBottom: '1.25rem',
    textDecoration: 'underline',
    padding: '.35rem',
    minHeight: 44,
  },
  agreeBtn: {
    width: '100%',
    minHeight: 56,
    fontSize: '1.05rem',
    fontWeight: 700,
    borderRadius: 14,
  },
  declineBtn: {
    background: 'transparent',
    border: 'none',
    color: 'var(--text-muted, #94a3b8)',
    fontSize: '.85rem',
    cursor: 'pointer',
    marginTop: '.85rem',
    padding: '.5rem',
    minHeight: 44,
  },
};
