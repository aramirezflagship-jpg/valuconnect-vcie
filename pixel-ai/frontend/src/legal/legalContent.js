/**
 * Flash-it — legal document content (DRAFT)
 *
 * ⚠️ DRAFT — NOT LEGAL ADVICE. Condensed, faithful bilingual versions of the
 * first-draft templates in /legal/*.md. These are NOT final or binding. A
 * licensed attorney must review and finalize this language, and the business
 * owner must resolve every [BRACKETED PLACEHOLDER], before any of this is
 * relied upon. Placeholders are intentionally kept visible.
 *
 * Each document = { titleKey, sections: [{ heading: {en,es}, body: {en,es} }] }
 * `body` strings may contain '\n\n' to separate paragraphs; the renderer splits
 * on that. Bracketed placeholders like [STATE] are preserved verbatim.
 */

export const TERMS = {
  titleKey: 'legal.terms.title',
  source: 'legal/terms-of-service.md',
  meta: {
    en: 'Product: Flash-it — AI-powered photo booth for live events · Operator: ValuConnect Solutions ("Company") · Owner: Andres Ramirez · Effective Date: [EFFECTIVE DATE] · Contact: [SUPPORT EMAIL] · [BUSINESS ADDRESS] · [SUPPORT PHONE]',
    es: 'Producto: Flash-it — cabina de fotos con IA para eventos · Operador: ValuConnect Solutions ("la Empresa") · Dueño: Andres Ramirez · Fecha de vigencia: [FECHA DE VIGENCIA] · Contacto: [CORREO DE SOPORTE] · [DIRECCIÓN] · [TELÉFONO]',
  },
  sections: [
    {
      heading: { en: '1. Who These Terms Apply To', es: '1. A quién aplican estos Términos' },
      body: {
        en: 'These Terms govern your use of Flash-it, including Event / Full-Service bookings and the Solo / Self-Serve kiosk. They apply primarily to Hosts — the individuals or organizations who book, rent, or purchase a Flash-it experience.\n\nGuests who simply take photos at an event are governed by the on-kiosk Photo & Biometric Consent / Release and our Privacy Policy, not by these Host Terms, except where stated. By booking, paying for, or using Flash-it, you agree to these Terms.',
        es: 'Estos Términos rigen el uso de Flash-it, incluyendo Eventos / Servicio completo y el Kiosco Autoservicio. Aplican principalmente a los Anfitriones (quienes reservan o pagan el servicio).\n\nLos Invitados que solo se toman fotos se rigen por el Consentimiento de Foto y Datos Biométricos del kiosco y por nuestra Política de Privacidad. Al reservar, pagar o usar Flash-it, usted acepta estos Términos.',
      },
    },
    {
      heading: { en: '2. Accounts (Hosts)', es: '2. Cuentas (Anfitriones)' },
      body: {
        en: 'Provide accurate information, keep your credentials confidential, be responsible for activity under your account, and notify us at [SUPPORT EMAIL] of any unauthorized use. You must be at least 18 years old (or the age of majority in [STATE]) to create a Host account or enter into a booking.',
        es: 'Dé información veraz, mantenga su contraseña confidencial, sea responsable de la actividad en su cuenta y avísenos a [CORREO DE SOPORTE] de cualquier uso no autorizado. Debe tener al menos 18 años (o la mayoría de edad en [ESTADO]).',
      },
    },
    {
      heading: { en: '3. Acceptable Use', es: '3. Uso aceptable' },
      body: {
        en: 'You agree not to use Flash-it for any unlawful, harassing, or infringing purpose; not to upload illegal content; not to reverse engineer or resell the service; and not to photograph people without the required consents. As a Host at an Event, you are responsible for ensuring guests are made aware of the photo and facial-detection features and that the on-kiosk consent flow is presented and not bypassed.',
        es: 'Usted acepta no usar Flash-it para fines ilegales, de acoso o que infrinjan derechos; no subir contenido ilegal; no hacer ingeniería inversa ni revender el servicio; y no fotografiar a personas sin los consentimientos requeridos. Como Anfitrión, usted es responsable de que sus invitados conozcan las funciones de foto y detección facial y de que el flujo de consentimiento no se omita.',
      },
    },
    {
      heading: { en: '4. Payment, Deposits & Refunds', es: '4. Pago, depósitos y reembolsos' },
      body: {
        en: 'Payments are processed by Stripe. A non-refundable deposit of [DEPOSIT AMOUNT / %] may be required to reserve a date. Final balance is due [X DAYS] before the event. Cancellation / refund policy: [REFUND TERMS]. Initiating a chargeback without first contacting us at [SUPPORT EMAIL] is a breach of these Terms.',
        es: 'Los pagos se procesan con Stripe. Puede requerirse un depósito no reembolsable de [MONTO/%]. El saldo vence [X DÍAS] antes del evento. Política de cancelación y reembolso: [TÉRMINOS]. Iniciar un contracargo sin contactarnos primero a [CORREO DE SOPORTE] es un incumplimiento.',
      },
    },
    {
      heading: { en: '5. Service Availability', es: '5. Disponibilidad del servicio' },
      body: {
        en: 'We aim to provide the booth and deliver photos reliably, but we do not guarantee uninterrupted or error-free service. Performance may be affected by venue access, power/internet, weather, equipment failure, or Force Majeure.',
        es: 'Hacemos esfuerzos razonables para operar la cabina y entregar las fotos, pero no garantizamos un servicio sin interrupciones. El desempeño puede verse afectado por acceso al lugar, energía, internet, clima o causas de fuerza mayor.',
      },
    },
    {
      heading: { en: '6. Photos, Images & Guest Data', es: '6. Fotos e información de invitados' },
      body: {
        en: 'Photos are processed and stored as described in our Privacy Policy and the on-kiosk Photo & Biometric Consent / Release. Guests may receive their photos by QR code, SMS, and/or email and may opt in to marketing messages. The Host does not by default receive guests’ contact details unless separately agreed in writing.',
        es: 'Las fotos se procesan y almacenan como se describe en la Política de Privacidad y el consentimiento del kiosco. Los invitados pueden recibir sus fotos por código QR, SMS y/o correo, y pueden optar por mensajes de marketing. El Anfitrión no recibe por defecto los datos de contacto de los invitados.',
      },
    },
    {
      heading: { en: '7. Intellectual Property', es: '7. Propiedad intelectual' },
      body: {
        en: 'The Flash-it software, AI features, kiosk interface, templates, overlays, frames, and "face-in-the-hole" character artwork are owned by the Company or its licensors. You and your guests retain rights to the underlying likeness in the photos, subject to the consents and licenses granted in the on-kiosk consent and Privacy Policy.',
        es: 'El software, las funciones de IA, las plantillas, los marcos y el arte de "cara en el hueco" son propiedad de la Empresa. Usted y sus invitados conservan derechos sobre su imagen, sujeto a los consentimientos otorgados.',
      },
    },
    {
      heading: { en: '8. Marketing & Promotional Use of Photos', es: '8. Uso promocional de fotos' },
      body: {
        en: 'We may use selected event photos for our own marketing only where the depicted individuals have given the appropriate consent through the on-kiosk consent flow or a separate written release.',
        es: 'Podemos usar fotos seleccionadas para nuestro propio marketing solo cuando las personas mostradas hayan dado el consentimiento correspondiente.',
      },
    },
    {
      heading: { en: '9. Indemnification', es: '9. Indemnización' },
      body: {
        en: 'To the maximum extent permitted by law, you (Host) agree to indemnify, defend, and hold harmless the Company from claims arising from your breach, your or your guests’ unlawful use, your failure to present or honor required guest consents, or your misuse of photos or guest data.',
        es: 'En la máxima medida permitida por la ley, usted acepta indemnizar y eximir de responsabilidad a la Empresa por reclamos derivados de su incumplimiento, del uso ilegal por usted o sus invitados, de no presentar los consentimientos requeridos, o del mal uso de fotos o datos.',
      },
    },
    {
      heading: { en: '10. Disclaimers & Limitation of Liability', es: '10. Descargos y límite de responsabilidad' },
      body: {
        en: 'The service is provided "as is" and "as available," without warranties. To the maximum extent permitted by law, the Company’s total aggregate liability shall not exceed the total amount you paid for the specific booking giving rise to the claim [or $[CAP AMOUNT]]. We are not liable for indirect, incidental, special, consequential, or punitive damages.',
        es: 'El servicio se ofrece "tal cual", sin garantías. En la máxima medida permitida por la ley, la responsabilidad total de la Empresa no excederá el monto que usted pagó por la reserva [o $[MONTO MÁXIMO]]. No somos responsables por daños indirectos, incidentales o consecuentes.',
      },
    },
    {
      heading: { en: '11–14. Termination, Changes, Governing Law & Misc.', es: '11–14. Terminación, cambios, ley aplicable y varios' },
      body: {
        en: 'We may suspend or terminate access for breach, unlawful use, or non-payment. We may update these Terms; material changes will be posted at [TERMS URL] with a new Effective Date. These Terms are governed by the laws of the State of [STATE], venue [COUNTY, STATE]. Entire agreement, severability, no waiver, and assignment provisions apply.',
        es: 'Podemos suspender o terminar el acceso por incumplimiento, uso ilegal o falta de pago. Podemos actualizar estos Términos; los cambios importantes se publicarán en [URL DE TÉRMINOS]. Estos Términos se rigen por las leyes del Estado de [ESTADO]. Aplican acuerdo completo, divisibilidad, no renuncia y cesión.',
      },
    },
    {
      heading: { en: '15. Contact', es: '15. Contacto' },
      body: {
        en: 'Questions about these Terms: [SUPPORT EMAIL] · [BUSINESS ADDRESS] · [SUPPORT PHONE].',
        es: 'Preguntas sobre estos Términos: [CORREO DE SOPORTE] · [DIRECCIÓN] · [TELÉFONO].',
      },
    },
  ],
};

