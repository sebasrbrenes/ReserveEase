// Notification worker (master document, section 15.3). It claims due jobs
// with a transactional lease, so several instances never process the same job
// at once, checks the appointment is still in the state the job was queued
// for, sends through an adapter and records the outcome on the job and, as a
// summary, on the appointment.

import crypto from 'crypto';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import { MINUTE } from '../domain/time.js';
import { isKnownTemplate, renderEmail } from './templates.js';
import { SendError } from './adapters.js';

export const LEASE_MS = 2 * MINUTE;
export const MAX_ATTEMPTS = 5;
// Wait before attempt n+1: 1, 5, 25, 125 minutes.
export const backoffMs = (attempts) => 5 ** (attempts - 1) * MINUTE;

const STATUS_FOR_TEMPLATE = {
  confirmation_email: 'confirmed',
  reschedule_email: 'confirmed',
  reminder_email: 'confirmed',
  cancellation_email: 'cancelled',
};

// Due jobs: queued with runAt reached, or processing with an expired lease
// (a worker stopped mid-job).
const findDueJobs = async (db, nowTs, limit, businessId) => {
  let jobs = db.collection('notificationJobs');
  if (businessId) jobs = jobs.where('businessId', '==', businessId);
  const [queued, stuck] = await Promise.all([
    jobs.where('status', '==', 'queued').where('runAt', '<=', nowTs).orderBy('runAt').limit(limit).get(),
    jobs.where('status', '==', 'processing').where('leaseUntil', '<=', nowTs).limit(limit).get(),
  ]);
  return [...queued.docs, ...stuck.docs].map((d) => d.ref);
};

const claim = (db, ref, { nowMs, workerId }) => db.runTransaction(async (tx) => {
  const snap = await tx.get(ref);
  if (!snap.exists) return null;
  const job = snap.data();
  const due = (job.status === 'queued' && job.runAt.toMillis() <= nowMs)
    || (job.status === 'processing' && job.leaseUntil?.toMillis() <= nowMs);
  if (!due) return null;
  const claimed = {
    status: 'processing',
    attempts: (job.attempts ?? 0) + 1,
    leaseUntil: Timestamp.fromMillis(nowMs + LEASE_MS),
    workerId,
    updatedAt: FieldValue.serverTimestamp(),
  };
  tx.update(ref, claimed);
  return { ...job, ...claimed, id: ref.id };
});

// Writes the outcome only if this worker still holds the lease.
const finish = (db, ref, { workerId, job, outcome }) => db.runTransaction(async (tx) => {
  const aptRef = db.doc(`businesses/${job.businessId}/appointments/${job.appointmentId}`);
  const [snap, apt] = await tx.getAll(ref, aptRef);
  if (!snap.exists || snap.data().status !== 'processing' || snap.data().workerId !== workerId) return false;
  const now = FieldValue.serverTimestamp();
  tx.update(ref, { ...outcome, leaseUntil: FieldValue.delete(), updatedAt: now });
  // A skipped job is an old one: the appointment's summary belongs to its current job.
  if (apt.exists && outcome.status !== 'skipped') {
    tx.update(aptRef, {
      notification: {
        template: job.template,
        status: outcome.status,
        lastErrorCode: outcome.lastErrorCode ?? null,
        updatedAt: now,
      },
    });
  }
  return true;
});

