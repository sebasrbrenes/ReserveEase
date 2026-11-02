// SMS reminders through Telnyx: consent, quiet hours, quota, opt-out and
// webhooks. The provider is the mock or a fake fetch; nothing is sent.
import crypto from 'crypto';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createTelnyxAdapter, verifyTelnyxSignature } from '../src/messaging/telnyx.js';
import { renderSms, smsSendTime } from '../src/messaging/smsTemplates.js';
import { keywordOf } from '../src/messaging/inbound.js';
import { localParts, MINUTE, localDateOf, shiftLocalDate, zonedToUtc } from '../src/domain/time.js';

const { publicKey, privateKey } = crypto.generateKeyPairSync('ed25519');
const PUBLIC_KEY_B64 = publicKey.export({ format: 'der', type: 'spki' }).subarray(12).toString('base64');
process.env.TELNYX_PUBLIC_KEY = PUBLIC_KEY_B64;

const signTelnyx = (body, ts = Math.floor(Date.now() / 1000)) => ({
  ts: String(ts),
  sig: crypto.sign(null, Buffer.from(`${ts}|${body}`), privateKey).toString('base64'),
});

describe('Telnyx pieces', () => {
  it('verifies Ed25519 webhook signatures over timestamp|body', () => {
    const body = '{"data":{"id":"e1"}}';
    const { ts, sig } = signTelnyx(body);
    const ok = (o) => verifyTelnyxSignature({ signature: sig, timestamp: ts, rawBody: Buffer.from(body), publicKey: PUBLIC_KEY_B64, ...o });
    expect(ok()).toBe(true);
    expect(ok({ rawBody: Buffer.from(`${body} `) })).toBe(false);
    expect(ok({ timestamp: String(Number(ts) + 1) })).toBe(false);
    const old = signTelnyx(body, Math.floor(Date.now() / 1000) - 600);
    expect(ok({ signature: old.sig, timestamp: old.ts })).toBe(false);
    expect(ok({ publicKey: 'not-a-key' })).toBe(false);
  });

  it('writes a short plain-ASCII reminder that names the business and says how to stop', () => {
    const appointment = {
      client: { phoneE164: '+15125550123' }, businessTimezone: 'America/Chicago',
      startsAt: { toDate: () => new Date('2026-11-20T21:30:00Z') }, serviceSnapshot: { name: 'Corte clásico' },
    };
    const en = renderSms({ appointment, businessName: 'Barbería José', language: 'en' });
    expect(en.to).toBe('+15125550123');
    expect(en.text).toBe('Barberia Jose: reminder of your Corte clasico appointment Fri, Nov 20, 3:30 PM. Reply STOP to opt out.');
    expect(en.text.length).toBeLessThanOrEqual(160);
    const es = renderSms({ appointment, businessName: 'Barbería José', language: 'es' });
    expect(es.text).toMatch(/STOP/);
    expect(/^[\x20-\x7E]*$/.test(es.text)).toBe(true);
  });

  it('keeps texts between 8 am and 9 pm in the business time zone', () => {
    const tz = 'America/New_York';
    const at = (h, m = 0) => zonedToUtc('2026-11-20', h * 60 + m, tz);
    expect(smsSendTime(at(10), tz, localParts)).toBe(at(10));
    expect(smsSendTime(at(6, 30), tz, localParts)).toBe(at(8));
    expect(smsSendTime(at(22), tz, localParts)).toBe(at(20, 59));
  });

  it('reads reply keywords', () => {
    expect(keywordOf(' stop ')).toBe('STOP');
    expect(keywordOf('Stop.')).toBe('STOP');
    expect(keywordOf('unstop')).toBe('UNSTOP');
  });

  it('calls the Telnyx API and classifies its errors', async () => {
    const calls = [];
    const answer = (status, body) => async (url, init) => {
      calls.push({ url, init, body: JSON.parse(init.body) });
      return new Response(JSON.stringify(body), { status });
    };
    const ok = createTelnyxAdapter({ apiKey: 'KEY', messagingProfileId: 'mp1', fetchImpl: answer(200, { data: { id: 'msg_1', cost: { amount: '0.0040', currency: 'USD' } } }) });
    expect(await ok.send({ from: '+15125550000', to: '+15125550123', text: 'hi' }, { idempotencyKey: 'job1' }))
      .toEqual({ status: 'accepted', providerMessageId: 'msg_1', cost: { amount: '0.0040', currency: 'USD' } });
    expect(calls[0].url).toBe('https://api.telnyx.com/v2/messages');
    expect(calls[0].init.headers.Authorization).toBe('Bearer KEY');
    expect(calls[0].body).toMatchObject({ from: '+15125550000', to: '+15125550123', text: 'hi', messaging_profile_id: 'mp1', type: 'SMS' });

    const bad = createTelnyxAdapter({ apiKey: 'K', fetchImpl: answer(422, { errors: [{ code: '40310' }] }) });
    await expect(bad.send({ to: 'x', text: 'y' }, { idempotencyKey: 'j' })).rejects.toMatchObject({ code: 'TELNYX_422_40310', permanent: true });
    const busy = createTelnyxAdapter({ apiKey: 'K', fetchImpl: answer(429, {}) });
    await expect(busy.send({ to: 'x', text: 'y' }, { idempotencyKey: 'j' })).rejects.toMatchObject({ code: 'TELNYX_429', permanent: false });
  });
});