export const PRIVACY = {
  titleKey: 'legal.privacy.title',
  source: 'legal/privacy-policy.md',
  meta: {
    en: 'Operator: ValuConnect Solutions ("Company") · Owner: Andres Ramirez · Product: Flash-it · Effective Date: [EFFECTIVE DATE] · Privacy requests: [PRIVACY EMAIL] · [BUSINESS ADDRESS]',
    es: 'Operador: ValuConnect Solutions ("la Empresa") · Dueño: Andres Ramirez · Producto: Flash-it · Fecha de vigencia: [FECHA] · Solicitudes de privacidad: [CORREO DE PRIVACIDAD] · [DIRECCIÓN]',
  },
  sections: [
    {
      heading: { en: '1. Information We Collect', es: '1. Información que recopilamos' },
      body: {
        en: 'From Guests at the booth: photos and composited/edited images; facial / biometric-adjacent data when the "face-in-the-hole" character mode detects and crops your face (see §6); contact information you choose to enter (phone and/or email) to receive your photos; marketing opt-in status, if you choose to receive promotional messages; and device/technical data.\n\nFrom Hosts: name, email, phone, billing details (via Stripe), event details, and account credentials.',
        es: 'De los invitados (en la cabina): fotos e imágenes; datos faciales/biométricos cuando se usa el modo "cara en el hueco" (la app puede detectar y recortar su rostro — vea §6); número de teléfono y/o correo que usted ingrese para recibir sus fotos; estado de aceptación de marketing; y datos técnicos del dispositivo.\n\nDe los anfitriones: nombre, correo, teléfono, datos de facturación (vía Stripe), detalles del evento y credenciales.',
      },
    },
    {
      heading: { en: '2. How We Use Information', es: '2. Cómo usamos la información' },
      body: {
        en: 'To capture, process (including facial detection/cropping for character modes), composite, and deliver your photos via QR code, SMS, and/or email; to send promotional/marketing messages about future bookings only if you opted in; to operate, secure, and improve the service; to process Host bookings and payments; to manage customer relationships in our CRM; and to comply with law.',
        es: 'Para capturar, procesar (incluida la detección/recorte facial), componer y entregar sus fotos por QR, SMS y/o correo; enviar mensajes de marketing solo si usted lo aceptó; operar y mejorar el servicio; procesar reservas y pagos; gestionar la relación con clientes en nuestro CRM; y cumplir con la ley.',
      },
    },
    {
      heading: { en: '3. Legal Bases for Processing', es: '3. Bases legales' },
      body: {
        en: 'Where GDPR or similar law applies, we rely on: Consent (for facial/biometric processing and marketing — you may withdraw at any time), Contract (to deliver photos and fulfill Host bookings), Legitimate interests (to secure and improve the service), and Legal obligation.',
        es: 'Cuando aplique el GDPR u otra ley similar: consentimiento (para datos biométricos y marketing), contrato (para entregar sus fotos), interés legítimo (seguridad y mejora) y obligación legal.',
      },
    },
    {
      heading: { en: '4. Third-Party Processors', es: '4. Procesadores externos' },
      body: {
        en: 'We share personal information, under contract, with: Cloudflare R2 (photo storage), Twilio (SMS delivery & opt-in marketing texts), SendGrid (email delivery & opt-in marketing emails), Stripe (Host payments), Monday.com (CRM), and Supabase (application database/backend). We do not sell your personal information for money.',
        es: 'Compartimos datos con: Cloudflare R2 (almacenamiento de fotos), Twilio (SMS), SendGrid (correo), Stripe (pagos), Monday.com (CRM) y Supabase (base de datos / backend). No vendemos su información personal por dinero.',
      },
    },
    {
      heading: { en: '5. International Data Transfers', es: '5. Transferencias internacionales' },
      body: {
        en: 'Our processors may store or process data in the United States or other countries. Where required, we use appropriate safeguards (e.g., Standard Contractual Clauses).',
        es: 'Nuestros procesadores pueden almacenar datos en EE. UU. u otros países, con las salvaguardas requeridas cuando corresponda.',
      },
    },
    {
      heading: { en: '6. Biometric & Facial Data — Special Notice', es: '6. Datos biométricos y faciales — Aviso especial' },
      body: {
        en: 'When you use a character / "face-in-the-hole" mode, the app may automatically detect, locate, and crop your face within your photo so it can be composited into artwork. Depending on the implementation and applicable law, this may be considered biometric data.\n\nWe process this data only with your consent (captured on the kiosk), use it only to create and deliver your photo, and retain it only as long as needed and per our Data Retention & Deletion Policy ([RETENTION PERIOD]). You may request deletion at [PRIVACY EMAIL]. Note: laws such as Illinois BIPA impose strict requirements with a private right of action.',
        es: 'En el modo "cara en el hueco", la app puede detectar y recortar su rostro para componerlo en el arte. Esto puede considerarse dato biométrico.\n\nLo procesamos solo con su consentimiento (capturado en el kiosco), lo usamos solo para crear y entregar su foto, y lo conservamos según nuestra Política de Retención ([PERIODO]). Puede pedir su eliminación en [CORREO DE PRIVACIDAD]. Leyes como la BIPA de Illinois imponen requisitos estrictos.',
      },
    },
    {
      heading: { en: '7. Data Retention', es: '7. Retención de datos' },
      body: {
        en: 'We keep personal information only as long as necessary. Summary: event photos [RETENTION PERIOD]; detected/cropped face data [RETENTION PERIOD — shortest feasible]; guest contact info without marketing opt-in [RETENTION PERIOD]; guest contact info with marketing opt-in until you unsubscribe or [RETENTION PERIOD]; Host account & billing records [RETENTION PERIOD].',
        es: 'Conservamos la información solo el tiempo necesario. Los periodos específicos están en la Política de Retención y Eliminación de Datos: fotos del evento [PERIODO]; datos faciales recortados [PERIODO — el más corto posible]; contacto sin marketing [PERIODO]; contacto con marketing hasta su baja o [PERIODO]; cuenta y facturación del anfitrión [PERIODO].',
      },
    },
    {
      heading: { en: '8. Your Rights — U.S. (CCPA / CPRA)', es: '8. Sus derechos — EE. UU. (CCPA/CPRA)' },
      body: {
        en: 'If you are a California resident, you may have the right to know/access, delete, correct, opt out of "sale"/"sharing," limit use of sensitive personal information (which may include biometric data), and non-discrimination. Submit requests to [PRIVACY EMAIL] or [PRIVACY REQUEST URL/PHONE].',
        es: 'Si usted reside en California, puede tener derecho a conocer, acceder, eliminar, corregir, optar por no "vender/compartir", limitar el uso de información sensible y a la no discriminación. Solicite en [CORREO DE PRIVACIDAD].',
      },
    },
    {
      heading: { en: '9. Your Rights — EU/UK (GDPR)', es: '9. Sus derechos — UE/Reino Unido (GDPR)' },
      body: {
        en: 'If GDPR applies, you may have rights to access, rectify, erase, restrict, port, and object to processing, and to withdraw consent and lodge a complaint with a supervisory authority.',
        es: 'Si aplica el GDPR, usted puede tener derecho de acceso, rectificación, eliminación, restricción, portabilidad y oposición, y a retirar el consentimiento y presentar una queja.',
      },
    },
    {
      heading: { en: '10. Children’s Data', es: '10. Datos de menores' },
      body: {
        en: 'Flash-it may be used at events that include minors photographed with parental/guardian consent (see the Minor (Under-18) Consent Addendum). We do not knowingly collect personal information directly from children under 13 without verifiable parental consent.',
        es: 'Flash-it puede usarse en eventos con menores fotografiados con consentimiento de su padre/madre o tutor (vea el Anexo de Consentimiento para Menores). No recopilamos a sabiendas datos de niños menores de 13 años sin consentimiento parental verificable.',
      },
    },
    {
      heading: { en: '11–13. Security, Changes & Contact', es: '11–13. Seguridad, cambios y contacto' },
      body: {
        en: 'We use reasonable technical and organizational measures; no system is perfectly secure. We may update this Policy at [PRIVACY POLICY URL]. Privacy questions or requests: [PRIVACY EMAIL] · [BUSINESS ADDRESS] · [PRIVACY PHONE].',
        es: 'Usamos medidas técnicas y organizativas razonables; ningún sistema es completamente seguro. Podemos actualizar esta Política en [URL]. Preguntas o solicitudes: [CORREO DE PRIVACIDAD] · [DIRECCIÓN] · [TELÉFONO].',
      },
    },
  ],
};

