// Notification jobs (outbox) created together with appointment changes
// (master document, section 15). Ids are deterministic per appointment
// version and template, so a retried transaction never queues a message twice.

import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import { localParts, MINUTE } from '../domain/time.js';
import { smsSendTime } from '../messaging/smsTemplates.js';

export const TEMPLATES = ['confirmation_email', 'reschedule_email', 'reminder_email', 'cancellation_email', 'reminder_sms'];
export const channelOf = (template) => (template.endsWith('_sms') ? 'sms' : 'email');

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
    channel: channelOf(template),
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
  businessId, appointmentId, version, template, startsAtMs, nowMs, withReminder = true, smsReminder = null,
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
  // An SMS reminder too when the client agreed to texts. Whether the business
  // may send it (add-on, approval, quota, opt-out) is checked when it is due.
  // smsReminder: { timeZone } of the business, to keep texts out of quiet hours.
  if (withReminder && smsReminder && reminderAt > nowMs) {
    const smsAt = Math.min(smsSendTime(reminderAt, smsReminder.timeZone, localParts), startsAtMs - 60 * MINUTE);
    if (smsAt > nowMs) {
      tx.create(
        jobs.doc(jobIdFor(appointmentId, version, 'reminder_sms')),
        jobDoc({ businessId, appointmentId, version, template: 'reminder_sms', runAtMs: smsAt })
      );
    }
  }
};

// Whether an appointment's client agreed to SMS reminders for its number.
export const wantsSms = (apt) => Boolean(apt?.smsConsent && apt?.client?.phoneE164);

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
