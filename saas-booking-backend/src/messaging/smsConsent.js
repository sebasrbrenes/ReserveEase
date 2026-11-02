// Consent to receive text reminders, as US carriers (CTIA) and the TCPA
// expect it: separate from booking, unchecked by default, naming the business,
// the kind and frequency of messages, that rates may apply and how to stop.
// The exact text shown is versioned; the appointment keeps which version the
// client accepted, when, for which number and from where, as evidence.
// Only reminders are ever sent: there is no promotional consent.

import crypto from 'crypto';

export const SMS_CONSENT_VERSION = 'sms-reminders-v1';

const TEXTS = {
  en: (business) => `Text me appointment reminders from ${business} at this number. `
    + 'Up to 2 messages per appointment. Message and data rates may apply. '
    + 'Reply STOP to opt out, HELP for help. Consent is not required to book.',
  es: (business) => `Quiero recibir recordatorios de mis citas de ${business} por SMS en este número. `
    + 'Hasta 2 mensajes por cita. Pueden aplicar tarifas de mensajes y datos. '
    + 'Responde STOP para dejar de recibirlos y HELP para ayuda. No es necesario para reservar.',
};

export const smsConsentText = (businessName, language = 'en') => (TEXTS[language] || TEXTS.en)(businessName);

// Numbers and addresses are stored hashed where only equality matters.
export const hashValue = (value) => crypto.createHash('sha256')
  .update(`${process.env.SMS_HASH_SALT || 'reserveease'}:${value}`).digest('hex');

/**
 * Evidence stored on the appointment when the client ticks the box.
 * The text is rebuilt on the server from the version, never taken from the browser.
 */
export const consentEvidence = ({ businessName, language, phoneE164, ip, userAgent, version, nowIso }) => ({
  version,
  text: smsConsentText(businessName, language),
  language,
  phoneE164,
  at: nowIso,
  source: 'public_booking_form',
  ipHash: ip ? hashValue(ip) : null,
  userAgent: userAgent ? String(userAgent).slice(0, 200) : null,
});