const processJob = async (db, ref, { adapter, nowMs, workerId }) => {
  const job = await claim(db, ref, { nowMs, workerId });
  if (!job) return null;

  const [aptSnap, bizSnap] = await db.getAll(
    db.doc(`businesses/${job.businessId}/appointments/${job.appointmentId}`),
    db.doc(`businesses/${job.businessId}`),
  );
  const apt = aptSnap.exists ? aptSnap.data() : null;
  // A job for an older version (the appointment was moved or cancelled since)
  // or for a state the appointment is no longer in never sends (T28).
  const current = apt
    && isKnownTemplate(job.template)
    && (apt.notificationVersion ?? apt.version) === job.appointmentVersion
    && apt.status === STATUS_FOR_TEMPLATE[job.template];
  if (!current) {
    await finish(db, ref, { workerId, job, outcome: { status: 'skipped', lastErrorCode: 'STALE' } });
    return 'skipped';
  }

  // The business turned client emails off (T29): nothing is sent, and the
  // dashboard says so instead of showing a pending email.
  if (bizSnap.data()?.clientEmails === false) {
    await finish(db, ref, { workerId, job, outcome: { status: 'disabled', lastErrorCode: null } });
    return 'disabled';
  }

  let outcome;
  try {
    const message = renderEmail(job.template, { appointment: apt, businessName: bizSnap.data()?.name ?? '' });
    const result = await adapter.send(message, { idempotencyKey: job.id });
    outcome = { status: result.status, providerMessageId: result.providerMessageId ?? null, lastErrorCode: null, sentAt: FieldValue.serverTimestamp() };
  } catch (error) {
    const code = error instanceof SendError ? error.code : 'SEND_ERROR';
    const permanent = error instanceof SendError && error.permanent;
    outcome = permanent || job.attempts >= MAX_ATTEMPTS
      ? { status: 'failed', lastErrorCode: code }
      : { status: 'queued', lastErrorCode: code, runAt: Timestamp.fromMillis(nowMs + backoffMs(job.attempts)) };
    if (!(error instanceof SendError)) console.error(`[notifications] ${job.id} failed`, error.message);
  }
  await finish(db, ref, { workerId, job, outcome });
  return outcome.status;
};

/**
 * Processes the jobs due now. Returns a count per resulting status.
 * @param {FirebaseFirestore.Firestore} db
 * @param {{ adapter: object, clock?: () => number, limit?: number, workerId?: string, businessId?: string }} options
 *        businessId limits the run to one business (tests).
 */
export const processDueJobs = async (db, {
  adapter, clock = Date.now, limit = 20, workerId = crypto.randomUUID(), businessId,
}) => {
  const nowMs = clock();
  const refs = await findDueJobs(db, Timestamp.fromMillis(nowMs), limit, businessId);
  const counts = {};
  for (const ref of refs) {
    const status = await processJob(db, ref, { adapter, nowMs, workerId });
    if (status) counts[status] = (counts[status] ?? 0) + 1;
  }
  return counts;
};

// Failed jobs of an appointment's current notifications go back to the queue
// (the dashboard's "retry" for T26).
export const retryFailedJobs = (db, { businessId, appointmentId }) => db.runTransaction(async (tx) => {
  const aptRef = db.doc(`businesses/${businessId}/appointments/${appointmentId}`);
  const apt = await tx.get(aptRef);
  if (!apt.exists) return 0;
  const version = apt.data().notificationVersion ?? apt.data().version;
  const failed = await tx.get(db.collection('notificationJobs')
    .where('appointmentId', '==', appointmentId)
    .where('appointmentVersion', '==', version)
    .where('status', '==', 'failed'));
  const now = FieldValue.serverTimestamp();
  failed.docs.forEach((d) => tx.update(d.ref, { status: 'queued', attempts: 0, runAt: now, lastErrorCode: null, updatedAt: now }));
  if (failed.size) {
    tx.update(aptRef, { 'notification.status': 'queued', 'notification.lastErrorCode': null, 'notification.updatedAt': now });
  }
  return failed.size;
});

// Runs the worker on an interval inside the API process.
export const startNotificationWorker = (db, { adapter, intervalMs = 30 * 1000 }) => {
  let running = false;
  const tick = async () => {
    if (running) return;
    running = true;
    try {
      await processDueJobs(db, { adapter });
    } catch (error) {
      console.error('[notifications] worker tick failed', error.message);
    } finally {
      running = false;
    }
  };
  const timer = setInterval(tick, intervalMs);
  timer.unref?.();
  tick();
  return () => clearInterval(timer);
};
