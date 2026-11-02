// The owner's CSV export and account deletion, against the Firestore and Auth emulators.
import crypto from 'crypto';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { appointmentsCsv, keepsBilling } from '../src/domain/account.js';
import { businessIdFor } from '../src/domain/legacySync.js';
import { localDateOf, shiftLocalDate, zonedToUtc } from '../src/domain/time.js';

process.env.BOOKING_RATE_MAX = '1000';

const hasEmulators = Boolean(process.env.FIRESTORE_EMULATOR_HOST && process.env.FIREBASE_AUTH_EMULATOR_HOST);
const TZ = 'America/Costa_Rica';
const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

describe('account helpers', () => {
  it('writes CSV that spreadsheets read as text, never as formulas', () => {
    const csv = appointmentsCsv([{
      localDate: '2026-11-03', status: 'confirmed', client: { name: '=HYPERLINK("x")', email: 'a@b.co' }, notes: 'dijo "hola"',
    }]);
    const [header, row] = csv.trim().split('\r\n');
    expect(header.split(',')).toContain('client_email');
    expect(row).toContain('"\'=HYPERLINK(""x"")"');
    expect(row).toContain('"dijo ""hola"""');
  });

  it('asks to cancel a subscription that will charge again', () => {
    expect(keepsBilling({ status: 'active' })).toBe(true);
    expect(keepsBilling({ status: 'past_due' })).toBe(true);
    expect(keepsBilling({ status: 'active', scheduledChange: { action: 'cancel' } })).toBe(false);
    expect(keepsBilling({ status: 'canceled' })).toBe(false);
    expect(keepsBilling(undefined)).toBe(false);
  });
});

describe.skipIf(!hasEmulators)('account API', () => {
  let app;
  let db;
  let auth;
  const owner = 'owner-account-a';
  const other = 'owner-account-b';
  const businessId = businessIdFor(owner);
  const slug = 'cuenta-a';
  const tokens = {};
  const date = shiftLocalDate(localDateOf(Date.now(), TZ), 7);
  const at = (h) => new Date(zonedToUtc(date, h * 60, TZ)).toISOString();

  const signIn = async (uid) => {
    const email = `${uid}@demo.test`;
    await auth.createUser({ uid, email, password: 'demo1234', emailVerified: true }).catch(() => {});
    const res = await fetch(
      `http://${process.env.FIREBASE_AUTH_EMULATOR_HOST}/identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=demo`,
      { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email, password: 'demo1234', returnSecureToken: true }) },
    );
    return (await res.json()).idToken;
  };

  const makeBusiness = async (id, ownerUid, publicSlug) => {
    const base = db.doc(`businesses/${id}`);
    await base.set({
      id, ownerUid, name: id, slug: publicSlug, timezone: TZ, currency: 'CRC', status: 'published',
      bookingPolicy: { confirmationMode: 'automatic', slotStepMinutes: 15, minNoticeMinutes: 60, maxAdvanceDays: 60, cancellationNoticeMinutes: 120 },
      weeklySchedule: Object.fromEntries(DAYS.map((d) => [d, [{ start: '09:00', end: '18:00' }]])),
      schemaVersion: 2,
    });
    await base.collection('members').doc(ownerUid).set({ role: 'owner' });
    await base.collection('services').doc('svc-30').set({ id: 'svc-30', name: 'Corte', durationMinutes: 30, bufferAfterMinutes: 0, priceMinor: 600000, currency: 'CRC', active: true });
    await base.collection('staff').doc('ana').set({ id: 'ana', displayName: 'Ana', active: true, serviceIds: ['svc-30'] });
    await db.doc(`publicBusinesses/${publicSlug}`).set({ businessId: id, slug: publicSlug, status: 'published' });
    await db.doc(`users/${ownerUid}`).set({ email: `${ownerUid}@demo.test` });
    await db.doc(`users/${ownerUid}/settings/business`).set({ businessName: id });
  };

  const api = (method, path, token) => {
    const r = request(app)[method](`/api/v1${path}`);
    return token ? r.set('Authorization', `Bearer ${token}`) : r;
  };

  beforeAll(async () => {
    ({ default: app } = await import('../app.js'));
    const firebase = await import('../config/firebase.js');
    db = firebase.db;
    const { getAuth } = await import('firebase-admin/auth');
    auth = getAuth(firebase.default);
    await makeBusiness(businessId, owner, slug);
    tokens.a = await signIn(owner);
    tokens.b = await signIn(other);
    const booked = await api('post', `/businesses/${businessId}/appointments`, tokens.a)
      .set('Idempotency-Key', crypto.randomUUID())
      .send({ serviceId: 'svc-30', staffId: 'ana', startsAt: at(10), client: { name: 'Lucía Pérez', email: 'lucia@example.com' } });
    expect(booked.status).toBe(201);
  });

  afterAll(async () => {
    await db.recursiveDelete(db.doc(`businesses/${businessId}`));
    await db.doc(`publicBusinesses/${slug}`).delete();
    await db.recursiveDelete(db.doc(`users/${owner}`));
    await auth.deleteUser(other).catch(() => {});
  });

  it('exports every appointment as CSV for the owner only', async () => {
    const res = await api('get', `/businesses/${businessId}/appointments/export`, tokens.a);
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/text\/csv/);
    expect(res.headers['content-disposition']).toMatch(/attachment/);
    expect(res.text).toContain('"Lucía Pérez"');
    expect(res.text).toContain('"lucia@example.com"');

    const otherOwner = await api('get', `/businesses/${businessId}/appointments/export`, tokens.b);
    expect(otherOwner.status).toBe(403);
    expect(otherOwner.text).not.toContain('Lucía');
  });

  it('asks for an explicit confirmation', async () => {
    const res = await api('delete', '/me/account', tokens.a).send({});
    expect(res.status).toBe(400);
    expect(await db.doc(`businesses/${businessId}`).get().then((s) => s.exists)).toBe(true);
  });

  it('refuses while the subscription will still charge', async () => {
    const sub = db.doc(`businesses/${businessId}/billing/subscription`);
    await sub.set({ status: 'active', customerId: 'ctm_1' });
    const res = await api('delete', '/me/account', tokens.a).send({ confirm: true });
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('SUBSCRIPTION_ACTIVE');
    // Canceled at the end of the period: deleting is allowed.
    await sub.set({ status: 'active', customerId: 'ctm_1', scheduledChange: { action: 'cancel', effectiveAt: null } });
  });

  it('deletes the business, its public page, pending notices, settings and login', async () => {
    const jobsBefore = await db.collection('notificationJobs').where('businessId', '==', businessId).get();
    expect(jobsBefore.size).toBeGreaterThan(0);

    const res = await api('delete', '/me/account', tokens.a).send({ confirm: true });
    expect(res.status).toBe(200);
    expect(res.body.data).toEqual({ deleted: true });

    expect((await db.doc(`businesses/${businessId}`).get()).exists).toBe(false);
    expect((await db.collection(`businesses/${businessId}/appointments`).get()).size).toBe(0);
    expect((await db.doc(`publicBusinesses/${slug}`).get()).exists).toBe(false);
    expect((await db.collection('notificationJobs').where('businessId', '==', businessId).get()).size).toBe(0);
    expect((await db.doc(`users/${owner}/settings/business`).get()).exists).toBe(false);
    await expect(auth.getUser(owner)).rejects.toMatchObject({ code: 'auth/user-not-found' });

    // The other business is untouched.
    expect((await auth.getUser(other)).uid).toBe(other);
  });
});
