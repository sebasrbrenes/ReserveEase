// The owner's own data: a CSV export of their appointments and deleting the
// whole account (business, public page, pending notices, settings and login).

import { businessIdFor } from './legacySync.js';

// A subscription that will charge again must be canceled first, so deleting
// the account never leaves a card being billed for a business that is gone.
const BILLED_STATUSES = ['active', 'trialing', 'past_due', 'paused'];
export const keepsBilling = (subscription) => BILLED_STATUSES.includes(subscription?.status)
  && subscription?.scheduledChange?.action !== 'cancel';

const CSV_COLUMNS = [
  ['date', (a) => a.localDate],
  ['start', (a) => a.startsAt],
  ['end', (a) => a.endsAt],
  ['timezone', (a) => a.timezone],
  ['status', (a) => a.status],
  ['service', (a) => a.serviceSnapshot?.name],
  ['staff', (a) => a.staffSnapshot?.displayName],
  ['client_name', (a) => a.client?.name],
  ['client_email', (a) => a.client?.email],
  ['client_phone', (a) => a.client?.phoneE164],
  ['notes', (a) => a.notes],
  ['cancellation_reason', (a) => a.cancellationReason],
  ['source', (a) => a.source],
  ['created_at', (a) => a.createdAt],
  ['id', (a) => a.id],
];

// Quotes every value, and keeps spreadsheets from reading a client's name as a formula.
const cell = (value) => {
  let text = value == null ? '' : String(value);
  if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`;
  return `"${text.replace(/"/g, '""')}"`;
};

// Appointments in the API shape (appointments.js toApi) as CSV, oldest first.
export const appointmentsCsv = (appointments) => [
  CSV_COLUMNS.map(([name]) => name).join(','),
  ...appointments.map((a) => CSV_COLUMNS.map(([, get]) => cell(get(a))).join(',')),
].join('\r\n') + '\r\n';

export const allAppointments = async (db, businessId) => {
  const snap = await db.collection(`businesses/${businessId}/appointments`).get();
  return snap.docs.map((d) => d.data()).sort((a, b) => a.startsAt.toMillis() - b.startsAt.toMillis());
};

export class AccountError extends Error {
  constructor(code, message) {
    super(message);
    this.code = code;
  }
}

/**
 * Deletes everything the owner with this uid has in ReserveEase, then their
 * login. Safe to repeat: if it stops halfway, calling it again finishes it.
 * Clients of upcoming appointments are not notified.
 */
export const deleteAccount = async (db, auth, uid) => {
  const businessId = businessIdFor(uid);
  const base = db.doc(`businesses/${businessId}`);
  const [businessSnap, subscriptionSnap] = await db.getAll(base, base.collection('billing').doc('subscription'));
  if (keepsBilling(subscriptionSnap.data())) {
    throw new AccountError('SUBSCRIPTION_ACTIVE', 'Cancel the subscription before deleting the account');
  }

  const slug = businessSnap.exists ? businessSnap.data().slug : null;
  if (slug) {
    const pub = db.doc(`publicBusinesses/${slug}`);
    const pubSnap = await pub.get();
    if (pubSnap.exists && pubSnap.data().businessId === businessId) await pub.delete();
  }

  const jobs = await db.collection('notificationJobs').where('businessId', '==', businessId).get();
  for (let i = 0; i < jobs.docs.length; i += 400) {
    const batch = db.batch();
    jobs.docs.slice(i, i + 400).forEach((d) => batch.delete(d.ref));
    await batch.commit();
  }

  await db.recursiveDelete(base);
  await db.recursiveDelete(db.doc(`users/${uid}`));
  await auth.deleteUser(uid).catch((error) => {
    if (error?.code !== 'auth/user-not-found') throw error;
  });
  return { businessId };
};