const hasEmulator = Boolean(process.env.FIRESTORE_EMULATOR_HOST);
const TZ = 'America/Chicago';
const BIZ = 'biz-sms';
const NUMBER = '+15125550000';
const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
const HOUR = 60 * MINUTE;

describe.skipIf(!hasEmulator)('SMS reminders', () => {
  let db;
  let app;
  let createBooking;
  let processDueJobs;
  let cancelAppointment;
  let updateAppointmentDetails;
  let createMockAdapter;
  let createMockSmsAdapter;
  let SMS_CONSENT_VERSION;
  let counter = 0;
  const date = shiftLocalDate(localDateOf(Date.now(), TZ), 6);
  const at = (hhmm) => {
    const [h, m] = hhmm.split(':').map(Number);
    return new Date(zonedToUtc(date, h * 60 + m, TZ)).toISOString();
  };
  const job = async (id) => (await db.doc(`notificationJobs/${id}`).get()).data();
  const usage = async () => (await db.doc(`businesses/${BIZ}/smsUsage/20261101000000`).get()).data();
  const run = (sms, clock) => processDueJobs(db, { adapter: createMockAdapter(), smsAdapter: sms, clock, businessId: BIZ });
  const book = async (startsAt, { consent = true, phone = '+15125550123', version } = {}) => {
    counter += 1;
    const { result } = await createBooking(db, {
      businessId: BIZ,
      idempotencyKey: `sms-${counter}-${Date.now()}`,
      requestContext: { ip: '203.0.113.9', userAgent: 'Vitest' },
      command: {
        serviceId: 'svc', staffId: 'ana', startsAt,
        client: { name: 'Sam', email: 'sam@example.com', phoneE164: phone },
        notes: '', privacyNoticeVersion: 'test', smsConsent: consent, smsConsentVersion: version ?? SMS_CONSENT_VERSION,
      },
    });
    return result.bookingReference;
  };
  const dueAt = async (id) => (await job(`${id}_v1_reminder_sms`)).runAt.toMillis() + MINUTE;
  const setAddon = (addons) => db.doc(`businesses/${BIZ}/billing/subscription`).set({
    status: 'active', plan: 'basic', addons, items: [], currentPeriodStart: '2026-11-01T00:00:00.000Z', currentPeriodEnd: '2026-12-01T00:00:00.000Z',
  });
  const webhook = (body) => {
    const raw = JSON.stringify(body);
    const { ts, sig } = signTelnyx(raw);
    return request(app).post('/api/v1/messaging/telnyx/webhook').set('Content-Type', 'application/json')
      .set('telnyx-signature-ed25519', sig).set('telnyx-timestamp', ts).send(raw);
  };

  beforeAll(async () => {
    ({ db } = await import('../config/firebase.js'));
    ({ default: app } = await import('../app.js'));
    ({ createBooking } = await import('../src/domain/booking.js'));
    ({ processDueJobs } = await import('../src/notifications/worker.js'));
    ({ cancelAppointment, updateAppointmentDetails } = await import('../src/domain/appointments.js'));
    ({ createMockAdapter } = await import('../src/notifications/adapters.js'));
    ({ createMockSmsAdapter } = await import('../src/messaging/telnyx.js'));
    ({ SMS_CONSENT_VERSION } = await import('../src/messaging/smsConsent.js'));
    const base = db.doc(`businesses/${BIZ}`);
    await base.set({
      id: BIZ, ownerUid: 'owner-sms', name: 'Fade Lab', slug: 'fade-lab-sms', timezone: TZ, currency: 'USD', status: 'published', language: 'en',
      bookingPolicy: { confirmationMode: 'automatic', slotStepMinutes: 15, minNoticeMinutes: 0, maxAdvanceDays: 60, cancellationNoticeMinutes: 0 },
      weeklySchedule: Object.fromEntries(DAYS.map((d) => [d, [{ start: '06:00', end: '22:00' }]])),
      schemaVersion: 2,
    });
    await base.collection('services').doc('svc').set({ id: 'svc', name: 'Fade', durationMinutes: 30, priceMinor: 3000, currency: 'USD', active: true });
    await base.collection('staff').doc('ana').set({ id: 'ana', displayName: 'Ana', active: true, serviceIds: ['svc'] });
    await setAddon([]);
    await db.doc(`businesses/${BIZ}/messaging/sms`).set({ status: 'approved', fromNumber: NUMBER, remindersEnabled: true });
    await db.doc(`smsNumbers/${NUMBER}`).set({ businessId: BIZ });
  });

  afterAll(async () => {
    await db.recursiveDelete(db.doc(`businesses/${BIZ}`));
    await db.doc(`smsNumbers/${NUMBER}`).delete();
    const jobs = await db.collection('notificationJobs').where('businessId', '==', BIZ).get();
    await Promise.all(jobs.docs.map((d) => d.ref.delete()));
    const logs = await db.collection('smsMessages').where('businessId', '==', BIZ).get();
    await Promise.all(logs.docs.map((d) => d.ref.delete()));
  });

  it('stores consent evidence and queues the reminder inside quiet-hour limits', async () => {
    await expect(book(at('10:00'), { version: 'old-text' })).rejects.toMatchObject({ code: 'CONSENT_TEXT_OUTDATED' });
    const id = await book(at('07:00'));
    const apt = (await db.doc(`businesses/${BIZ}/appointments/${id}`).get()).data();
    expect(apt.smsConsent).toBe(true);
    expect(apt.smsConsentEvidence).toMatchObject({
      version: SMS_CONSENT_VERSION, phoneE164: '+15125550123', language: 'en', source: 'public_booking_form', userAgent: 'Vitest',
    });
    expect(apt.smsConsentEvidence.text).toContain('Fade Lab');
    expect(apt.smsConsentEvidence.ipHash).toMatch(/^[0-9a-f]{64}$/);
    // 24 hours before a 7:00 appointment is 7:00, before 8 am: it moves to 8:00.
    const runAt = (await job(`${id}_v1_reminder_sms`)).runAt.toMillis();
    expect(localParts(runAt, TZ)).toMatchObject({ hour: 8, minute: 0 });

    const noConsent = await book(at('09:00'), { consent: false });
    expect(await job(`${noConsent}_v1_reminder_sms`)).toBeUndefined();
    const noPhone = await book(at('09:30'), { phone: null });
    expect(await job(`${noPhone}_v1_reminder_sms`)).toBeUndefined();
  });

  it('does not send without the add-on, and sends (simulated) with it, counting quota once', async () => {
    const id = await book(at('11:00'));
    const due = await dueAt(id);
    const sms = createMockSmsAdapter();
    await run(sms, () => due);
    expect(await job(`${id}_v1_reminder_sms`)).toMatchObject({ status: 'disabled', lastErrorCode: 'ADDON_INACTIVE' });
    expect(sms.sent).toHaveLength(0);

    await setAddon(['sms']);
    const id2 = await book(at('11:30'));
    const due2 = await dueAt(id2);
    await Promise.all([run(sms, () => due2), run(sms, () => due2)]);
    expect(await job(`${id2}_v1_reminder_sms`)).toMatchObject({ status: 'simulated', quotaCycle: '20261101000000' });
    expect(sms.sent.filter((m) => m.idempotencyKey === `${id2}_v1_reminder_sms`)).toHaveLength(1);
    expect(sms.sent[0]).toMatchObject({ from: NUMBER, to: '+15125550123' });
    expect(sms.sent[0].text).toMatch(/^Fade Lab: reminder of your Fade appointment .* Reply STOP to opt out\.$/);
    expect((await usage()).used).toBe(1);
    const apt = (await db.doc(`businesses/${BIZ}/appointments/${id2}`).get()).data();
    expect(apt.smsNotification).toMatchObject({ template: 'reminder_sms', status: 'simulated' });
    // The email summary is untouched by the SMS.
    expect(apt.notification.template).not.toBe('reminder_sms');
    expect((await db.doc(`smsMessages/${id2}_v1_reminder_sms`).get()).data()).toMatchObject({
      businessId: BIZ, status: 'simulated', toLast4: '0123', cycle: '20261101000000',
    });
  });

  it('stops at 100 per cycle, even with workers racing for the last one', async () => {
    await db.doc(`businesses/${BIZ}/smsUsage/20261101000000`).set({ used: 99, limit: 100 });
    const ids = [await book(at('12:00')), await book(at('12:30')), await book(at('13:00'))];
    const due = Math.max(...await Promise.all(ids.map(dueAt)));
    const sms = createMockSmsAdapter();
    await Promise.all([run(sms, () => due), run(sms, () => due), run(sms, () => due)]);
    const statuses = await Promise.all(ids.map(async (id) => (await job(`${id}_v1_reminder_sms`)).status));
    expect(statuses.filter((st) => st === 'simulated')).toHaveLength(1);
    expect(statuses.filter((st) => st === 'disabled')).toHaveLength(2);
    expect((await usage()).used).toBe(100);
    await db.doc(`businesses/${BIZ}/smsUsage/20261101000000`).set({ used: 1, limit: 100 });
  });

  it('gives the unit back when the provider refuses the message', async () => {
    const { SendError } = await import('../src/notifications/adapters.js');
    const id = await book(at('13:30'));
    const due = await dueAt(id);
    await run(createMockSmsAdapter({ fail: async () => { throw new SendError('TELNYX_422', { permanent: true }); } }), () => due);
    expect(await job(`${id}_v1_reminder_sms`)).toMatchObject({ status: 'failed', lastErrorCode: 'TELNYX_422' });
    expect((await usage()).used).toBe(1);
  });

  it('respects the reminders switch, cancellations and a changed phone number', async () => {
    await db.doc(`businesses/${BIZ}/messaging/sms`).update({ remindersEnabled: false });
    const off = await book(at('14:00'));
    const due = await dueAt(off);
    await run(createMockSmsAdapter(), () => due);
    expect((await job(`${off}_v1_reminder_sms`)).lastErrorCode).toBe('REMINDERS_OFF');
    await db.doc(`businesses/${BIZ}/messaging/sms`).update({ remindersEnabled: true });

    const cancelled = await book(at('14:30'));
    await cancelAppointment(db, { businessId: BIZ, appointmentId: cancelled, expectedVersion: 1, actorUid: 'owner' });
    expect((await job(`${cancelled}_v1_reminder_sms`)).status).toBe('cancelled');

    const changed = await book(at('15:00'));
    await updateAppointmentDetails(db, {
      businessId: BIZ, appointmentId: changed, expectedVersion: 1, changes: { client: { phoneE164: '+15125559999' } }, actorUid: 'owner',
    });
    const due2 = await dueAt(changed);
    const sms = createMockSmsAdapter();
    await run(sms, () => due2);
    expect((await job(`${changed}_v1_reminder_sms`)).lastErrorCode).toBe('NO_CONSENT');
    expect(sms.sent).toHaveLength(0);
  });

  it('records STOP replies and never texts that number again; START undoes it', async () => {
    const stop = (text, id) => webhook({
      data: { id, event_type: 'message.received', payload: { text, from: { phone_number: '+15125550123' }, to: [{ phone_number: NUMBER }] } },
    });
    expect((await stop('Stop', 'evt-stop-1')).status).toBe(200);
    const id = await book(at('15:30'));
    const due = await dueAt(id);
    const sms = createMockSmsAdapter();
    await run(sms, () => due);
    expect((await job(`${id}_v1_reminder_sms`)).status).toBe('opted_out');
    expect(sms.sent).toHaveLength(0);

    await stop('START', 'evt-start-1');
    const id2 = await book(at('16:00'));
    const due2 = await dueAt(id2);
    await run(sms, () => due2);
    expect((await job(`${id2}_v1_reminder_sms`)).status).toBe('simulated');
  });

  it('applies signed delivery reports once and refuses unsigned ones', async () => {
    const [log] = (await db.collection('smsMessages').where('businessId', '==', BIZ).where('status', '==', 'simulated').limit(1).get()).docs;
    const providerMessageId = log.data().providerMessageId;
    const body = {
      data: {
        id: 'evt-final-1', event_type: 'message.finalized',
        payload: { id: providerMessageId, to: [{ status: 'delivered' }], cost: { amount: '0.0040', currency: 'USD' }, parts: 1 },
      },
    };
    expect((await webhook(body)).status).toBe(200);
    expect((await log.ref.get()).data()).toMatchObject({ status: 'delivered', cost: { amount: '0.0040' }, parts: 1 });
    await log.ref.update({ status: 'simulated' });
    expect((await webhook(body)).status).toBe(200);
    expect((await log.ref.get()).data().status).toBe('simulated'); // the repeat was ignored

    const raw = JSON.stringify(body);
    const forged = await request(app).post('/api/v1/messaging/telnyx/webhook').set('Content-Type', 'application/json')
      .set('telnyx-signature-ed25519', Buffer.alloc(64).toString('base64')).set('telnyx-timestamp', String(Math.floor(Date.now() / 1000)))
      .send(raw);
    expect(forged.status).toBe(401);
  });

  it('shows the consent text on the public page only when the business can send SMS', async () => {
    await db.doc('publicBusinesses/fade-lab-sms').set({
      businessId: BIZ, slug: 'fade-lab-sms', name: 'Fade Lab', timezone: TZ, currency: 'USD', language: 'en',
      status: 'published', services: [], staff: [],
    });
    try {
      const on = await request(app).get('/api/v1/public/businesses/fade-lab-sms');
      expect(on.body.data.smsConsent).toMatchObject({ version: SMS_CONSENT_VERSION });
      expect(on.body.data.smsConsent.text).toContain('Reply STOP to opt out');
      await setAddon([]);
      const off = await request(app).get('/api/v1/public/businesses/fade-lab-sms');
      expect(off.body.data.smsConsent).toBeNull();
    } finally {
      await db.doc('publicBusinesses/fade-lab-sms').delete();
      await setAddon(['sms']);
    }
  });
});
