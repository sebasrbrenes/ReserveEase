// SMS service of each business: its carrier registration state, its settings
// and its usage in the current billing cycle.
//
//   businesses/{id}/messaging/sms        status, remindersEnabled, registration
//   businesses/{id}/smsUsage/{cycleKey}   used, limit (one document per cycle)
//
// US carriers require every business that sends texts through a platform to
// be registered (A2P 10DLC: its own brand, campaign and number), so a
// business can only add the SMS add-on once its registration is approved.

import { FieldValue } from 'firebase-admin/firestore';
import { z } from 'zod';
import { ADDONS } from '../billing/catalog.js';
import { phoneE164Schema } from '../domain/schemas.js';

// What US carrier registration (TCR brand + campaign) asks about each
// business. A sole proprietor has no EIN and registers with fewer details.
export const smsRegistrationSchema = z.object({
  legalName: z.string().trim().min(2).max(120),
  entityType: z.enum(['company', 'sole_proprietor']),
  ein: z.string().trim().regex(/^\d{2}-?\d{7}$/, 'EIN is 9 digits, e.g. 12-3456789').optional(),
  street: z.string().trim().min(3).max(120),
  city: z.string().trim().min(2).max(60),
  state: z.string().trim().regex(/^[A-Za-z]{2}$/, 'Use the 2-letter state code').transform((v) => v.toUpperCase()),
  postalCode: z.string().trim().regex(/^\d{5}(-\d{4})?$/, 'Use a US ZIP code'),
  website: z.string().trim().url().max(200).optional(),
  contactName: z.string().trim().min(2).max(100),
  contactEmail: z.string().trim().email().max(200),
  contactPhone: phoneE164Schema,
}).strict().refine((r) => r.entityType === 'sole_proprietor' || Boolean(r.ein), {
  message: 'A company needs its EIN', path: ['ein'],
});

export const smsAccountRef = (db, businessId) => db.doc(`businesses/${businessId}/messaging/sms`);

// not_requested -> pending (the owner asked) -> approved | rejected;
// suspended stops sending (carrier or compliance issue) without losing data.
export const SMS_ACCOUNT_STATUSES = ['not_requested', 'pending', 'approved', 'rejected', 'suspended'];

export const smsAccountOf = (data) => ({
  status: SMS_ACCOUNT_STATUSES.includes(data?.status) ? data.status : 'not_requested',
  remindersEnabled: data?.remindersEnabled !== false,
  requestedAt: data?.requestedAt?.toDate?.().toISOString() ?? null,
});

// Usage is counted per billing cycle, keyed by the cycle's start, so it
// starts over at each renewal without a reset job.
export const cycleKeyOf = (subscription) => {
  const start = subscription?.currentPeriodStart;
  return start ? start.replace(/[^0-9]/g, '').slice(0, 14) : null;
};

export const smsUsageRef = (db, businessId, cycleKey) => db.doc(`businesses/${businessId}/smsUsage/${cycleKey}`);

export const readSmsUsage = async (db, businessId, subscription) => {
  const key = cycleKeyOf(subscription);
  const limit = ADDONS.sms.entitlements.smsPerCycle;
  if (!key) return { used: 0, limit, remaining: limit, cycleStart: null, cycleEnd: null };
  const snap = await smsUsageRef(db, businessId, key).get();
  const used = snap.data()?.used ?? 0;
  return {
    used, limit, remaining: Math.max(0, limit - used),
    cycleStart: subscription.currentPeriodStart, cycleEnd: subscription.currentPeriodEnd ?? null,
  };
};

export class SmsAccountError extends Error {
  constructor(code, message) {
    super(message);
    this.code = code;
  }
}

/** The owner asks for SMS: the business enters the registration queue. */
export const requestSms = (db, { businessId, actorUid, registration }) => db.runTransaction(async (tx) => {
  const ref = smsAccountRef(db, businessId);
  const current = smsAccountOf((await tx.get(ref)).data());
  if (['pending', 'approved'].includes(current.status)) return current;
  if (current.status === 'suspended') throw new SmsAccountError('SMS_SUSPENDED', 'SMS is suspended for this business');
  tx.set(ref, {
    status: 'pending', registration, requestedAt: FieldValue.serverTimestamp(), requestedBy: actorUid, updatedAt: FieldValue.serverTimestamp(),
  }, { merge: true });
  tx.create(db.collection(`businesses/${businessId}/auditEvents`).doc(), {
    type: 'sms.requested', actorUid, at: FieldValue.serverTimestamp(),
  });
  return { ...current, status: 'pending' };
});

export const updateSmsSettings = async (db, { businessId, remindersEnabled }) => {
  await smsAccountRef(db, businessId).set({ remindersEnabled, updatedAt: FieldValue.serverTimestamp() }, { merge: true });
  return smsAccountOf((await smsAccountRef(db, businessId).get()).data());
};
