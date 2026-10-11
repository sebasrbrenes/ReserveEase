// Notification outbox and worker (master document T26–T28), against the
// Firestore emulator with the mock adapter.
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createBooking } from '../src/domain/booking.js';
import { cancelAppointment, rescheduleAppointment, updateAppointmentDetails } from '../src/domain/appointments.js';
import { localDateOf, MINUTE, shiftLocalDate, zonedToUtc } from '../src/domain/time.js';
import { createMockAdapter, SendError } from '../src/notifications/adapters.js';
import { renderEmail } from '../src/notifications/templates.js';
import { LEASE_MS, MAX_ATTEMPTS, processDueJobs, retryFailedJobs } from '../src/notifications/worker.js';

const hasEmulator = Boolean(process.env.FIRESTORE_EMULATOR_HOST);
const TZ = 'America/Costa_Rica';
const BIZ = 'biz-notify';
const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
const HOUR = 60 * MINUTE;

describe.skipIf(!hasEmulator)('notification worker', () => {
  let db;
  let counter = 0;
  const date = shiftLocalDate(localDateOf(Date.now(), TZ), 5);
  const at = (hhmm, d = date) => {
    const [h, m] = hhmm.split(':').map(Number);
    return new Date(zonedToUtc(d, h * 60 + m, TZ)).toISOString();
  };
  const run = (adapter, clock = Date.now) => processDueJobs(db, { adapter, clock, businessId: BIZ });
  const job = async (id) => (await db.doc(`notificationJobs/${id}`).get()).data();
  const apt = async (id) => (await db.doc(`businesses/${BIZ}/appointments/${id}`).get()).data();
  const book = async (startsAt, name = 'Ana <script>alert(1)</script>') => {
    counter += 1;
    const { result } = await createBooking(db, {
      businessId: BIZ,
      idempotencyKey: `notify-${counter}-${Date.now()}`,
      command: {
        serviceId: 'svc', staffId: 'ana', startsAt,
        client: { name, email: 'cliente@example.com', phoneE164: null },
        notes: '', privacyNoticeVersion: 'test', smsConsent: false,
      },
    });
    return result.bookingReference;
  };

  beforeAll(async () => {
    ({ db } = await import('../config/firebase.js'));
    const base = db.doc(`businesses/${BIZ}`);
    await base.set({
      id: BIZ, ownerUid: 'owner-notify', name: 'Barbería & Co', slug: 'notify', timezone: TZ, currency: 'CRC', status: 'published',
      bookingPolicy: { confirmationMode: 'automatic', slotStepMinutes: 15, minNoticeMinutes: 0, maxAdvanceDays: 60, cancellationNoticeMinutes: 0 },
      weeklySchedule: Object.fromEntries(DAYS.map((d) => [d, [{ start: '00:00', end: '23:55' }]])),
      schemaVersion: 2,
    });
    await base.collection('services').doc('svc').set({ id: 'svc', name: 'Corte', durationMinutes: 30, priceMinor: 600000, currency: 'CRC', active: true });
    await base.collection('staff').doc('ana').set({ id: 'ana', displayName: 'Ana', active: true, serviceIds: ['svc'] });
  });

  afterAll(async () => {
    await db.recursiveDelete(db.doc(`businesses/${BIZ}`));
    const jobs = await db.collection('notificationJobs').where('businessId', '==', BIZ).get();
    await Promise.all(jobs.docs.map((d) => d.ref.delete()));
  });

  it('sends the confirmation once, marks it simulated and summarises it on the appointment', async () => {
    const id = await book(at('09:00'));
    const adapter = createMockAdapter();
    await run(adapter);
    await run(adapter);
    const sent = adapter.sent.filter((m) => m.idempotencyKey === `${id}_v1_confirmation_email`);
    expect(sent).toHaveLength(1);
    expect(await job(`${id}_v1_confirmation_email`)).toMatchObject({ status: 'simulated', attempts: 1, providerMessageId: `mock_${id}_v1_confirmation_email` });
    expect((await apt(id)).notification).toMatchObject({ template: 'confirmation_email', status: 'simulated' });
    expect(sent[0].to).toBe('cliente@example.com');
    expect(sent[0].html).toContain('Ana &lt;script&gt;');
    expect(sent[0].html).not.toContain('<script>');
    expect(sent[0].text).toMatch(/at 9:00 AM \(America\/Costa Rica\)/);
    // The reminder waits until 24 hours before the start.
    expect((await job(`${id}_v1_reminder_email`)).status).toBe('queued');
  });

  it('sends the reminder 24 hours before, and skips it for bookings made inside that window', async () => {
    const id = await book(at('10:00'));
    const adapter = createMockAdapter();
    const dayBefore = () => Date.parse(at('10:00')) - 24 * HOUR + MINUTE;
    await run(adapter, dayBefore);
    expect((await job(`${id}_v1_reminder_email`)).status).toBe('simulated');
    // About 3 hours ahead, on the 15-minute grid. Date and time come from the
    // same instant, and a start too late for a 30-minute service before 23:55
    // moves to the next local midnight (still well inside 24 hours).
    const soonMs = Math.ceil((Date.now() + 3 * HOUR) / (15 * MINUTE)) * 15 * MINUTE;
    let soonDate = localDateOf(soonMs, TZ);
    let soonTime = new Intl.DateTimeFormat('en-GB', { timeZone: TZ, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' })
      .format(new Date(soonMs));
    if (soonTime > '23:15') {
      soonDate = shiftLocalDate(soonDate, 1);
      soonTime = '00:00';
    }
    const soon = await book(at(soonTime, soonDate));
    expect(await job(`${soon}_v1_reminder_email`)).toBeUndefined();
  });

  it('T26: a provider outage keeps the booking, retries with backoff and ends failed but retryable', async () => {
    const id = await book(at('11:00'));
    const down = createMockAdapter({ fail: async () => { throw new SendError('PROVIDER_DOWN'); } });
    let now = Date.now();
    await run(down, () => now);
    const first = await job(`${id}_v1_confirmation_email`);
    expect(first).toMatchObject({ status: 'queued', attempts: 1, lastErrorCode: 'PROVIDER_DOWN' });
    expect(first.runAt.toMillis()).toBe(now + MINUTE);
    expect((await apt(id)).status).toBe('confirmed');
    expect((await apt(id)).notification).toMatchObject({ status: 'queued', lastErrorCode: 'PROVIDER_DOWN' });
    for (let i = 1; i < MAX_ATTEMPTS; i += 1) {
      now += 200 * HOUR;
      await run(down, () => now);
    }
    expect(await job(`${id}_v1_confirmation_email`)).toMatchObject({ status: 'failed', attempts: MAX_ATTEMPTS });
    expect((await apt(id)).notification.status).toBe('failed');

    expect(await retryFailedJobs(db, { businessId: BIZ, appointmentId: id })).toBe(1);
    const up = createMockAdapter();
    await run(up);
    expect((await job(`${id}_v1_confirmation_email`)).status).toBe('simulated');
  });

  it('marks permanent provider errors failed without retrying', async () => {
    const id = await book(at('11:30'));
    await run(createMockAdapter({ fail: async () => { throw new SendError('INVALID_RECIPIENT', { permanent: true }); } }));
    expect(await job(`${id}_v1_confirmation_email`)).toMatchObject({ status: 'failed', attempts: 1, lastErrorCode: 'INVALID_RECIPIENT' });
  });

  it('T27: a job left processing by a stopped worker is taken over after its lease, with the same idempotency key', async () => {
    const id = await book(at('12:00'));
    const ref = db.doc(`notificationJobs/${id}_v1_confirmation_email`);
    const adapter = createMockAdapter();
    // The first worker sent the message and stopped before saving the result.
    await adapter.send({ to: 'x' }, { idempotencyKey: ref.id });
    const { Timestamp } = await import('firebase-admin/firestore');
    await ref.update({ status: 'processing', attempts: 1, workerId: 'dead-worker', leaseUntil: Timestamp.fromMillis(Date.now() + LEASE_MS) });

    await run(adapter);
    expect((await job(ref.id)).status).toBe('processing'); // lease still valid: untouched

    await run(adapter, () => Date.now() + LEASE_MS + MINUTE);
    expect(await job(ref.id)).toMatchObject({ status: 'simulated', attempts: 2 });
    // The provider saw the same key twice and sent once.
    expect(adapter.sent.filter((m) => m.idempotencyKey === ref.id)).toHaveLength(1);
  });

  it('T28: moving or cancelling before the reminder means the old messages never send', async () => {
    const moved = await book(at('13:00'));
    await rescheduleAppointment(db, { businessId: BIZ, appointmentId: moved, expectedVersion: 1, startsAt: at('14:00'), actorUid: 'owner' });
    expect((await job(`${moved}_v1_reminder_email`)).status).toBe('cancelled');
    expect((await job(`${moved}_v2_reminder_email`)).status).toBe('queued');

    const cancelled = await book(at('15:00'));
    // An edit of the notes keeps the reminder current.
    await updateAppointmentDetails(db, { businessId: BIZ, appointmentId: cancelled, expectedVersion: 1, changes: { notes: 'x' }, actorUid: 'owner' });
    await cancelAppointment(db, { businessId: BIZ, appointmentId: cancelled, expectedVersion: 2, actorUid: 'owner' });
    expect((await job(`${cancelled}_v1_reminder_email`)).status).toBe('cancelled');

    // Even an old job that escaped cancellation is skipped by the worker.
    await db.doc(`notificationJobs/${moved}_v1_reminder_email`).update({ status: 'queued' });
    const adapter = createMockAdapter();
    await run(adapter, () => Date.parse(at('14:00')) - 24 * HOUR + MINUTE);
    expect((await job(`${moved}_v1_reminder_email`)).status).toBe('skipped');
    expect((await job(`${moved}_v2_reminder_email`)).status).toBe('simulated');
    expect((await job(`${cancelled}_v3_cancellation_email`)).status).toBe('simulated');
    const reminders = adapter.sent.filter((m) => m.idempotencyKey.startsWith(moved) && m.idempotencyKey.includes('reminder'));
    expect(reminders.map((m) => m.idempotencyKey)).toEqual([`${moved}_v2_reminder_email`]);
    expect(reminders[0].text).toMatch(/2:00 PM/);
  });

  it('two workers running at once send each message once', async () => {
    const ids = await Promise.all(['16:00', '16:30', '17:00'].map((t) => book(at(t))));
    const adapter = createMockAdapter();
    const send = adapter.send;
    const keys = [];
    adapter.send = (message, options) => { keys.push(options.idempotencyKey); return send(message, options); };
    await Promise.all([run(adapter), run(adapter), run(adapter)]);
    for (const id of ids) {
      expect((await job(`${id}_v1_confirmation_email`)).status).toBe('simulated');
    }
    const ours = keys.filter((k) => ids.some((id) => k === `${id}_v1_confirmation_email`));
    expect(ours.sort()).toEqual(ids.map((id) => `${id}_v1_confirmation_email`).sort());
  });

  it('T29: with client emails turned off nothing is sent and the appointment says so', async () => {
    await db.doc(`businesses/${BIZ}`).update({ clientEmails: false });
    try {
      const id = await book(at('18:00'));
      const adapter = createMockAdapter();
      await run(adapter);
      expect(adapter.sent.some((m) => m.idempotencyKey.startsWith(id))).toBe(false);
      expect((await job(`${id}_v1_confirmation_email`)).status).toBe('disabled');
      expect((await apt(id)).notification.status).toBe('disabled');
    } finally {
      await db.doc(`businesses/${BIZ}`).update({ clientEmails: true });
    }
  });

  it('renders every template with absolute dates', () => {
    const appointment = {
      id: 'apt', client: { name: 'Luis', email: 'l@example.com' }, businessTimezone: TZ,
      startsAt: { toDate: () => new Date(at('09:30')) }, serviceSnapshot: { name: 'Corte' }, staffSnapshot: { displayName: 'Ana' },
    };
    for (const t of ['confirmation_email', 'reschedule_email', 'reminder_email', 'cancellation_email']) {
      const msg = renderEmail(t, { appointment, businessName: 'Barbería & Co' });
      expect(msg.subject).toContain('Barbería & Co');
      expect(msg.html).toContain('Barbería &amp; Co');
      expect(msg.text).not.toMatch(/tomorrow/i);
    }
  });
});
