// Changes to existing appointments (master document, sections 11.7, 12.5, 12.6).
// Every change runs in one transaction, checks the caller's expected version
// and moves locks and notification jobs together with the appointment.

import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import { computeAvailability, DomainError, occupancyOf } from './availability.js';
import { lockIdsFor, readExceptions } from './booking.js';
import { businessSchema, staffSchema } from './schemas.js';
import { localDateOf, MINUTE } from './time.js';
import { cancelJobs, queueNotifications, readPendingJobs } from '../notifications/jobs.js';

// A no-show can be recorded once this long has passed since the start.
export const NO_SHOW_GRACE_MINUTES = 15;


const readAppointment = async (tx, ref, expectedVersion) => {
  const snap = await tx.get(ref);
  if (!snap.exists) throw new DomainError('APPOINTMENT_NOT_FOUND', 'Appointment not found');
  const apt = snap.data();
  if (expectedVersion !== undefined && apt.version !== expectedVersion) {
    throw new DomainError('VERSION_CONFLICT', 'The appointment changed. Reload and try again.');
  }
  return apt;
};

const audit = (tx, base, type, appointmentId, actorUid, extra = {}) => {
  tx.create(base.collection('auditEvents').doc(), {
    type, appointmentId, actorUid, at: FieldValue.serverTimestamp(), ...extra,
  });
};

export const cancelAppointment = (db, { businessId, appointmentId, expectedVersion, reason = '', actorUid }) => {
  const base = db.doc(`businesses/${businessId}`);
  const ref = base.collection('appointments').doc(appointmentId);
  return db.runTransaction(async (tx) => {
    const current = await readAppointment(tx, ref);
    // Repeating a cancellation is safe and changes nothing (T13).
    if (current.status === 'cancelled') return current;
    if (current.version !== expectedVersion) {
      throw new DomainError('VERSION_CONFLICT', 'The appointment changed. Reload and try again.');
    }
    if (current.status !== 'confirmed') {
      throw new DomainError('INVALID_TRANSITION', `A ${current.status} appointment cannot be cancelled`);
    }
    const jobs = await readPendingJobs(tx, db, appointmentId, current.notificationVersion ?? current.version);

    const occupied = { from: current.occupiedFrom.toMillis(), until: current.occupiedUntil.toMillis() };
    lockIdsFor(current.staffId, occupied).forEach((id) => tx.delete(base.collection('slotLocks').doc(id)));
    cancelJobs(tx, jobs);
    const update = {
      status: 'cancelled',
      cancelledAt: FieldValue.serverTimestamp(),
      cancellationReason: reason,
      version: current.version + 1,
      notificationVersion: current.version + 1,
      notification: { template: 'cancellation_email', status: 'queued', lastErrorCode: null, updatedAt: FieldValue.serverTimestamp() },
      updatedAt: FieldValue.serverTimestamp(),
    };
    tx.update(ref, update);
    queueNotifications(tx, db, {
      businessId, appointmentId, version: update.version, template: 'cancellation_email', withReminder: false,
    });
    audit(tx, base, 'appointment.cancelled', appointmentId, actorUid);
    return { ...current, ...update, cancelledAt: null, updatedAt: null };
  });
};

export const rescheduleAppointment = (db, {
  businessId, appointmentId, expectedVersion, startsAt, staffId, actorUid, clock = Date.now,
}) => {
  const base = db.doc(`businesses/${businessId}`);
  const ref = base.collection('appointments').doc(appointmentId);
  return db.runTransaction(async (tx) => {
    const current = await readAppointment(tx, ref, expectedVersion);
    if (current.status !== 'confirmed') {
      throw new DomainError('INVALID_TRANSITION', `A ${current.status} appointment cannot be rescheduled`);
    }
    const targetStaffId = staffId || current.staffId;
    const [businessSnap, staffSnap] = await tx.getAll(base, base.collection('staff').doc(targetStaffId));
    if (!staffSnap.exists) throw new DomainError('STAFF_NOT_FOUND', 'Staff member not found');
    const business = businessSchema.parse(businessSnap.data());
    const staff = staffSchema.parse(staffSnap.data());

    // The booked service keeps its snapshot (duration, buffers, price).
    const service = { id: current.serviceId, active: true, ...current.serviceSnapshot };
    const startsAtMs = Date.parse(startsAt);
    const localDate = localDateOf(startsAtMs, business.timezone);
    const busy = await readExceptions(tx, base, localDate, staff.id);
    const { slots } = computeAvailability({ business, service, staff, localDate, busy, now: clock() });
    if (!slots.some((s) => Date.parse(s.startsAt) === startsAtMs)) {
      throw new DomainError('SLOT_NOT_OFFERED', 'This start time is not offered for the service');
    }

    const oldIds = lockIdsFor(current.staffId, {
      from: current.occupiedFrom.toMillis(), until: current.occupiedUntil.toMillis(),
    });
    const occupied = occupancyOf(service, startsAtMs);
    const newIds = lockIdsFor(staff.id, occupied);
    const toAcquire = newIds.filter((id) => !oldIds.includes(id));
    const toRelease = oldIds.filter((id) => !newIds.includes(id));

    const lockSnaps = toAcquire.length
      ? await tx.getAll(...toAcquire.map((id) => base.collection('slotLocks').doc(id)))
      : [];
    if (lockSnaps.some((s) => s.exists)) {
      throw new DomainError('SLOT_UNAVAILABLE', 'This time was just taken. Choose another option.');
    }
    const jobs = await readPendingJobs(tx, db, appointmentId, current.notificationVersion ?? current.version);

    // Writes: one operation, so a failure leaves the original appointment intact (T11).
    const now = FieldValue.serverTimestamp();
    const version = current.version + 1;
    toRelease.forEach((id) => tx.delete(base.collection('slotLocks').doc(id)));
    toAcquire.forEach((id) => tx.create(base.collection('slotLocks').doc(id), {
      appointmentId, staffId: staff.id, createdAt: now,
    }));
    cancelJobs(tx, jobs);
    queueNotifications(tx, db, {
      businessId, appointmentId, version, template: 'reschedule_email', startsAtMs, nowMs: clock(),
    });
    const update = {
      staffId: staff.id,
      staffSnapshot: { displayName: staff.displayName },
      startsAt: Timestamp.fromMillis(startsAtMs),
      endsAt: Timestamp.fromMillis(startsAtMs + service.durationMinutes * MINUTE),
      occupiedFrom: Timestamp.fromMillis(occupied.from),
      occupiedUntil: Timestamp.fromMillis(occupied.until),
      localDate,
      version,
      notificationVersion: version,
      notification: { template: 'reschedule_email', status: 'queued', lastErrorCode: null, updatedAt: now },
      updatedAt: now,
    };
    tx.update(ref, update);
    audit(tx, base, 'appointment.rescheduled', appointmentId, actorUid, {
      from: current.startsAt, to: update.startsAt,
    });
    return { ...current, ...update, updatedAt: null };
  });
};

