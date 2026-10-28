// The client's own appointment through the link in their emails: viewing,
// rescheduling and cancelling with the key, never without it or too late.
import crypto from 'crypto';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { localDateOf, shiftLocalDate, zonedToUtc } from '../src/domain/time.js';
import { renderEmail } from '../src/notifications/templates.js';

process.env.BOOKING_RATE_MAX = '1000';
process.env.MANAGE_RATE_MAX = '1000';

const hasEmulator = Boolean(process.env.FIRESTORE_EMULATOR_HOST);
const TZ = 'America/Costa_Rica';
const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
const BIZ = 'biz-manage';
const SLUG = 'book-manage';

describe.skipIf(!hasEmulator)('client manage link', () => {
  let app;
  let db;
  const date = shiftLocalDate(localDateOf(Date.now(), TZ), 7);
  const local = (hhmm, day = date) => {
    const [h, m] = hhmm.split(':').map(Number);
    return new Date(zonedToUtc(day, h * 60 + m, TZ)).toISOString();
  };

  const book = async (startsAt) => {
    const res = await request(app)
      .post(`/api/v1/public/businesses/${SLUG}/bookings`)
      .set('Idempotency-Key', crypto.randomUUID())
      .send({
        serviceId: 'svc-30', staffId: 'ana', startsAt,
        client: { name: 'Cliente Demo', email: 'cliente@example.com', phoneE164: null },
        privacyNoticeVersion: 'demo-v1',
      });
    expect(res.status).toBe(201);
    return res.body.data.managePath;
  };
  // managePath is /manage/:businessId/:appointmentId?k=...; the API mirrors it.
  const api = (managePath, suffix = '', extra = '') => {
    const [path, query] = managePath.replace('/manage/', '/api/v1/public/appointments/').split('?');
    return `${path}${suffix}?${query}${extra}`;
  };
  const withKey = (managePath, k) => managePath.replace(/k=[^&]+/, `k=${k}`);

  beforeAll(async () => {
    ({ default: app } = await import('../app.js'));
    ({ db } = await import('../config/firebase.js'));
    const base = db.doc(`businesses/${BIZ}`);
    await base.set({
      id: BIZ, ownerUid: 'owner-manage', name: 'Barbería Link', slug: SLUG, timezone: TZ, currency: 'CRC', status: 'published',
      bookingPolicy: { confirmationMode: 'automatic', slotStepMinutes: 15, minNoticeMinutes: 0, maxAdvanceDays: 60, cancellationNoticeMinutes: 120 },
      weeklySchedule: Object.fromEntries(DAYS.map((d) => [d, [{ start: '00:00', end: '23:55' }]])),
      schemaVersion: 2,
    });
    await base.collection('services').doc('svc-30').set({ id: 'svc-30', name: 'Corte', durationMinutes: 30, priceMinor: 600000, currency: 'CRC', active: true });
    await base.collection('staff').doc('ana').set({ id: 'ana', displayName: 'Ana', active: true, serviceIds: ['svc-30'] });
    await db.doc(`publicBusinesses/${SLUG}`).set({
      businessId: BIZ, slug: SLUG, name: 'Barbería Link', timezone: TZ, currency: 'CRC', status: 'published', services: [], staff: [],
    });
  });

  afterAll(async () => {
    await db.recursiveDelete(db.doc(`businesses/${BIZ}`));
    await db.doc(`publicBusinesses/${SLUG}`).delete();
    const jobs = await db.collection('notificationJobs').where('businessId', '==', BIZ).get();
    await Promise.all(jobs.docs.map((d) => d.ref.delete()));
  });

  it('shows the appointment with the key and hides it without one', async () => {
    const link = await book(local('09:00'));
    const res = await request(app).get(api(link));
    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({
      status: 'confirmed', startsAt: local('09:00'), serviceName: 'Corte', staffName: 'Ana',
      businessName: 'Barbería Link', businessSlug: SLUG, version: 1, canChange: true, language: 'es',
    });
    expect(res.body.data).not.toHaveProperty('notes');
    expect(res.body.data).not.toHaveProperty('client');

    const wrong = await request(app).get(api(withKey(link, 'x'.repeat(32))));
    expect(wrong.status).toBe(404);
    expect(wrong.body.error.code).toBe('APPOINTMENT_NOT_FOUND');
    expect((await request(app).get(api(link).split('?')[0])).status).toBe(400);
  });

  it('reschedules to a free time, offering the own time as free', async () => {
    const link = await book(local('10:00'));
    const slots = await request(app).get(api(link, '/availability', `&date=${date}`));
    expect(slots.status).toBe(200);
    expect(slots.body.data.slots.map((s) => s.startsAt)).toContain(local('10:00'));

    const res = await request(app).post(api(link, '/reschedule')).send({ expectedVersion: 1, startsAt: local('15:00') });
    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({ startsAt: local('15:00'), version: 2, status: 'confirmed' });

    const stale = await request(app).post(api(link, '/reschedule')).send({ expectedVersion: 1, startsAt: local('16:00') });
    expect(stale.status).toBe(409);
    expect(stale.body.error.code).toBe('VERSION_CONFLICT');
  });

  it('cancels, frees the time and repeating it is safe', async () => {
    const link = await book(local('12:00'));
    const res = await request(app).post(api(link, '/cancel')).send({ expectedVersion: 1 });
    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({ status: 'cancelled', canChange: false });
    expect((await request(app).post(api(link, '/cancel')).send({ expectedVersion: 1 })).status).toBe(200);

    const apt = (await db.doc(`businesses/${BIZ}/appointments/${res.body.data.id}`).get()).data();
    expect(apt.cancellationReason).toBe('Cancelada por el cliente');
    const cancelJob = await db.doc(`notificationJobs/${res.body.data.id}_v2_cancellation_email`).get();
    expect(cancelJob.exists).toBe(true);
  });

  it('refuses changes inside the cancellation notice', async () => {
    // One hour from now is inside the 120-minute notice.
    const soon = new Date(Math.ceil((Date.now() + 60 * 60000) / (15 * 60000)) * 15 * 60000);
    const link = await book(soon.toISOString());
    const view = await request(app).get(api(link));
    expect(view.body.data.canChange).toBe(false);
    const res = await request(app).post(api(link, '/cancel')).send({ expectedVersion: 1 });
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('TOO_LATE_TO_CHANGE');
  });

  it('puts the link in every email except the cancellation', () => {
    const appointment = {
      id: 'a1', client: { name: 'Cliente', email: 'c@example.com' }, businessTimezone: TZ,
      startsAt: { toDate: () => new Date(local('09:00')) }, serviceSnapshot: { name: 'Corte' }, staffSnapshot: { displayName: 'Ana' },
    };
    const manageUrl = 'https://app.example.com/manage/b/a1?k=abc';
    for (const t of ['confirmation_email', 'reschedule_email', 'reminder_email']) {
      const email = renderEmail(t, { appointment, businessName: 'B', manageUrl });
      expect(email.text).toContain(manageUrl);
      expect(email.html).toContain(`href="${manageUrl}"`);
    }
    expect(renderEmail('cancellation_email', { appointment, businessName: 'B', manageUrl }).text).not.toContain(manageUrl);
  });

  it('writes the emails in the business language, Spanish by default', () => {
    const appointment = {
      id: 'a1', client: { name: 'Cliente', email: 'c@example.com' }, businessTimezone: TZ,
      startsAt: { toDate: () => new Date(local('09:00')) }, serviceSnapshot: { name: 'Corte' }, staffSnapshot: { displayName: 'Ana' },
    };
    const es = renderEmail('confirmation_email', { appointment, businessName: 'B' });
    expect(es.subject).toBe('Tu cita con B está confirmada');
    expect(es.text).toMatch(/a las 9:00\sa\.\sm\./);
    const en = renderEmail('confirmation_email', { appointment, businessName: 'B', language: 'en' });
    expect(en.subject).toBe('Your appointment with B is confirmed');
    expect(en.text).toMatch(/Hello Cliente,/);
    expect(en.text).toMatch(/at 9:00\sAM/);
  });
});
