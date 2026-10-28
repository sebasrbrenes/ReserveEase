// Link that lets a client see, cancel or reschedule their own appointment
// without an account. The appointment stores a random key (appointments are
// server-only in firestore.rules); the link carries it and every request
// compares it in constant time. A wrong key looks like a missing appointment.

import crypto from 'crypto';

export const newManageKey = () => crypto.randomBytes(24).toString('base64url');

export const managePathFor = (apt) => (apt.manageKey
  ? `/manage/${apt.businessId}/${apt.id}?k=${apt.manageKey}`
  : null);

// Absolute link for emails; null when the app URL or the key is missing.
export const manageUrlFor = (apt, appUrl = process.env.FRONTEND_URL) => {
  const path = managePathFor(apt);
  return path && appUrl ? `${appUrl.replace(/\/+$/, '')}${path}` : null;
};

const digest = (value) => crypto.createHash('sha256').update(String(value)).digest();

export const isManageKeyValid = (apt, key) => Boolean(apt?.manageKey && key)
  && crypto.timingSafeEqual(digest(apt.manageKey), digest(key));
