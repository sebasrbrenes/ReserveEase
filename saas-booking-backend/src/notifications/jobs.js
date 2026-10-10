// Notification jobs (outbox) created together with appointment changes
// (master document, section 15). Ids are deterministic per appointment
// version and template, so a retried transaction never queues a message twice.

import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import { MINUTE } from '../domain/time.js';

export const TEMPLATES = ['confirmation_email', 'reschedule_email', 'reminder_email', 'cancellation_email'];

// Reminder policy: one email 24 hours before the start. A booking made inside
// that window gets only its confirmation, never a "tomorrow" message.
export const REMINDER_LEAD_MINUTES = 24 * 60;

export const jobIdFor = (appointmentId, version, template) => `${appointmentId}_v${version}_${template}`;

const jobDoc = ({ businessId, appointmentId, version, template, runAtMs }) => {
  const now = FieldValue.serverTimestamp();
  return {
    businessId,
    appointmentId,
    appointmentVersion: version,
    channel: 'email',
    template,
    runAt: runAtMs ? Timestamp.fromMillis(runAtMs) : now,
    status: 'queued',
    attempts: 0,
    createdAt: now,
    updatedAt: now,
  };
};

/**
 * Queues the message for an appointment version (sent as soon as possible)
 * and, for a confirmed appointment far enough ahead, its reminder.
 * Must run inside the transaction that writes that version.
 */
export const queueNotifications = (tx, db, {
  businessId, appointmentId, version, template, startsAtMs, nowMs, withReminder = true,
}) => {
  const jobs = db.collection('notificationJobs');
  tx.create(jobs.doc(jobIdFor(appointmentId, version, template)), jobDoc({ businessId, appointmentId, version, template }));
  const reminderAt = startsAtMs - REMINDER_LEAD_MINUTES * MINUTE;
  if (withReminder && reminderAt > nowMs) {
    tx.create(
      jobs.doc(jobIdFor(appointmentId, version, 'reminder_email')),
      jobDoc({ businessId, appointmentId, version, template: 'reminder_email', runAtMs: reminderAt })
    );
  }
};

// Queued jobs of an appointment version, read inside a transaction so they
// can be cancelled together with the change that makes them obsolete.
export const readPendingJobs = async (tx, db, appointmentId, version) => {
  const refs = TEMPLATES.map((t) => db.collection('notificationJobs').doc(jobIdFor(appointmentId, version, t)));
  const snaps = await tx.getAll(...refs);
  return snaps.filter((s) => s.exists && s.data().status === 'queued').map((s) => s.ref);
};

export const cancelJobs = (tx, refs) => {
  refs.forEach((ref) => tx.update(ref, { status: 'cancelled', updatedAt: FieldValue.serverTimestamp() }));
};
