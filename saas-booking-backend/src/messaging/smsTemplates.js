// Text of the SMS reminder. Short and plain: accents and symbols are removed
// so the message stays in the GSM alphabet (160 characters per segment
// instead of 70), and every message says who sends it and how to stop.

import { MINUTE } from '../domain/time.js';

const plain = (value) => String(value ?? '')
  .normalize('NFD').replace(/[̀-ͯ]/g, '')
  .replace(/[^\x20-\x7E]/g, '')
  .trim();

const COPY = {
  en: {
    locale: 'en-US',
    reminder: (b, s, when) => `${b}: reminder of your ${s} appointment ${when}.`,
    stop: 'Reply STOP to opt out.',
  },
  es: {
    locale: 'es-US',
    reminder: (b, s, when) => `${b}: te recordamos tu cita de ${s} el ${when}.`,
    stop: 'Responde STOP para no recibir mas.',
  },
};

export const renderSms = ({ appointment, businessName, language = 'en' }) => {
  const copy = COPY[language] || COPY.en;
  const start = appointment.startsAt.toDate();
  const when = new Intl.DateTimeFormat(copy.locale, {
    timeZone: appointment.businessTimezone, weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
  }).format(start);
  const text = `${copy.reminder(plain(businessName).slice(0, 40), plain(appointment.serviceSnapshot?.name).slice(0, 40), plain(when))} ${copy.stop}`;
  return { to: appointment.client.phoneE164, text };
};

// Carriers and the TCPA expect texts between 8 am and 9 pm where the person
// is. The business's zone stands in for the client's. A reminder due outside
// that window moves inside it, never later than the original time + a few
// hours and never after the appointment.
export const QUIET_START_HOUR = 21;
export const QUIET_END_HOUR = 8;

export const smsSendTime = (dueMs, timeZone, localParts) => {
  const { hour, minute } = localParts(dueMs, timeZone);
  const minutes = hour * 60 + minute;
  if (minutes >= QUIET_END_HOUR * 60 && minutes < QUIET_START_HOUR * 60) return dueMs;
  if (minutes < QUIET_END_HOUR * 60) return dueMs + (QUIET_END_HOUR * 60 - minutes) * MINUTE;
  // Late evening: send at 8:59 pm instead, a little earlier than due.
  return dueMs - (minutes - (QUIET_START_HOUR * 60 - 1)) * MINUTE;
};
