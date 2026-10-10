// Runs against the Firestore emulator (npm run test:backend at the repo root).
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { localDateOf, shiftLocalDate, zonedToUtc } from '../src/domain/time.js';

const hasEmulator = Boolean(process.env.FIRESTORE_EMULATOR_HOST);
const TZ = 'America/Costa_Rica';
const BIZ = 'biz-avail-test';
const SLUG = 'avail-test';

describe.skipIf(!hasEmulator)('GET /api/v1/public/businesses/:slug/availability', () => {
  let app;
  let db;
  const date = shiftLocalDate(localDateOf(Date.now(), TZ), 7);
  const local = (hhmm) => {
    const [h, m] = hhmm.split(':').map(Number);
    return new Date(zonedToUtc(date, h * 60 + m, TZ));
  };
  const url = (q) => `/api/v1/public/businesses/${SLUG}/availability?${new URLSearchParams(q)}`;
  const everyDay = Object.fromEntries(
    ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'].map((d) => [d, [{ start: '09:00', end: '13:00' }]])
  );

  beforeAll(async () => {
    ({ default: app } = await import('../app.js'));
    ({ db } = await import('../config/firebase.js'));
    const base = db.doc(`businesses/${BIZ}`);
    await base.set({
      id: BIZ, ownerUid: 'owner-test', name: 'Avail Test', slug: SLUG, timezone: TZ, currency: 'CRC', status: 'published',
      bookingPolicy: { confirmationMode: 'automatic', slotStepMinutes: 30, minNoticeMinutes: 60, maxAdvanceDays: 60, cancellationNoticeMinutes: 120 },
      weeklySchedule: everyDay, schemaVersion: 2,
    });
    await base.collection('services').doc('svc-30').set({ id: 'svc-30', name: 'Corte', durationMinutes: 30, priceMinor: 600000, currency: 'CRC', active: true });
    await base.collection('staff').doc('ana').set({ id: 'ana', displayName: 'Ana', active: true, serviceIds: ['svc-30'] });
    await base.collection('staff').doc('luis').set({ id: 'luis', displayName: 'Luis', active: true, serviceIds: [] });
    await base.collection('appointments').doc('confirmed').set({
      staffId: 'ana', localDate: date, status: 'confirmed', occupiedFrom: local('10:00'), occupiedUntil: local('10:30'),
      client: { name: 'Cliente Secreto', email: 'secreto@example.com' },
    });
    await base.collection('appointments').doc('cancelled').set({
      staffId: 'ana', localDate: date, status: 'cancelled', occupiedFrom: local('11:00'), occupiedUntil: local('11:30'),
    });
    await base.collection('scheduleExceptions').doc('lunch').set({
      staffId: null, localDate: date, from: local('12:00'), until: local('13:00'),
    });
    await db.doc(`publicBusinesses/${SLUG}`).set({
      businessId: BIZ, slug: SLUG, name: 'Avail Test', timezone: TZ, currency: 'CRC', status: 'published', services: [], staff: [],
    });
  });

  afterAll(async () => {
    await db.recursiveDelete(db.doc(`businesses/${BIZ}`));
    await db.doc(`publicBusinesses/${SLUG}`).delete();
  });

  it('returns free slots and never exposes other clients', async () => {
    const res = await request(app).get(url({ serviceId: 'svc-30', staffId: 'ana', date }));
    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({ timezone: TZ, date, status: 'open' });
    expect(res.body.data.slots.map((s) => s.startsAt)).toEqual(
      ['09:00', '09:30', '10:30', '11:00', '11:30'].map((t) => local(t).toISOString())
    );
    expect(JSON.stringify(res.body)).not.toMatch(/Secreto|secreto@/);
  });

  it('rejects a staff member who does not offer the service (T06)', async () => {
    const res = await request(app).get(url({ serviceId: 'svc-30', staffId: 'luis', date }));
    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe('STAFF_CANNOT_PERFORM');
  });

  it('returns 404 for an unknown service', async () => {
    const res = await request(app).get(url({ serviceId: 'nope', staffId: 'ana', date }));
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('SERVICE_NOT_FOUND');
  });

  it('rejects impossible dates', async () => {
    const res = await request(app).get(url({ serviceId: 'svc-30', staffId: 'ana', date: '2026-02-30' }));
    expect(res.status).toBe(400);
    expect(res.body.error.fields[0].path).toBe('date');
  });
});