export const MARKETING = {
  titleKey: 'legal.marketing.title',
  source: 'legal/sms-email-marketing-consent.md',
  meta: {
    en: 'Marketing texts/emails are regulated by the TCPA, FCC rules, CAN-SPAM, and state mini-TCPA laws. Marketing opt-in must be separate, optional, unchecked by default, and NOT a condition of service.',
    es: 'Los mensajes de marketing están regulados por la TCPA, CAN-SPAM y leyes estatales. La aceptación de marketing debe ser separada, opcional, sin marcar por defecto, y NO condición del servicio.',
  },
  sections: [
    {
      heading: { en: 'Core Principles', es: 'Principios clave' },
      body: {
        en: '1. Separate & optional — a distinct checkbox, unchecked by default, separate from photo-delivery consent.\n2. Consent is NOT a condition of service — guests get their photo whether or not they opt in.\n3. Clear disclosure — who is messaging, what kind, that rates may apply, the frequency, and how to stop.\n4. Easy opt-out — every SMS includes STOP; every email includes a working unsubscribe link.\n5. Keep records — store proof of each opt-in (what was shown, when, the phone/email) for [RETENTION PERIOD].',
        es: '1. Separado y opcional — casilla distinta, sin marcar por defecto, separada del consentimiento de entrega de foto.\n2. El consentimiento NO es condición del servicio — el invitado recibe su foto opte o no.\n3. Divulgación clara — quién envía, qué tipo, que pueden aplicar tarifas, la frecuencia y cómo cancelar.\n4. Cancelación fácil — cada SMS incluye STOP; cada correo incluye enlace de baja.\n5. Guardar registros — prueba de cada consentimiento por [PERIODO].',
      },
    },
    {
      heading: { en: 'Exact SMS Opt-In Checkbox Text', es: 'Texto exacto de la casilla de SMS' },
      body: {
        en: '☐ Yes, text me! I agree to receive promotional/marketing text messages from ValuConnect Solutions / Flash-it ([BRAND/PROGRAM NAME]) about future bookings and offers at the number I provided, including messages sent by automated technology. Consent is not a condition of any purchase. Message frequency varies (approx. [X] msgs/month). Msg & data rates may apply. Reply STOP to cancel or HELP for help. See [PRIVACY POLICY URL] and [SMS TERMS URL].',
        es: '☐ ¡Sí, envíenme mensajes! Acepto recibir mensajes de texto promocionales de ValuConnect Solutions / Flash-it ([NOMBRE DEL PROGRAMA]) sobre futuras reservas y ofertas al número que proporcioné, incluidos mensajes enviados por tecnología automatizada. El consentimiento no es condición para ninguna compra. La frecuencia varía (aprox. [X] mensajes/mes). Pueden aplicar tarifas de mensajes y datos. Responde STOP para cancelar o HELP para ayuda. Consulta [URL] y [URL].',
      },
    },
    {
      heading: { en: 'Exact Email Opt-In Checkbox Text', es: 'Texto exacto de la casilla de correo' },
      body: {
        en: '☐ Yes, email me promotional offers and updates from Flash-it / ValuConnect Solutions. I can unsubscribe anytime using the link in any email. Consent is not a condition of any purchase. See [PRIVACY POLICY URL].',
        es: '☐ Sí, envíenme por correo ofertas y novedades de Flash-it / ValuConnect Solutions. Puedo cancelar en cualquier momento con el enlace de cada correo. El consentimiento no es condición para ninguna compra. Consulta [URL].',
      },
    },
    {
      heading: { en: 'Required SMS Auto-Replies', es: 'Respuestas automáticas de SMS' },
      body: {
        en: 'Opt-in confirmation (once after sign-up): "[BRAND]: You’re subscribed to Flash-it offers (approx [X] msgs/mo). Msg&data rates may apply. Reply HELP for help, STOP to cancel."\nHELP reply: "[BRAND] Flash-it. For help: [SUPPORT EMAIL]/[SUPPORT PHONE]. Reply STOP to cancel."\nSTOP confirmation: "[BRAND]: You’re unsubscribed and will get no more marketing texts. Reply HELP for help."',
        es: 'Confirmación de alta, respuesta a HELP/AYUDA y confirmación de STOP, con redacción conforme a las normas de los operadores (configurar en Twilio).',
      },
    },
    {
      heading: { en: 'CAN-SPAM (Marketing Emails)', es: 'CAN-SPAM (correos de marketing)' },
      body: {
        en: 'Every marketing email must use truthful headers, identify as an advertisement where applicable, include the Company’s valid physical postal address — [BUSINESS MAILING ADDRESS] — and include a clear, working unsubscribe honored within 10 business days.',
        es: 'Encabezados veraces; identificar como publicidad cuando aplique; incluir la dirección postal física — [DIRECCIÓN POSTAL]; enlace de baja que funcione y se respete en 10 días hábiles.',
      },
    },
    {
      heading: { en: 'Transactional vs. Marketing', es: 'Transaccional vs. marketing' },
      body: {
        en: 'Delivering the guest’s photo, booking confirmations, and receipts are transactional and do not require the marketing opt-in — but they must not contain promotional content. Future-booking offers and promotions require the opt-in above.',
        es: 'Los mensajes que entregan la foto o confirman la reserva son transaccionales y no requieren la aceptación de marketing, pero no deben incluir contenido promocional. Las ofertas de futuras reservas requieren la aceptación anterior.',
      },
    },
  ],
};

