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

  /* ── Mode picker (Natural / Character) ───────────────────────────────── */
  'mode.title': {
    es: 'Elige tu estilo',
    en: 'Choose Your Style',
  },
  'mode.natural.title': {
    es: 'Foto Natural',
    en: 'Natural Photo',
  },
  'mode.natural.desc': {
    es: 'Tu foto real con un marco temático',
    en: 'Your real photo with a themed frame',
  },
  'mode.character.title': {
    es: 'Personaje',
    en: 'Character',
  },
  'mode.character.desc': {
    es: 'Tu cara en un personaje divertido',
    en: 'Your face on a fun character',
  },
  'mode.pickTemplate': {
    es: 'Elige una plantilla',
    en: 'Pick a template',
  },
  'mode.noTemplates': {
    es: 'No hay plantillas disponibles',
    en: 'No templates available',
  },

  /* ── Character face guide ────────────────────────────────────────────── */
  'face.guide': {
    es: 'Centra tu cara en el óvalo',
    en: 'Center your face in the oval',
  },
  'face.notFound': {
    es: 'No detectamos tu cara — usando recorte central',
    en: "We didn't detect your face — using a centered crop",
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

  /* ── Legal / consent (DRAFT — pending attorney review) ───────────────── */
  'legal.draftBanner.title': {
    es: '⚠️ BORRADOR — pendiente de revisión legal',
    en: '⚠️ DRAFT — pending attorney review',
  },
  'legal.draftBanner.body': {
    es: 'Este documento es un borrador para uso interno. No es asesoría legal ni es vinculante. Un abogado con licencia debe revisarlo y finalizarlo, y resolver los [CAMPOS ENTRE CORCHETES], antes de su uso.',
    en: 'This document is a draft for internal use. It is not legal advice and is not binding. A licensed attorney must review and finalize it, and resolve the [BRACKETED PLACEHOLDERS], before it is used.',
  },
  'legal.back': {
    es: '← Volver',
    en: '← Back',
  },
  'legal.terms.title': {
    es: 'Términos de Servicio',
    en: 'Terms of Service',
  },
  'legal.privacy.title': {
    es: 'Política de Privacidad',
    en: 'Privacy Policy',
  },
  'legal.marketing.title': {
    es: 'Consentimiento de Marketing (SMS y Correo)',
    en: 'SMS & Email Marketing Consent',
  },
  'legal.photo.title': {
    es: 'Consentimiento de Foto y Datos Biométricos',
    en: 'Photo & Biometric Consent',
  },

  /* ── Footer ──────────────────────────────────────────────────────────── */
  'footer.terms': {
    es: 'Términos',
    en: 'Terms',
  },
  'footer.privacy': {
    es: 'Privacidad',
    en: 'Privacy',
  },

  /* ── Signup consent (Register) ───────────────────────────────────────── */
  'signup.consent.pre': {
    es: 'Acepto los ',
    en: 'I agree to the ',
  },
  'signup.consent.terms': {
    es: 'Términos de Servicio',
    en: 'Terms of Service',
  },
  'signup.consent.and': {
    es: ' y la ',
    en: ' and ',
  },
  'signup.consent.privacy': {
    es: 'Política de Privacidad',
    en: 'Privacy Policy',
  },
  'signup.consent.required': {
    es: 'Debes aceptar los Términos y la Política de Privacidad para continuar.',
    en: 'You must agree to the Terms and Privacy Policy to continue.',
  },

  /* ── Marketing opt-in checkbox (TCPA — UNCHECKED by default) ──────────── */
  // Source: legal/sms-email-marketing-consent.md §A. Keep separate, optional,
  // unchecked. Consent is NOT a condition of receiving your photo.
  'marketing.optin.sms': {
    es: '¡Sí, envíenme mensajes! Acepto recibir mensajes de texto promocionales de ValuConnect Solutions / Flash-it ([NOMBRE DEL PROGRAMA]) sobre futuras reservas y ofertas al número que proporcioné, incluidos mensajes enviados por tecnología automatizada. El consentimiento no es condición para ninguna compra. La frecuencia varía (aprox. [X] mensajes/mes). Pueden aplicar tarifas de mensajes y datos. Responde STOP para cancelar o HELP para ayuda.',
    en: 'Yes, text me! I agree to receive promotional/marketing text messages from ValuConnect Solutions / Flash-it ([BRAND/PROGRAM NAME]) about future bookings and offers at the number I provided, including messages sent by automated technology. Consent is not a condition of any purchase. Message frequency varies (approx. [X] msgs/month). Msg & data rates may apply. Reply STOP to cancel or HELP for help.',
  },
  'marketing.optin.email': {
    es: 'Sí, envíenme por correo ofertas y novedades de Flash-it / ValuConnect Solutions. Puedo cancelar en cualquier momento con el enlace de cada correo. El consentimiento no es condición para ninguna compra.',
    en: 'Yes, email me promotional offers and updates from Flash-it / ValuConnect Solutions. I can unsubscribe anytime using the link in any email. Consent is not a condition of any purchase.',
  },
  'marketing.optin.linkLabel': {
    es: 'marketing',
    en: 'marketing',
  },
  'marketing.optin.note': {
    es: 'Opcional. Recibirás tu foto aunque no marques esta casilla.',
    en: 'Optional. You’ll get your photo whether or not you check this box.',
  },

  /* ── Photo / biometric consent gate (kiosk) ──────────────────────────── */
  // Source: legal/photo-biometric-consent.md — short on-kiosk version.
  'photoConsent.title': {
    es: '📸 Antes de tomar tu foto',
    en: '📸 Before you take your photo',
  },
  'photoConsent.body': {
    es: 'Al continuar, aceptas que se tome tu foto y se procese para crear tu imagen. En modos de personaje, la app detecta y recorta tu rostro solo para crear tu foto. Consulta el Consentimiento de Foto.',
    en: 'By continuing you agree your photo will be taken and processed to create your image. In character modes, the app detects and crops your face only to create your photo. See the Photo Consent.',
  },
  'photoConsent.bodyCharacter': {
    es: 'Este modo detecta y recorta tu rostro de la foto para colocarlo en el arte. Esto es automático y se usa solo para crear tu foto. Esto puede considerarse procesamiento biométrico bajo algunas leyes estatales.',
    en: 'This mode detects and crops your face from the photo to place it into the artwork. This is automatic and used only to create your photo. This may be considered biometric processing under some state laws.',
  },
  'photoConsent.link': {
    es: 'Ver Consentimiento de Foto',
    en: 'See Photo Consent',
  },
  'photoConsent.agree': {
    es: 'Acepto y continúo',
    en: 'I Agree / Continue',
  },
  'photoConsent.decline': {
    es: 'No acepto',
    en: 'I Do Not Agree',
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
