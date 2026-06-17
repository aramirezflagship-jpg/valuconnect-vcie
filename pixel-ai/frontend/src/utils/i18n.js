/**
 * Flash-it — bilingual string lookup (EN / ES)
 * Default language: 'es'  (LATAM market — Spanish first)
 *
 * Usage:  t('welcome.title', lang)
 */

const strings = {
  /* ── Welcome ─────────────────────────────────────────────────────────── */
  'welcome.title': {
    es: '¡Bienvenido!',
    en: 'Welcome!',
  },
  'welcome.subtitle': {
    es: 'Tu evento, nuestra magia ✨',
    en: 'Your event, our magic ✨',
  },
  'welcome.start': {
    es: '📸 COMENZAR',
    en: '📸 START',
  },
  'welcome.hint': {
    es: 'Toca para comenzar tu experiencia',
    en: 'Tap to start your experience',
  },

  /* ── Themes ──────────────────────────────────────────────────────────── */
  'themes.title': {
    es: 'Elige tu mundo',
    en: 'Choose Your World',
  },
  'themes.select': {
    es: 'Siguiente →',
    en: 'Next →',
  },

  /* ── Camera ──────────────────────────────────────────────────────────── */
  'camera.ready': {
    es: '¡Prepárate!',
    en: 'Get Ready!',
  },
  'camera.countdown': {
    es: 'Foto en...',
    en: 'Photo in...',
  },
  'camera.smile': {
    es: '¡Sonríe! 😄',
    en: 'Smile! 😄',
  },
  'camera.retake': {
    es: 'Reiniciar',
    en: 'Reset',
  },
  'camera.take': {
    es: 'Tomar foto',
    en: 'Take Photo',
  },

  /* ── Processing ──────────────────────────────────────────────────────── */
  'processing.title': {
    es: 'Creando tu magia...',
    en: 'Creating your magic...',
  },
  'processing.subtitle': {
    es: 'La IA está trabajando',
    en: 'AI is working',
  },
  'processing.step1_es': {
    es: 'Quitando fondo...',
    en: 'Removing background...',
  },
  'processing.step1_en': {
    es: 'Removing background...',
    en: 'Removing background...',
  },
  'processing.step2_es': {
    es: 'Creando tu mundo...',
    en: 'AI is creating your world...',
  },
  'processing.step2_en': {
    es: 'AI is creating your world...',
    en: 'AI is creating your world...',
  },
  'processing.step3_es': {
    es: 'Últimos retoques...',
    en: 'Adding finishing touches...',
  },
  'processing.step3_en': {
    es: 'Adding finishing touches...',
    en: 'Adding finishing touches...',
  },

  /* ── Preview ─────────────────────────────────────────────────────────── */
  'preview.title': {
    es: '¿Te gusta?',
    en: 'Like it?',
  },
  'preview.approve': {
    es: '✓ APROBAR',
    en: '✓ APPROVE',
  },
  'preview.retake': {
    es: '↩ RETOMAR',
    en: '↩ RETAKE',
  },

  /* ── Delivery ────────────────────────────────────────────────────────── */
  'delivery.title': {
    es: '¡Tu foto está lista!',
    en: 'Your photo is ready!',
  },
  'delivery.qr_hint': {
    es: 'Escanea para ver y descargar',
    en: 'Scan to view and download',
  },
  'delivery.phone_label': {
    es: 'O recíbela en tu celular',
    en: 'Or receive it on your phone',
  },
  'delivery.phone_placeholder': {
    es: 'Número de teléfono',
    en: 'Phone number',
  },
  'delivery.send_sms': {
    es: 'Enviar SMS',
    en: 'Send SMS',
  },
  'delivery.send_whatsapp': {
    es: 'Enviar WhatsApp',
    en: 'Send WhatsApp',
  },
  'delivery.sent': {
    es: '¡Enviado!',
    en: 'Sent!',
  },
  'delivery.new_photo': {
    es: 'Nueva Foto',
    en: 'New Photo',
  },
  'delivery.auto_reset': {
    es: 'Reinicio automático en',
    en: 'Auto-restart in',
  },

  /* ── Errors ──────────────────────────────────────────────────────────── */
  'errors.camera': {
    es: 'No se pudo acceder a la cámara. Verifica los permisos.',
    en: 'Could not access the camera. Please check permissions.',
  },
  'errors.upload': {
    es: 'Error al subir la foto. Intenta de nuevo.',
    en: 'Failed to upload photo. Please try again.',
  },
  'errors.generic': {
    es: 'Algo salió mal. Por favor intenta de nuevo.',
    en: 'Something went wrong. Please try again.',
  },
};

/**
 * Look up a translation string.
 * @param {string} key  - dot-notation key, e.g. 'welcome.title'
 * @param {string} lang - 'es' | 'en'  (default: 'es')
 * @returns {string}
 */
export function t(key, lang = 'es') {
  const entry = strings[key];
  if (!entry) {
    console.warn(`[i18n] Missing key: "${key}"`);
    return key;
  }
  return entry[lang] ?? entry['es'] ?? key;
}

export default t;
