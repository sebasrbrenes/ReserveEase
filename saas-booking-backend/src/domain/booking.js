// Atomic booking creation (master document, sections 12.3 and 12.4).
//
// Exclusion: every booking holds one lock document per 5-minute block of the
// staff member's occupied interval (buffers included). Locks and the
// appointment are written in the same transaction, after reading every lock,
// so two requests for overlapping intervals cannot both commit.
//
// Idempotency: the Idempotency-Key header is stored (hashed) with a hash of
// the request. A retry with the same key and body returns the stored result;
// the same key with another body is rejected.
//
// The transaction callback may run more than once, so it has no external
// side effects: notifications are only queued as outbox documents.

import crypto from 'crypto';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import { computeAvailability, DomainError, occupancyOf } from './availability.js';
import { businessSchema, SCHEMA_VERSION, serviceSchema, staffSchema } from './schemas.js';
import { localDateOf, MINUTE } from './time.js';
import { queueNotifications } from '../notifications/jobs.js';

const BLOCK_MS = 5 * MINUTE;
const IDEMPOTENCY_TTL_MS = 7 * 24 * 60 * MINUTE;

const sha256 = (value) => crypto.createHash('sha256').update(value).digest('hex');

// Stable JSON: keys sorted, so the same intent always hashes the same way.
const canonical = (value) => {
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.keys(value).sort().map((k) => `${JSON.stringify(k)}:${canonical(value[k])}`).join(',')}}`;
  }
  return JSON.stringify(value);
};

export const lockIdsFor = (staffId, occupied) => {
  const ids = [];
  for (let t = occupied.from; t < occupied.until; t += BLOCK_MS) ids.push(`${staffId}_${t}`);
  return ids;
};

const toMs = (value) => (typeof value?.toMillis === 'function' ? value.toMillis() : Date.parse(value));

// Schedule exceptions (closures, blocks) of a local date that apply to a staff member.
export const readExceptions = async (tx, base, localDate, staffId) => {
  const snap = await tx.get(base.collection('scheduleExceptions').where('localDate', '==', localDate));
  return snap.docs
    .map((doc) => doc.data())
    .filter((e) => e.staffId == null || e.staffId === staffId)
    .map((e) => ({ from: toMs(e.from), until: toMs(e.until) }));
};

const parseSnap = (schema, snap, code, message) => {
  if (!snap.exists) throw new DomainError(code, message);
  return schema.parse(snap.data());
};

/**
 * @param {FirebaseFirestore.Firestore} db
 * @param {object} p
 * @param {string} p.businessId
 * @param {object} p.command        parsed publicBookingRequestSchema
 * @param {string} p.idempotencyKey value of the Idempotency-Key header
 * @param {'public'|'admin'} [p.source]
 * @param {() => number} [p.clock]  server clock, injectable for tests
 * @returns {Promise<{ created: boolean, result: object }>}
 */
export const createBooking = async (db, { businessId, command, idempotencyKey, source = 'public', clock = Date.now }) => {
  const base = db.doc(`businesses/${businessId}`);
  const keyRef = base.collection('idempotency').doc(sha256(`createBooking:${idempotencyKey}`));
  const intentHash = sha256(canonical(command));
  // Generated once, outside the callback, so retries reuse the same id.
  const appointmentRef = base.collection('appointments').doc();

  return db.runTransaction(async (tx) => {
    // Reads first: Firestore transactions require all reads before writes.
    const keySnap = await tx.get(keyRef);
    if (keySnap.exists) {
      const stored = keySnap.data();
      if (stored.intentHash !== intentHash) {
        throw new DomainError('IDEMPOTENCY_KEY_REUSED', 'This Idempotency-Key was used for a different request');
      }
      return { created: false, result: stored.result };
    }

    const [businessSnap, serviceSnap, staffSnap] = await tx.getAll(
      base,
      base.collection('services').doc(command.serviceId),
      base.collection('staff').doc(command.staffId),
    );
    const business = parseSnap(businessSchema, businessSnap, 'BUSINESS_NOT_FOUND', 'Business not found');
    const service = parseSnap(serviceSchema, serviceSnap, 'SERVICE_NOT_FOUND', 'Service not found');
    const staff = parseSnap(staffSchema, staffSnap, 'STAFF_NOT_FOUND', 'Staff member not found');
    if (business.status !== 'published') throw new DomainError('BUSINESS_NOT_FOUND', 'Business not found');

    const startsAtMs = Date.parse(command.startsAt);
    const localDate = localDateOf(startsAtMs, business.timezone);
    const busy = await readExceptions(tx, base, localDate, staff.id);

    // Schedule, grid, closing time, notice and horizon: the start must be one
    // the availability rules would offer, ignoring other bookings (locks cover those).
    const { slots } = computeAvailability({ business, service, staff, localDate, busy, now: clock() });
    if (!slots.some((s) => Date.parse(s.startsAt) === startsAtMs)) {
      throw new DomainError('SLOT_NOT_OFFERED', 'This start time is not offered for the service');
    }

    const occupied = occupancyOf(service, startsAtMs);
    const lockRefs = lockIdsFor(staff.id, occupied).map((id) => base.collection('slotLocks').doc(id));
    const lockSnaps = await tx.getAll(...lockRefs);
    if (lockSnaps.some((snap) => snap.exists)) {
      throw new DomainError('SLOT_UNAVAILABLE', 'This time was just taken. Choose another option.');
    }

    // Writes
    const endsAtMs = startsAtMs + service.durationMinutes * MINUTE;
    const now = FieldValue.serverTimestamp();
    tx.create(appointmentRef, {
      id: appointmentRef.id,
      businessId,
      staffId: staff.id,
      serviceId: service.id,
      startsAt: Timestamp.fromMillis(startsAtMs),
      endsAt: Timestamp.fromMillis(endsAtMs),
      occupiedFrom: Timestamp.fromMillis(occupied.from),
      occupiedUntil: Timestamp.fromMillis(occupied.until),
      businessTimezone: business.timezone,
      localDate,
      status: 'confirmed',
      source,
      client: command.client,
      serviceSnapshot: {
        name: service.name,
        durationMinutes: service.durationMinutes,
        bufferBeforeMinutes: service.bufferBeforeMinutes,
        bufferAfterMinutes: service.bufferAfterMinutes,
        priceMinor: service.priceMinor,
        currency: service.currency,
      },
      staffSnapshot: { displayName: staff.displayName },
      notes: command.notes,
      privacyNoticeVersion: command.privacyNoticeVersion,
      smsConsent: command.smsConsent,
      version: 1,
      // Version whose notifications are current; contact or note edits keep it.
      notificationVersion: 1,
      notification: { template: 'confirmation_email', status: 'queued', lastErrorCode: null, updatedAt: now },
      schemaVersion: SCHEMA_VERSION,
      createdAt: now,
      updatedAt: now,
    });
    lockRefs.forEach((ref) => tx.create(ref, { appointmentId: appointmentRef.id, staffId: staff.id, createdAt: now }));
    queueNotifications(tx, db, {
      businessId,
      appointmentId: appointmentRef.id,
      version: 1,
      template: 'confirmation_email',
      startsAtMs,
      nowMs: clock(),
    });
    tx.create(base.collection('auditEvents').doc(), {
      type: 'appointment.created',
      appointmentId: appointmentRef.id,
      source,
      at: now,
    });

    const result = {
      bookingReference: appointmentRef.id,
      status: 'confirmed',
      startsAt: new Date(startsAtMs).toISOString(),
      endsAt: new Date(endsAtMs).toISOString(),
      timezone: business.timezone,
      notificationStatus: 'queued',
    };
    tx.create(keyRef, {
      intentHash,
      result,
      createdAt: now,
      expiresAt: Timestamp.fromMillis(clock() + IDEMPOTENCY_TTL_MS),
    });
    return { created: true, result };
  }, { maxAttempts: 10 });
};
