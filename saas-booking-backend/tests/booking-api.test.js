// Concurrency and idempotency of booking creation (master document T07–T10),
// against the Firestore emulator (npm run test:backend at the repo root).
import crypto from 'crypto';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { localDateOf, shiftLocalDate, zonedToUtc } from '../src/domain/time.js';

process.env.BOOKING_RATE_MAX = '1000';

const hasEmulator = Boolean(process.env.FIRESTORE_EMULATOR_HOST);
const TZ = 'America/Costa_Rica';
const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

describe.skipIf(!hasEmulator)('POST /api/v1/public/businesses/:slug/bookings', () => {
  let app;
  let db;
  const date = shiftLocalDate(localDateOf(Date.now(), TZ), 7);
  const local = (hhmm) => {
    const [h, m] = hhmm.split(':').map(Number);
    return new Date(zonedToUtc(date, h * 60 + m, TZ)).toISOString();
  };

  const makeBusiness = async (id, slug) => {
    const base = db.doc(`businesses/${id}`);
    await base.set({
      id, ownerUid: `owner-${id}`, name: id, slug, timezone: TZ, currency: 'CRC', status: 'published',
      bookingPolicy: { confirmationMode: 'automatic', slotStepMinutes: 15, minNoticeMinutes: 60, maxAdvanceDays: 60, cancellationNoticeMinutes: 120 },
      weeklySchedule: Object.fromEntries(DAYS.map((d) => [d, [{ start: '09:00', end: '18:00' }]])),
      schemaVersion: 2,
    });
    await base.collection('services').doc('svc-60').set({ id: 'svc-60', name: 'Corte y barba', durationMinutes: 60, bufferAfterMinutes: 5, priceMinor: 900000, currency: 'CRC', active: true });
    await base.collection('services').doc('svc-30').set({ id: 'svc-30', name: 'Corte', durationMinutes: 30, priceMinor: 600000, currency: 'CRC', active: true });
    // Same staff id and name in both businesses on purpose (T07).
    await base.collection('staff').doc('ana').set({ id: 'ana', displayName: 'Ana', active: true, serviceIds: ['svc-60', 'svc-30'] });
    await db.doc(`publicBusinesses/${slug}`).set({
      businessId: id, slug, name: id, timezone: TZ, currency: 'CRC', status: 'published', services: [], staff: [],
    });
  };

  const body = (overrides = {}) => ({
    serviceId: 'svc-60',
    staffId: 'ana',
    startsAt: local('10:00'),
    client: { name: 'Cliente Demo', email: 'cliente@example.com', phoneE164: null },
    privacyNoticeVersion: 'demo-v1',
    ...overrides,
  });
  const key = () => crypto.randomUUID();
  const post = (slug, payload, idempotencyKey = key()) => request(app)
    .post(`/api/v1/public/businesses/${slug}/bookings`)
    .set('Idempotency-Key', idempotencyKey)
    .send(payload);
  const count = async (path) => (await db.collection(path).get()).size;

  beforeAll(async () => {
    ({ default: app } = await import('../app.js'));
    ({ db } = await import('../config/firebase.js'));
    await Promise.all(['t08', 't09', 't10', 'tmisc', 't07a', 't07b'].map((n) => makeBusiness(`biz-${n}`, `book-${n}`)));
  });

  afterAll(async () => {
    for (const n of ['t08', 't09', 't10', 'tmisc', 't07a', 't07b']) {
      await db.recursiveDelete(db.doc(`businesses/biz-${n}`));
      await db.doc(`publicBusinesses/book-${n}`).delete();
    }
    const jobs = await db.collection('notificationJobs').where('businessId', '>=', 'biz-t').where('businessId', '<', 'biz-u').get();
    await Promise.all(jobs.docs.map((d) => d.ref.delete()));
  });

  it('T08: twenty different requests for the same slot create exactly one booking', async () => {
    const responses = await Promise.all(
      Array.from({ length: 20 }, (_, i) => post('book-t08', body({ client: { name: `Cliente ${i}`, email: `c${i}@example.com`, phoneE164: null } })))
    );
    const statuses = responses.map((r) => r.status).sort();
    expect(statuses.filter((s) => s === 201)).toHaveLength(1);
    expect(statuses.filter((s) => s === 409)).toHaveLength(19);
    expect(responses.find((r) => r.status === 409).body.error.code).toBe('SLOT_UNAVAILABLE');

    expect(await count('businesses/biz-t08/appointments')).toBe(1);
    // 60 minutes + 5-minute buffer = 13 blocks of 5 minutes
    expect(await count('businesses/biz-t08/slotLocks')).toBe(13);
    const jobs = await db.collection('notificationJobs').where('businessId', '==', 'biz-t08').get();
    expect(jobs.docs.filter((d) => d.data().template === 'confirmation_email')).toHaveLength(1);
  }, 30_000);

  it('T09: twenty retries with the same key and body return one booking and one reference', async () => {
    const k = key();
    const responses = await Promise.all(Array.from({ length: 20 }, () => post('book-t09', body(), k)));
    expect(responses.every((r) => r.status === 201 || r.status === 200)).toBe(true);
    expect(responses.filter((r) => r.status === 201)).toHaveLength(1);
    expect(new Set(responses.map((r) => r.body.data.bookingReference)).size).toBe(1);
    expect(await count('businesses/biz-t09/appointments')).toBe(1);
  }, 30_000);

  it('T10: the same key with a different body is rejected', async () => {
    const k = key();
    expect((await post('book-t10', body(), k)).status).toBe(201);
    const res = await post('book-t10', body({ startsAt: local('14:00') }), k);
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('IDEMPOTENCY_KEY_REUSED');
    expect(await count('businesses/biz-t10/appointments')).toBe(1);
  });

  it('T07: staff with the same name in two businesses have independent agendas', async () => {
    expect((await post('book-t07a', body())).status).toBe(201);
    expect((await post('book-t07b', body())).status).toBe(201);
  });

  describe('single business', () => {
    it('returns the documented response and stores snapshots, not client input, for price', async () => {
      const res = await post('book-tmisc', body({ serviceId: 'svc-30', startsAt: local('09:00') }));
      expect(res.status).toBe(201);
      expect(res.body.data).toEqual({
        bookingReference: expect.any(String),
        status: 'confirmed',
        startsAt: local('09:00'),
        endsAt: new Date(Date.parse(local('09:00')) + 30 * 60000).toISOString(),
        timezone: TZ,
        notificationStatus: 'queued',
        managePath: expect.stringMatching(/^\/manage\/biz-tmisc\/[A-Za-z0-9]+\?k=[A-Za-z0-9_-]{32}$/),
      });
      const apt = (await db.doc(`businesses/biz-tmisc/appointments/${res.body.data.bookingReference}`).get()).data();
      expect(apt).toMatchObject({ status: 'confirmed', localDate: date, version: 1, serviceSnapshot: { priceMinor: 600000, currency: 'CRC' } });
    });

    it('rejects an overlapping booking that starts at a different time', async () => {
      expect((await post('book-tmisc', body({ startsAt: local('11:00') }))).status).toBe(201); // 11:00–12:05
      const res = await post('book-tmisc', body({ serviceId: 'svc-30', startsAt: local('11:30') }));
      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe('SLOT_UNAVAILABLE');
    });

    it('removes a taken slot from public availability', async () => {
      const res = await request(app).get(`/api/v1/public/businesses/book-tmisc/availability?${new URLSearchParams({ serviceId: 'svc-30', staffId: 'ana', date })}`);
      const starts = res.body.data.slots.map((s) => s.startsAt);
      expect(starts).not.toContain(local('09:00'));
      expect(starts).not.toContain(local('11:30'));
      expect(starts).toContain(local('09:30'));
    });

    it('rejects start times the schedule does not offer', async () => {
      for (const startsAt of [local('10:07'), local('17:30'), local('07:00')]) {
        const res = await post('book-tmisc', body({ startsAt }));
        expect(res.status).toBe(422);
        expect(res.body.error.code).toBe('SLOT_NOT_OFFERED');
      }
    });

    it('rejects server-owned fields and a missing Idempotency-Key', async () => {
      const withStatus = await post('book-tmisc', { ...body(), status: 'completed', priceMinor: 1 });
      expect(withStatus.status).toBe(400);
      const noKey = await request(app).post('/api/v1/public/businesses/book-tmisc/bookings').send(body());
      expect(noKey.status).toBe(400);
      expect(noKey.body.error.fields[0].path).toBe('idempotency-key');
    });
  });
});
