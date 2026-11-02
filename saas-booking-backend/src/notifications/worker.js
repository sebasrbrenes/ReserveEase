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
import { manageUrlFor } from '../domain/manageLink.js';
import { channelOf, wantsSms } from './jobs.js';
import { hasAddon, subscriptionRef } from '../billing/subscription.js';
import { ADDONS } from '../billing/catalog.js';
import { cycleKeyOf, smsAccountOf, smsAccountRef, smsUsageRef } from '../messaging/smsAccount.js';
import { hashValue } from '../messaging/smsConsent.js';
import { renderSms } from '../messaging/smsTemplates.js';
import { createMockSmsAdapter } from '../messaging/telnyx.js';

export const LEASE_MS = 2 * MINUTE;
export const MAX_ATTEMPTS = 5;
// Wait before attempt n+1: 1, 5, 25, 125 minutes.
export const backoffMs = (attempts) => 5 ** (attempts - 1) * MINUTE;
// A provider quota (Resend's 100 emails a day on the free plan) defers a job
// without spending an attempt, at most this many times.
export const MAX_DEFERRALS = 7;

const STATUS_FOR_TEMPLATE = {
  confirmation_email: 'confirmed',
  reschedule_email: 'confirmed',
  reminder_email: 'confirmed',
  cancellation_email: 'cancelled',
  reminder_sms: 'confirmed',
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
  // Email and SMS each keep their own summary.
  if (apt.exists && outcome.status !== 'skipped') {
    tx.update(aptRef, {
      [channelOf(job.template) === 'sms' ? 'smsNotification' : 'notification']: {
        template: job.template,
        status: outcome.status,
        lastErrorCode: outcome.lastErrorCode ?? null,
        updatedAt: now,
      },
    });
  }
  return true;
});

// ---------------------------------------------------------------------------
// SMS reminders. Every condition is checked when the reminder is due, so a
// change of add-on, approval, settings or an opt-out applies at once.

export const optOutRef = (db, businessId, phoneE164) => db.doc(`businesses/${businessId}/smsOptOuts/${hashValue(phoneE164)}`);

// Takes one SMS from the business's quota for this cycle, in a transaction
// together with the job, so concurrent workers can never exceed it and a
// retried job never counts twice.
const reserveSms = (db, ref, { job, workerId, subscription }) => db.runTransaction(async (tx) => {
  const key = cycleKeyOf(subscription);
  if (!key) return 'NO_CYCLE';
  const usageRef = smsUsageRef(db, job.businessId, key);
  const [jobSnap, usageSnap] = await tx.getAll(ref, usageRef);
  const current = jobSnap.data();
  if (current?.status !== 'processing' || current.workerId !== workerId) return 'LOST_LEASE';
  if (current.quotaCycle === key) return 'OK';
  const limit = ADDONS.sms.entitlements.smsPerCycle;
  const used = usageSnap.data()?.used ?? 0;
  if (used >= limit) return 'QUOTA_EXCEEDED';
  tx.set(usageRef, {
    used: used + 1, limit, cycleStart: subscription.currentPeriodStart, cycleEnd: subscription.currentPeriodEnd ?? null,
    updatedAt: FieldValue.serverTimestamp(),
  }, { merge: true });
  tx.update(ref, { quotaCycle: key });
  return 'OK';
});

// A message that never left gives its unit back.
const releaseSms = (db, ref, job) => db.runTransaction(async (tx) => {
  const snap = await tx.get(ref);
  const key = snap.data()?.quotaCycle;
  if (!key) return;
  tx.update(smsUsageRef(db, job.businessId, key), { used: FieldValue.increment(-1) });
  tx.update(ref, { quotaCycle: FieldValue.delete() });
});

const processSms = async (db, ref, { job, apt, business, smsAdapter, nowMs, workerId }) => {
  const done = async (status, lastErrorCode) => {
    await finish(db, ref, { workerId, job, outcome: { status, lastErrorCode } });
    return status;
  };
  if (!wantsSms(apt)) return done('disabled', 'NO_CONSENT');
  const [subSnap, smsSnap, optOut] = await db.getAll(
    subscriptionRef(db, job.businessId), smsAccountRef(db, job.businessId), optOutRef(db, job.businessId, apt.client.phoneE164),
  );
  const subscription = subSnap.data();
  const account = smsAccountOf(smsSnap.data());
  if (!hasAddon(subscription, 'sms')) return done('disabled', 'ADDON_INACTIVE');
  if (account.status !== 'approved') return done('disabled', 'NOT_APPROVED');
  if (!account.remindersEnabled) return done('disabled', 'REMINDERS_OFF');
  if (!smsSnap.data()?.fromNumber) return done('disabled', 'NO_NUMBER');
  if (optOut.exists) return done('opted_out', null);

  const reserved = await reserveSms(db, ref, { job, workerId, subscription });
  if (reserved === 'LOST_LEASE') return null;
  if (reserved !== 'OK') return done('disabled', reserved);

  let outcome;
  try {
    const message = renderSms({ appointment: apt, businessName: business?.name ?? '', language: business?.language });
    const result = await smsAdapter.send({ ...message, from: smsSnap.data().fromNumber }, { idempotencyKey: job.id });
    outcome = {
      status: result.status, providerMessageId: result.providerMessageId ?? null, lastErrorCode: null,
      cost: result.cost ?? null, sentAt: FieldValue.serverTimestamp(),
    };
    // Log per message: delivery updates from Telnyx's webhook land here too.
    await db.doc(`smsMessages/${job.id}`).set({
      businessId: job.businessId,
      appointmentId: job.appointmentId,
      template: job.template,
      provider: smsAdapter.name,
      providerMessageId: outcome.providerMessageId,
      status: outcome.status,
      toLast4: apt.client.phoneE164.slice(-4),
      cost: outcome.cost,
      cycle: cycleKeyOf(subscription),
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    }, { merge: true });
  } catch (error) {
    const code = error instanceof SendError ? error.code : 'SEND_ERROR';
    const permanent = error instanceof SendError && error.permanent;
    outcome = permanent || job.attempts >= MAX_ATTEMPTS
      ? { status: 'failed', lastErrorCode: code }
      : { status: 'queued', lastErrorCode: code, runAt: Timestamp.fromMillis(nowMs + backoffMs(job.attempts)) };
    if (outcome.status === 'failed') await releaseSms(db, ref, job);
    if (!(error instanceof SendError)) console.error(`[sms] ${job.id} failed`, error.message);
  }
  await finish(db, ref, { workerId, job, outcome });
  return outcome.status;
};

