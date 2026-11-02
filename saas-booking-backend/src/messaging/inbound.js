// Telnyx webhook events: delivery updates for sent reminders and replies to
// a business's number (STOP, START, HELP). Each event is applied once.

import { FieldValue } from 'firebase-admin/firestore';
import { hashValue } from './smsConsent.js';

// CTIA opt-out and opt-in keywords. Telnyx also enforces STOP on its side;
// this keeps our own record so nothing is queued for that number again.
const STOP_WORDS = new Set(['STOP', 'STOPALL', 'UNSUBSCRIBE', 'CANCEL', 'END', 'QUIT', 'OPTOUT', 'OPT-OUT', 'REVOKE']);
const START_WORDS = new Set(['START', 'UNSTOP', 'YES', 'OPTIN', 'OPT-IN']);
const HELP_WORDS = new Set(['HELP', 'INFO']);

export const keywordOf = (text) => String(text ?? '').trim().toUpperCase().replace(/[.!]+$/, '');

export const smsNumberRef = (db, e164) => db.doc(`smsNumbers/${e164}`);

const optOutDoc = (db, businessId, phone) => db.doc(`businesses/${businessId}/smsOptOuts/${hashValue(phone)}`);

const applyDelivery = async (db, payload, eventType) => {
  const snap = await db.collection('smsMessages').where('providerMessageId', '==', payload.id).limit(1).get();
  if (snap.empty) return 'unknown_message';
  const to = payload.to?.[0] ?? {};
  await snap.docs[0].ref.update({
    status: to.status ?? (eventType === 'message.sent' ? 'sent' : 'unknown'),
    errorCodes: (payload.errors ?? []).map((e) => String(e.code)).slice(0, 5),
    ...(payload.cost?.amount ? { cost: { amount: payload.cost.amount, currency: payload.cost.currency ?? 'USD' } } : {}),
    ...(payload.parts ? { parts: payload.parts } : {}),
    updatedAt: FieldValue.serverTimestamp(),
  });
  return to.status ?? 'updated';
};

const applyInbound = async (db, payload) => {
  const from = payload.from?.phone_number;
  const to = payload.to?.[0]?.phone_number;
  if (!from || !to) return 'incomplete';
  const number = await smsNumberRef(db, to).get();
  const businessId = number.data()?.businessId;
  if (!businessId) return 'unknown_number';
  const keyword = keywordOf(payload.text);
  const audit = db.collection(`businesses/${businessId}/auditEvents`).doc();
  if (STOP_WORDS.has(keyword)) {
    const batch = db.batch();
    batch.set(optOutDoc(db, businessId, from), { keyword, at: FieldValue.serverTimestamp(), source: 'sms_reply' });
    batch.create(audit, { type: 'sms.opted_out', at: FieldValue.serverTimestamp() });
    await batch.commit();
    return 'opted_out';
  }
  if (START_WORDS.has(keyword)) {
    const batch = db.batch();
    batch.delete(optOutDoc(db, businessId, from));
    batch.create(audit, { type: 'sms.opted_in', at: FieldValue.serverTimestamp() });
    await batch.commit();
    return 'opted_in';
  }
  // HELP is answered by the auto-response configured on the Telnyx number;
  // other replies are not read by anyone, so their text is not stored.
  return HELP_WORDS.has(keyword) ? 'help' : 'ignored';
};

/** Applies one verified webhook body. Returns what happened, for the log. */
export const applyTelnyxEvent = async (db, body) => {
  const event = body?.data;
  if (!event?.id || !event.event_type) return 'invalid';
  // Telnyx retries webhooks: the first delivery wins.
  try {
    await db.doc(`telnyxEvents/${event.id}`).create({ type: event.event_type, at: FieldValue.serverTimestamp() });
  } catch (error) {
    if (error.code === 6) return 'duplicate'; // ALREADY_EXISTS
    throw error;
  }
  const payload = event.payload ?? {};
  if (event.event_type === 'message.sent' || event.event_type === 'message.finalized') return applyDelivery(db, payload, event.event_type);
  if (event.event_type === 'message.received') return applyInbound(db, payload);
  return 'ignored';
};
