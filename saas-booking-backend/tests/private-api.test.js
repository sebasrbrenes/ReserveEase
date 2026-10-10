// Private appointment API for business members (master document T11–T15,
// T18, T23), against the Firestore and Auth emulators.
import crypto from 'crypto';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { localDateOf, shiftLocalDate, zonedToUtc } from '../src/domain/time.js';

process.env.BOOKING_RATE_MAX = '1000';

const hasEmulators = Boolean(process.env.FIRESTORE_EMULATOR_HOST && process.env.FIREBASE_AUTH_EMULATOR_HOST);
const TZ = 'America/Costa_Rica';
const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

describe.skipIf(!hasEmulators)('private appointment API', () => {
  let app;
  let db;
  let auth;
  const tokens = {};
  const date = shiftLocalDate(localDateOf(Date.now(), TZ), 7);
  const local = (hhmm, d = date) => {
    const [h, m] = hhmm.split(':').map(Number);
    return new Date(zonedToUtc(d, h * 60 + m, TZ)).toISOString();
  };

  const signIn = async (uid, emailVerified = true) => {
    const email = `${uid}@demo.test`;
    await auth.createUser({ uid, email, password: 'demo1234', emailVerified }).catch(() => {});
    const res = await fetch(
      `http://${process.env.FIREBASE_AUTH_EMULATOR_HOST}/identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=demo`,
      { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email, password: 'demo1234', returnSecureToken: true }) },
    );
    return (await res.json()).idToken;
  };

  const makeBusiness = async (id, ownerUid) => {
    const base = db.doc(`businesses/${id}`);
    await base.set({
      id, ownerUid, name: id, slug: id, timezone: TZ, currency: 'CRC', status: 'published',
      bookingPolicy: { confirmationMode: 'automatic', slotStepMinutes: 15, minNoticeMinutes: 60, maxAdvanceDays: 60, cancellationNoticeMinutes: 120 },
      weeklySchedule: Object.fromEntries(DAYS.map((d) => [d, [{ start: '09:00', end: '18:00' }]])),
      schemaVersion: 2,
    });
    await base.collection('members').doc(ownerUid).set({ role: 'owner' });
    await base.collection('services').doc('svc-60').set({ id: 'svc-60', name: 'Corte y barba', durationMinutes: 60, bufferAfterMinutes: 5, priceMinor: 900000, currency: 'CRC', active: true });
    await base.collection('staff').doc('ana').set({ id: 'ana', displayName: 'Ana', active: true, serviceIds: ['svc-60'] });
    await base.collection('staff').doc('luis').set({ id: 'luis', displayName: 'Luis', active: true, serviceIds: ['svc-60'] });
  };

  const api = (method, path, token, body) => {
    let r = request(app)[method](`/api/v1/businesses/${path}`);
    if (token) r = r.set('Authorization', `Bearer ${token}`);
    return body ? r.send(body) : r;
  };
  const book = async (startsAt, staffId = 'ana', businessId = 'biz-priv-a') => {
    const res = await api('post', `${businessId}/appointments`, tokens.a)
      .set('Idempotency-Key', crypto.randomUUID())
      .send({ serviceId: 'svc-60', staffId, startsAt, client: { name: 'Cliente Privado', email: 'privado@example.com', phoneE164: '+50688887777' } });
    expect(res.status).toBe(201);
    return res.body.data.bookingReference;
  };
  const getApt = async (id) => (await db.doc(`businesses/biz-priv-a/appointments/${id}`).get()).data();
  const lockCount = async (id) => (await db.collection('businesses/biz-priv-a/slotLocks').where('appointmentId', '==', id).get()).size;
  const job = async (id) => (await db.doc(`notificationJobs/${id}`).get()).data();

  beforeAll(async () => {
    ({ default: app } = await import('../app.js'));
    const firebase = await import('../config/firebase.js');
    db = firebase.db;
    const { getAuth } = await import('firebase-admin/auth');
    auth = getAuth(firebase.default);
    await makeBusiness('biz-priv-a', 'owner-priv-a');
    await makeBusiness('biz-priv-b', 'owner-priv-b');
    tokens.a = await signIn('owner-priv-a');
    tokens.b = await signIn('owner-priv-b');
    tokens.unverified = await signIn('owner-priv-unverified', false);
  });

  afterAll(async () => {
    await db.recursiveDelete(db.doc('businesses/biz-priv-a'));
    await db.recursiveDelete(db.doc('businesses/biz-priv-b'));
    const jobs = await db.collection('notificationJobs').where('businessId', 'in', ['biz-priv-a', 'biz-priv-b']).get();
    await Promise.all(jobs.docs.map((d) => d.ref.delete()));
  });

  it('T18: requires a valid token from a verified account', async () => {
    const range = `biz-priv-a/appointments?from=${date}&to=${date}`;
    expect((await api('get', range)).status).toBe(401);
    expect((await api('get', range, 'not-a-token')).body.error.code).toBe('UNAUTHENTICATED');
    const unverified = await api('get', range, tokens.unverified);
    expect(unverified.status).toBe(403);
    expect(unverified.body.error.code).toBe('EMAIL_NOT_VERIFIED');
  });

  it('T15: an owner of another business gets no access and no data', async () => {
    await book(local('09:00'));
    const res = await api('get', `biz-priv-a/appointments?from=${date}&to=${date}`, tokens.b);
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('FORBIDDEN');
    expect(JSON.stringify(res.body)).not.toMatch(/Privado|privado@/);
    const cancel = await api('post', 'biz-priv-a/appointments/whatever/cancel', tokens.b, { expectedVersion: 1 });
    expect(cancel.status).toBe(403);
  });

  it('lists the business appointments in a date range', async () => {
    const res = await api('get', `biz-priv-a/appointments?from=${date}&to=${date}`, tokens.a);
    expect(res.status).toBe(200);
    expect(res.body.data[0]).toMatchObject({ status: 'confirmed', startsAt: local('09:00'), client: { name: 'Cliente Privado' }, version: 1 });
  });

  it('T11: rescheduling onto a taken slot leaves the original intact', async () => {
    const first = await book(local('11:00'));
    const second = await book(local('13:00'));
    const res = await api('post', `biz-priv-a/appointments/${second}/reschedule`, tokens.a, { expectedVersion: 1, startsAt: local('11:30') });
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('SLOT_UNAVAILABLE');
    const apt = await getApt(second);
    expect(apt.startsAt.toDate().toISOString()).toBe(local('13:00'));
    expect(apt.version).toBe(1);
    expect(await lockCount(second)).toBe(13);
    expect(await lockCount(first)).toBe(13);
  });

  it('T12: rescheduling moves locks and jobs atomically and bumps the version', async () => {
    const id = await book(local('15:00'));
    // Overlaps its own current interval: its own locks do not block it.
    const res = await api('post', `biz-priv-a/appointments/${id}/reschedule`, tokens.a, { expectedVersion: 1, startsAt: local('15:30') });
    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({ startsAt: local('15:30'), version: 2 });
    expect(await lockCount(id)).toBe(13);
    const locks = await db.collection('businesses/biz-priv-a/slotLocks').where('appointmentId', '==', id).get();
    const lockTimes = locks.docs.map((d) => Number(d.id.split('_')[1])).sort();
    expect(new Date(lockTimes[0]).toISOString()).toBe(local('15:30'));
    expect((await job(`${id}_v1_confirmation_email`)).status).toBe('cancelled');
    expect((await job(`${id}_v2_reschedule_email`)).status).toBe('queued');

    const moved = await api('post', `biz-priv-a/appointments/${id}/reschedule`, tokens.a, { expectedVersion: 2, startsAt: local('15:00'), staffId: 'luis' });
    expect(moved.status).toBe(200);
    expect(moved.body.data).toMatchObject({ staffId: 'luis', staffSnapshot: { displayName: 'Luis' }, version: 3 });
  });

  it('T14: a change based on an old version is rejected', async () => {
    const id = await book(local('09:00', shiftLocalDate(date, 1)));
    expect((await api('patch', `biz-priv-a/appointments/${id}`, tokens.a, { expectedVersion: 1, notes: 'primera' })).status).toBe(200);
    const stale = await api('patch', `biz-priv-a/appointments/${id}`, tokens.a, { expectedVersion: 1, notes: 'segunda' });
    expect(stale.status).toBe(409);
    expect(stale.body.error.code).toBe('VERSION_CONFLICT');
    expect((await getApt(id)).notes).toBe('primera');
  });

  it('T13: cancelling twice is safe, frees the slot and stops pending messages', async () => {
    const id = await book(local('10:00', shiftLocalDate(date, 2)));
    const once = await api('post', `biz-priv-a/appointments/${id}/cancel`, tokens.a, { expectedVersion: 1, reason: 'cliente' });
    const twice = await api('post', `biz-priv-a/appointments/${id}/cancel`, tokens.a, { expectedVersion: 1 });
    expect(once.status).toBe(200);
    expect(twice.status).toBe(200);
    expect(twice.body.data).toMatchObject({ status: 'cancelled', version: 2 });
    expect(await lockCount(id)).toBe(0);
    expect((await job(`${id}_v1_confirmation_email`)).status).toBe('cancelled');
    await book(local('10:00', shiftLocalDate(date, 2))); // the slot is free again
  });

  it('T23: editing contact or notes keeps status and createdAt', async () => {
    const id = await book(local('16:30', shiftLocalDate(date, 3)));
    // Move it into the past and mark it completed directly, as if it had happened.
    await db.doc(`businesses/biz-priv-a/appointments/${id}`).update({ status: 'completed', startsAt: new Date(Date.now() - 3600000) });
    const before = await getApt(id);
    const res = await api('patch', `biz-priv-a/appointments/${id}`, tokens.a, {
      expectedVersion: 1, notes: 'trajo su propio producto', client: { phoneE164: '+50677776666' },
    });
    expect(res.status).toBe(200);
    const after = await getApt(id);
    expect(after.status).toBe('completed');
    expect(after.createdAt.isEqual(before.createdAt)).toBe(true);
    expect(after.client).toEqual({ name: 'Cliente Privado', email: 'privado@example.com', phoneE164: '+50677776666' });
    const badPhone = await api('patch', `biz-priv-a/appointments/${id}`, tokens.a, { expectedVersion: 2, client: { phoneE164: '88887777' } });
    expect(badPhone.status).toBe(400);
  });

  it('only marks appointments completed or no-show once they have started', async () => {
    const future = await book(local('17:00', shiftLocalDate(date, 4)));
    const early = await api('post', `biz-priv-a/appointments/${future}/transition`, tokens.a, { expectedVersion: 1, to: 'completed' });
    expect(early.status).toBe(422);
    expect(early.body.error.code).toBe('TOO_EARLY');

    await db.doc(`businesses/biz-priv-a/appointments/${future}`).update({ startsAt: new Date(Date.now() - 30 * 60000) });
    const done = await api('post', `biz-priv-a/appointments/${future}/transition`, tokens.a, { expectedVersion: 1, to: 'completed' });
    expect(done.status).toBe(200);
    const again = await api('post', `biz-priv-a/appointments/${future}/transition`, tokens.a, { expectedVersion: 2, to: 'no_show' });
    expect(again.status).toBe(422);
    expect(again.body.error.code).toBe('INVALID_TRANSITION');
  });
});