export const PHOTO = {
  titleKey: 'legal.photo.title',
  source: 'legal/photo-biometric-consent.md',
  meta: {
    en: 'This is the consent a guest agrees to on the kiosk screen before taking a photo. Several states regulate biometric identifiers (Illinois BIPA, Texas CUBI, Washington HB 1493). Do not launch the face-detection mode until counsel resolves the biometric posture.',
    es: 'Este es el consentimiento que el invitado acepta en la pantalla del kiosco antes de tomar su foto. Varias leyes regulan los identificadores biométricos (BIPA de Illinois, CUBI de Texas, HB 1493 de Washington).',
  },
  sections: [
    {
      heading: { en: 'On-Kiosk Consent — short version', es: 'Consentimiento en el kiosco — versión corta' },
      body: {
        en: 'By tapping "I Agree," you confirm:\n\n1. You agree to be photographed. This Flash-it booth will take your photo, voluntarily.\n2. Face detection (character modes). If you choose a character or "face-in-the-hole" style, our app will detect and crop your face to place it into the artwork. This is automatic and used only to create your photo. (This may be considered biometric processing under some state laws.)\n3. How we use your photo. We process, edit, and store your photo to deliver it to you. Photos are stored securely in the cloud (Cloudflare R2).\n4. Getting your photo. If you enter your phone number or email, we’ll send your photo by SMS, email, and/or QR code. Standard message and data rates may apply.\n5. How long we keep it. We keep your photo and any face data only as long as needed and per our retention policy ([RETENTION PERIOD]). Ask us to delete it anytime at [PRIVACY EMAIL].\n6. You can withdraw. To delete your photo or face data, contact [PRIVACY EMAIL]. Withdrawing won’t undo messages already sent.\n7. Marketing is optional and separate. We will not send promotional messages unless you separately opt in. Receiving your photo does not require accepting marketing.\n8. Full details. See our Privacy Policy at [PRIVACY POLICY URL].\n\nIf you do not agree, please do not use the booth, or ask the event host / attendant for help.',
        es: 'Al tocar "Acepto," confirmas que:\n\n1. Aceptas ser fotografiado(a). Esta cabina Flash-it tomará tu foto, de forma voluntaria.\n2. Detección facial (modos de personaje). Si eliges un estilo de personaje o "cara en el hueco," la app detectará y recortará tu rostro para colocarlo en el arte. Esto es automático y se usa solo para crear tu foto. (Esto puede considerarse procesamiento biométrico bajo algunas leyes estatales.)\n3. Cómo usamos tu foto. Procesamos, editamos y almacenamos tu foto para entregártela. Las fotos se guardan de forma segura en la nube (Cloudflare R2).\n4. Cómo recibes tu foto. Si ingresas tu teléfono o correo, te la enviaremos por SMS, correo y/o código QR. Pueden aplicar tarifas de mensajes y datos.\n5. Cuánto tiempo la guardamos. Conservamos tu foto y cualquier dato facial solo el tiempo necesario y según nuestra política ([PERIODO]). Pide que la eliminemos en [CORREO DE PRIVACIDAD].\n6. Puedes retirar tu consentimiento. Para eliminar tu foto o datos faciales, escribe a [CORREO DE PRIVACIDAD]. Retirarlo no deshace los mensajes ya enviados.\n7. El marketing es opcional y aparte. No te enviaremos mensajes promocionales a menos que lo aceptes por separado. Recibir tu foto no requiere aceptar marketing.\n8. Más detalles. Consulta nuestra Política de Privacidad en [URL].\n\nSi no estás de acuerdo, por favor no uses la cabina o pide ayuda al anfitrión / encargado del evento.',
      },
    },
    {
      heading: { en: 'Optional Image-Use License (off by default)', es: 'Licencia opcional de uso de imagen (apagada por defecto)' },
      body: {
        en: '☐ (Optional) I allow ValuConnect Solutions to use my photo in Flash-it’s own promotional materials (website, social media). I understand this is optional, and I can decline and still receive my photo.',
        es: '☐ (Opcional) Permito que ValuConnect Solutions use mi foto en materiales promocionales de Flash-it (sitio web, redes sociales). Entiendo que es opcional y que puedo rechazarlo y aun así recibir mi foto.',
      },
    },
    {
      heading: { en: 'Withdrawal of Consent', es: 'Retiro del consentimiento' },
      body: {
        en: 'You can withdraw your consent and request deletion of your photo and any face data at any time by contacting [PRIVACY EMAIL]. We will delete the data we hold, except where we must keep it to comply with law. Messages already delivered cannot be recalled.',
        es: 'Puedes retirar tu consentimiento y pedir la eliminación de tu foto y datos faciales en cualquier momento escribiendo a [CORREO DE PRIVACIDAD]. Eliminaremos los datos que tengamos, salvo que la ley exija conservarlos. Los mensajes ya enviados no se pueden recuperar.',
      },
    },
  ],
};