// Contact and notes only: status, times and createdAt are preserved (T23).
export const updateAppointmentDetails = (db, { businessId, appointmentId, expectedVersion, changes, actorUid }) => {
  const base = db.doc(`businesses/${businessId}`);
  const ref = base.collection('appointments').doc(appointmentId);
  return db.runTransaction(async (tx) => {
    const current = await readAppointment(tx, ref, expectedVersion);
    const update = { version: current.version + 1, updatedAt: FieldValue.serverTimestamp() };
    if (changes.client) update.client = { ...current.client, ...changes.client };
    if (changes.notes !== undefined) update.notes = changes.notes;
    tx.update(ref, update);
    audit(tx, base, 'appointment.updated', appointmentId, actorUid, { fields: Object.keys(changes) });
    return { ...current, ...update, updatedAt: null };
  });
};

// confirmed -> completed (from the start time) or no_show (after a grace period).
export const transitionAppointment = (db, {
  businessId, appointmentId, expectedVersion, to, actorUid, clock = Date.now,
}) => {
  const base = db.doc(`businesses/${businessId}`);
  const ref = base.collection('appointments').doc(appointmentId);
  return db.runTransaction(async (tx) => {
    const current = await readAppointment(tx, ref, expectedVersion);
    if (current.status !== 'confirmed') {
      throw new DomainError('INVALID_TRANSITION', `A ${current.status} appointment cannot change to ${to}`);
    }
    const startsAtMs = current.startsAt.toMillis();
    const earliest = to === 'no_show' ? startsAtMs + NO_SHOW_GRACE_MINUTES * MINUTE : startsAtMs;
    if (clock() < earliest) {
      throw new DomainError('TOO_EARLY', `The appointment cannot be marked ${to} yet`);
    }
    const update = { status: to, version: current.version + 1, updatedAt: FieldValue.serverTimestamp() };
    tx.update(ref, update);
    audit(tx, base, `appointment.${to}`, appointmentId, actorUid);
    return { ...current, ...update, updatedAt: null };
  });
};

export const listAppointments = async (db, { businessId, fromDate, toDate, limit = 1000 }) => {
  const snap = await db.collection(`businesses/${businessId}/appointments`)
    .where('localDate', '>=', fromDate)
    .where('localDate', '<=', toDate)
    .orderBy('localDate')
    .limit(limit)
    .get();
  return snap.docs.map((d) => d.data()).sort((a, b) => a.startsAt.toMillis() - b.startsAt.toMillis());
};

// API representation: Firestore timestamps as ISO strings.
export const toApi = (apt) => {
  const iso = (t) => (t && typeof t.toDate === 'function' ? t.toDate().toISOString() : t ?? null);
  return {
    id: apt.id,
    status: apt.status,
    staffId: apt.staffId,
    serviceId: apt.serviceId,
    startsAt: iso(apt.startsAt),
    endsAt: iso(apt.endsAt),
    localDate: apt.localDate,
    timezone: apt.businessTimezone,
    client: apt.client,
    notes: apt.notes,
    serviceSnapshot: apt.serviceSnapshot,
    staffSnapshot: apt.staffSnapshot,
    source: apt.source,
    version: apt.version,
    createdAt: iso(apt.createdAt),
    cancellationReason: apt.cancellationReason,
    notification: apt.notification
      ? { template: apt.notification.template, status: apt.notification.status, lastErrorCode: apt.notification.lastErrorCode ?? null }
      : null,
  };
};