const processJob = async (db, ref, { adapter, smsAdapter, nowMs, workerId }) => {
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
    && (isKnownTemplate(job.template) || job.template === 'reminder_sms')
    && (apt.notificationVersion ?? apt.version) === job.appointmentVersion
    && apt.status === STATUS_FOR_TEMPLATE[job.template];
  if (!current) {
    await finish(db, ref, { workerId, job, outcome: { status: 'skipped', lastErrorCode: 'STALE' } });
    return 'skipped';
  }

  // A reminder held back (provider down, quota) is useless once the appointment has started.
  if (job.template.startsWith('reminder_') && apt.startsAt.toMillis() <= nowMs) {
    await finish(db, ref, { workerId, job, outcome: { status: 'skipped', lastErrorCode: 'TOO_LATE' } });
    return 'skipped';
  }

  if (channelOf(job.template) === 'sms') {
    return processSms(db, ref, { job, apt, business: bizSnap.data(), smsAdapter, nowMs, workerId });
  }

  // The business turned client emails off (T29): nothing is sent, and the
  // dashboard says so instead of showing a pending email.
  if (bizSnap.data()?.clientEmails === false) {
    await finish(db, ref, { workerId, job, outcome: { status: 'disabled', lastErrorCode: null } });
    return 'disabled';
  }

  let outcome;
  try {
    const message = renderEmail(job.template, {
      appointment: apt, businessName: bizSnap.data()?.name ?? '', manageUrl: manageUrlFor(apt),
      language: bizSnap.data()?.language,
    });
    message.fromName = bizSnap.data()?.name;
    const result = await adapter.send(message, { idempotencyKey: job.id });
    outcome = { status: result.status, providerMessageId: result.providerMessageId ?? null, lastErrorCode: null, sentAt: FieldValue.serverTimestamp() };
  } catch (error) {
    const code = error instanceof SendError ? error.code : 'SEND_ERROR';
    const permanent = error instanceof SendError && error.permanent;
    const deferrals = job.deferrals ?? 0;
    if (error instanceof SendError && error.retryAt && deferrals < MAX_DEFERRALS) {
      // Not this message's fault: give the attempt back and wait for the quota.
      outcome = {
        status: 'queued', lastErrorCode: code, attempts: job.attempts - 1, deferrals: deferrals + 1,
        runAt: Timestamp.fromMillis(Math.max(error.retryAt, nowMs + MINUTE)),
      };
    } else {
      outcome = permanent || job.attempts >= MAX_ATTEMPTS || error?.retryAt
        ? { status: 'failed', lastErrorCode: code }
        : { status: 'queued', lastErrorCode: code, runAt: Timestamp.fromMillis(nowMs + backoffMs(job.attempts)) };
    }
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
  adapter, smsAdapter = createMockSmsAdapter(), clock = Date.now, limit = 20, workerId = crypto.randomUUID(), businessId,
}) => {
  const nowMs = clock();
  const refs = await findDueJobs(db, Timestamp.fromMillis(nowMs), limit, businessId);
  const counts = {};
  for (const ref of refs) {
    const status = await processJob(db, ref, { adapter, smsAdapter, nowMs, workerId });
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
  failed.docs.forEach((d) => tx.update(d.ref, { status: 'queued', attempts: 0, deferrals: 0, runAt: now, lastErrorCode: null, updatedAt: now }));
  if (failed.size) {
    tx.update(aptRef, { 'notification.status': 'queued', 'notification.lastErrorCode': null, 'notification.updatedAt': now });
  }
  return failed.size;
});

// Runs the worker on an interval inside the API process.
export const startNotificationWorker = (db, { adapter, smsAdapter, intervalMs = 30 * 1000 }) => {
  let running = false;
  const tick = async () => {
    if (running) return;
    running = true;
    try {
      await processDueJobs(db, { adapter, smsAdapter });
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