export const REFUND = {
  title: { en: 'Refund Policy', es: 'Política de Reembolso' },
  source: 'legal/refund-policy.md',
  meta: {
    en: 'Operator: ValuConnect Solutions · Product: Flash-it · Contact: [SUPPORT EMAIL] · Effective Date: [EFFECTIVE DATE]. DRAFT — confirm the bracketed terms and have counsel review before relying on it.',
    es: 'Operador: ValuConnect Solutions · Producto: Flash-it · Contacto: [CORREO DE SOPORTE] · Fecha de vigencia: [FECHA]. BORRADOR — confirma los términos entre corchetes y consulta a un abogado antes de usarlo.',
  },
  sections: [
    {
      heading: { en: '1. Overview', es: '1. Generalidades' },
      body: {
        en: "We want you to be happy with Flash-it. This policy explains when and how refunds are issued for our two product lines: Solo (self-serve) packages and Full Service (managed) event bookings. By purchasing, you agree to this policy together with our Terms of Service.",
        es: 'Queremos que estés contento(a) con Flash-it. Esta política explica cuándo y cómo se emiten reembolsos para nuestras dos líneas: paquetes Solo (autoservicio) y reservas de Servicio Completo (gestionado). Al comprar, aceptas esta política junto con nuestros Términos.',
      },
    },
    {
      heading: { en: '2. Solo / Self-Serve packages', es: '2. Paquetes Solo / Autoservicio' },
      body: {
        en: "Solo packages are digital event credits activated on purchase. You may request a full refund within [REFUND WINDOW, e.g. 14 days] of purchase as long as the event has not been activated and no photos have been captured. Once an event has been used (photos captured) the package is considered consumed and is non-refundable, except where required by law.",
        es: 'Los paquetes Solo son créditos digitales que se activan al comprar. Puedes pedir un reembolso completo dentro de [VENTANA, p. ej. 14 días] de la compra siempre que el evento no se haya activado y no se hayan capturado fotos. Una vez usado el evento (fotos capturadas), el paquete se considera consumido y no es reembolsable, salvo que la ley exija lo contrario.',
      },
    },
    {
      heading: { en: '3. Full Service (managed) bookings', es: '3. Reservas de Servicio Completo' },
      body: {
        en: "Full Service bookings may require a deposit of [DEPOSIT %] to reserve your date. Deposits are refundable if you cancel at least [CANCELLATION NOTICE, e.g. 14 days] before the event; cancellations inside that window forfeit the deposit because the date was held for you. The remaining balance is refundable up to [BALANCE WINDOW] before the event. If we ever fail to deliver the service we committed to, you receive a full refund of amounts paid for that event.",
        es: 'Las reservas de Servicio Completo pueden requerir un depósito de [DEPÓSITO %] para apartar tu fecha. Los depósitos son reembolsables si cancelas al menos [AVISO, p. ej. 14 días] antes del evento; las cancelaciones dentro de ese plazo pierden el depósito porque la fecha se reservó para ti. El saldo restante es reembolsable hasta [VENTANA] antes del evento. Si no entregamos el servicio acordado, recibes el reembolso completo de lo pagado por ese evento.',
      },
    },
    {
      heading: { en: '4. How to request a refund', es: '4. Cómo solicitar un reembolso' },
      body: {
        en: 'Email [SUPPORT EMAIL] with your name, the email used to purchase, and your order/event details. We respond within [RESPONSE TIME, e.g. 2 business days].',
        es: 'Escribe a [CORREO DE SOPORTE] con tu nombre, el correo usado para comprar y los detalles de tu orden/evento. Respondemos dentro de [TIEMPO, p. ej. 2 días hábiles].',
      },
    },
    {
      heading: { en: '5. Non-refundable items', es: '5. No reembolsable' },
      body: {
        en: 'Used/consumed events, custom design work already delivered, and any third-party fees (e.g. SMS charges already incurred) are non-refundable.',
        es: 'Eventos usados/consumidos, trabajo de diseño personalizado ya entregado y tarifas de terceros (p. ej. mensajes SMS ya enviados) no son reembolsables.',
      },
    },
    {
      heading: { en: '6. How refunds are issued', es: '6. Cómo se emiten' },
      body: {
        en: 'Approved refunds are returned to the original payment method via Stripe, typically within [PROCESSING TIME, e.g. 5–10 business days] depending on your bank.',
        es: 'Los reembolsos aprobados se devuelven al método de pago original vía Stripe, normalmente dentro de [TIEMPO, p. ej. 5–10 días hábiles] según tu banco.',
      },
    },
    {
      heading: { en: '7. Disputes', es: '7. Disputas' },
      body: {
        en: 'Please contact us first at [SUPPORT EMAIL] before opening a card dispute — we can almost always resolve it faster directly. This policy does not limit any rights you have under applicable consumer-protection law.',
        es: 'Por favor contáctanos primero en [CORREO DE SOPORTE] antes de abrir una disputa con tu tarjeta — casi siempre lo resolvemos más rápido directamente. Esta política no limita los derechos que tengas bajo las leyes de protección al consumidor aplicables.',
      },
    },
  ],
};

export const LEGAL_DOCS = {
  terms: TERMS,
  privacy: PRIVACY,
  marketing: MARKETING,
  photo: PHOTO,
  refund: REFUND,
};
