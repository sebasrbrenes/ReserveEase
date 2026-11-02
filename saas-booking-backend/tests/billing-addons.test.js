// Plans, the SMS add-on and access enforcement. The Paddle API is replaced by
// a fake fetch; nothing reaches Paddle.
import crypto from 'crypto';
import request from 'supertest';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { catalogFromEnv, monthlyTotalUsd, resolveItems } from '../src/billing/catalog.js';
import { accessFor, itemsWithAddon } from '../src/billing/subscription.js';

const SECRET = 'pdl_ntfset_addons_secret';
process.env.PADDLE_ENV = 'sandbox';
process.env.PADDLE_API_KEY = 'pdl_sdbx_apikey_addons';
process.env.PADDLE_PRICE_ID_BASIC = 'pri_basic_15';
process.env.PADDLE_PRICE_ID_SMS = 'pri_sms_10';
process.env.PADDLE_WEBHOOK_SECRET = SECRET;

describe('catalog and access rules', () => {
  const catalog = catalogFromEnv({ PADDLE_PRICE_ID: 'pri_old', PADDLE_PRICE_ID_SMS: 'pri_sms' });

  it('maps price ids to the plan and its add-ons, ignoring unknown prices', () => {
    expect(catalog.plans.basic.priceId).toBe('pri_old');
    expect(resolveItems(['pri_old'], catalog)).toEqual({ plan: 'basic', addons: [] });
    expect(resolveItems(['pri_old', 'pri_sms', 'pri_other'], catalog)).toEqual({ plan: 'basic', addons: ['sms'] });
    // The add-on alone grants nothing: it requires Basic.
    expect(resolveItems(['pri_sms'], catalog)).toEqual({ plan: null, addons: [] });
    expect(monthlyTotalUsd({ plan: 'basic', addons: [] })).toBe(15);
    expect(monthlyTotalUsd({ plan: 'basic', addons: ['sms'] })).toBe(25);
  });

  it('adds or removes the add-on keeping every other item', () => {
    const sub = { items: [{ priceId: 'pri_old', quantity: 1 }] };
    expect(itemsWithAddon(sub, 'pri_sms', { add: true })).toEqual([{ priceId: 'pri_old', quantity: 1 }, { priceId: 'pri_sms', quantity: 1 }]);
    expect(itemsWithAddon({ items: [{ priceId: 'pri_old' }, { priceId: 'pri_sms' }] }, 'pri_sms', { add: false })).toEqual([{ priceId: 'pri_old' }]);
    // Documents saved before add-ons only have priceId.
    expect(itemsWithAddon({ priceId: 'pri_old' }, 'pri_sms', { add: true })).toHaveLength(2);
  });

  it('enforces access only from the configured date', () => {
    const now = Date.parse('2026-12-15T00:00:00Z');
    const from = { startsAtMs: Date.parse('2026-12-01T00:00:00Z') };
    expect(accessFor(undefined, { enforcement: { startsAtMs: null }, nowMs: now })).toMatchObject({ allowed: true, requiredFrom: null });
    expect(accessFor(undefined, { enforcement: { startsAtMs: Date.parse('2027-01-01') }, nowMs: now }))
      .toMatchObject({ allowed: true, enforced: false, requiredFrom: '2027-01-01T00:00:00.000Z' });
    expect(accessFor(undefined, { enforcement: from, nowMs: now })).toMatchObject({ allowed: false, enforced: true });
    expect(accessFor({ status: 'past_due' }, { enforcement: from, nowMs: now })).toMatchObject({ allowed: true });
    expect(accessFor({ status: 'canceled' }, { enforcement: from, nowMs: now })).toMatchObject({ allowed: false });
  });
});

const hasEmulators = Boolean(process.env.FIRESTORE_EMULATOR_HOST && process.env.FIREBASE_AUTH_EMULATOR_HOST);

describe.skipIf(!hasEmulators)('SMS add-on and enforcement API', () => {
  let app;
  let db;
  let token;
  const BIZ = 'biz-addons';
  const LOCKED = 'biz-addons-locked';
  const paddleCalls = [];

  const sign = (body) => {
    const ts = Math.floor(Date.now() / 1000);
    return `ts=${ts};h1=${crypto.createHmac('sha256', SECRET).update(`${ts}:${body}`).digest('hex')}`;
  };
  const deliver = (payload) => {
    const body = JSON.stringify(payload);
    return request(app).post('/api/v1/billing/paddle/webhook')
      .set('Content-Type', 'application/json').set('Paddle-Signature', sign(body)).send(body);
  };
  const event = (occurredAt, prices, extra = {}) => ({
    event_id: `evt_${crypto.randomUUID()}`,
    event_type: 'subscription.updated',
    occurred_at: occurredAt,
    data: {
      id: 'sub_addons', status: 'active', customer_id: 'ctm_addons', custom_data: { businessId: BIZ },
      items: prices.map((id) => ({ status: 'active', quantity: 1, price: { id } })),
      current_billing_period: { starts_at: '2026-11-05T14:00:00Z', ends_at: '2026-12-05T14:00:00Z' },
      next_billed_at: '2026-12-05T14:00:00Z', scheduled_change: null, canceled_at: null,
      ...extra,
    },
  });
  const api = (biz, path, method = 'get') => request(app)[method](`/api/v1/businesses/${biz}${path}`)
    .set('Authorization', `Bearer ${token}`);
  const stored = async () => (await db.doc(`businesses/${BIZ}/billing/subscription`).get()).data();

  beforeAll(async () => {
    ({ default: app } = await import('../app.js'));
    const firebase = await import('../config/firebase.js');
    db = firebase.db;
    const { getAuth } = await import('firebase-admin/auth');
    const auth = getAuth(firebase.default);
    for (const biz of [BIZ, LOCKED]) {
      await db.doc(`businesses/${biz}`).set({ id: biz, ownerUid: 'owner-addons', name: biz });
      await db.doc(`businesses/${biz}/members/owner-addons`).set({ role: 'owner' });
    }
    await db.doc('publicBusinesses/addons-locked').set({
      businessId: LOCKED, slug: 'addons-locked', name: 'Locked', timezone: 'America/New_York', currency: 'USD',
      status: 'published', services: [], staff: [],
    });
    await auth.createUser({ uid: 'owner-addons', email: 'owner-addons@demo.test', password: 'demo1234', emailVerified: true }).catch(() => {});
    const res = await fetch(
      `http://${process.env.FIREBASE_AUTH_EMULATOR_HOST}/identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=demo`,
      { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email: 'owner-addons@demo.test', password: 'demo1234', returnSecureToken: true }) },
    );
    token = (await res.json()).idToken;

    const realFetch = globalThis.fetch;
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (url, init) => {
      if (!String(url).startsWith('https://sandbox-api.paddle.com')) return realFetch(url, init);
      paddleCalls.push({ url: String(url), method: init.method, body: init.body ? JSON.parse(init.body) : undefined });
      return new Response(JSON.stringify({ data: { id: 'sub_addons' } }), { status: 200 });
    });
  });

  afterEach(() => {
    delete process.env.BILLING_ENFORCEMENT_DATE;
  });

  afterAll(async () => {
    vi.restoreAllMocks();
    await db.recursiveDelete(db.doc(`businesses/${BIZ}`));
    await db.recursiveDelete(db.doc(`businesses/${LOCKED}`));
    await db.doc('publicBusinesses/addons-locked').delete();
  });

  it('shows Basic at $15 with email included and SMS off', async () => {
    await deliver(event('2026-11-05T14:00:01Z', ['pri_basic_15']));
    const { body } = await api(BIZ, '/billing');
    expect(body.data).toMatchObject({
      status: 'active', plan: { key: 'basic', amountUsd: 15 }, monthlyTotalUsd: 15, canChangeAddons: true,
      addons: { sms: { active: false, available: true, amountUsd: 10 } },
      sms: { status: 'not_requested', remindersEnabled: true, usage: null },
    });
  });

  it('only adds SMS once the business is approved by the carriers', async () => {
    const before = paddleCalls.length;
    const refused = await api(BIZ, '/billing/addons/sms', 'post');
    expect(refused.status).toBe(409);
    expect(refused.body.error.code).toBe('SMS_NOT_APPROVED');
    expect(paddleCalls).toHaveLength(before);

    const requested = await api(BIZ, '/messaging/sms/request', 'post');
    expect(requested.body.data.sms.status).toBe('pending');
    // Approval is recorded by ReserveEase once the registration is accepted.
    await db.doc(`businesses/${BIZ}/messaging/sms`).update({ status: 'approved' });

    const added = await api(BIZ, '/billing/addons/sms', 'post');
    expect(added.status).toBe(202);
    expect(paddleCalls.at(-1)).toMatchObject({
      method: 'PATCH',
      url: 'https://sandbox-api.paddle.com/subscriptions/sub_addons',
      body: {
        items: [{ price_id: 'pri_basic_15', quantity: 1 }, { price_id: 'pri_sms_10', quantity: 1 }],
        proration_billing_mode: 'prorated_immediately',
      },
    });
    // Nothing changes until Paddle's webhook confirms it.
    expect((await stored()).addons).toEqual([]);
  });

  it('activates SMS from the webhook, shows usage and the $25 total', async () => {
    await deliver(event('2026-11-06T10:00:00Z', ['pri_basic_15', 'pri_sms_10']));
    await db.doc(`businesses/${BIZ}/smsUsage/20261105140000`).set({ used: 12, limit: 100 });
    const { body } = await api(BIZ, '/billing');
    expect(body.data).toMatchObject({
      monthlyTotalUsd: 25,
      addons: { sms: { active: true } },
      nextBilledAt: '2026-12-05T14:00:00.000Z',
      sms: { status: 'approved', usage: { used: 12, limit: 100, remaining: 88, cycleStart: '2026-11-05T14:00:00.000Z' } },
    });
    expect((await api(BIZ, '/billing/addons/sms', 'post')).body.error.code).toBe('ADDON_ALREADY_ACTIVE');
  });

  it('ignores a repeated webhook event', async () => {
    const payload = event('2026-11-07T00:00:00Z', ['pri_basic_15', 'pri_sms_10']);
    expect((await deliver(payload)).status).toBe(200);
    await db.doc(`businesses/${BIZ}/billing/subscription`).update({ status: 'paused' });
    expect((await deliver(payload)).status).toBe(200);
    expect((await stored()).status).toBe('paused');
    await db.doc(`businesses/${BIZ}/billing/subscription`).update({ status: 'active' });
  });

  it('turns reminders off and removes SMS without cancelling Basic', async () => {
    const off = await api(BIZ, '/messaging/sms', 'patch').send({ remindersEnabled: false });
    expect(off.body.data.sms.remindersEnabled).toBe(false);

    expect((await api(BIZ, '/billing/addons/sms', 'delete')).status).toBe(202);
    expect(paddleCalls.at(-1).body.items).toEqual([{ price_id: 'pri_basic_15', quantity: 1 }]);
    await deliver(event('2026-11-08T00:00:00Z', ['pri_basic_15']));
    const { body } = await api(BIZ, '/billing');
    expect(body.data).toMatchObject({ status: 'active', monthlyTotalUsd: 15, addons: { sms: { active: false } } });
  });

  it('cannot change add-ons on a subscription that is past due or ending', async () => {
    await deliver(event('2026-11-09T00:00:00Z', ['pri_basic_15'], { status: 'past_due' }));
    expect((await api(BIZ, '/billing/addons/sms', 'post')).body.error.code).toBe('SUBSCRIPTION_NOT_CHANGEABLE');
    await deliver(event('2026-11-10T00:00:00Z', ['pri_basic_15'], { scheduled_change: { action: 'cancel', effective_at: '2026-12-05T14:00:00Z' } }));
    expect((await api(BIZ, '/billing/addons/sms', 'post')).body.error.code).toBe('SUBSCRIPTION_NOT_CHANGEABLE');
  });

  it('before the enforcement date nothing is blocked and the owner sees the date', async () => {
    process.env.BILLING_ENFORCEMENT_DATE = '2099-01-01';
    expect((await api(LOCKED, '/appointments?from=2026-11-01&to=2026-11-02')).status).toBe(200);
    expect((await api(LOCKED, '/billing')).body.data.access).toMatchObject({ allowed: true, requiredFrom: '2099-01-01T00:00:00.000Z' });
  });

  it('after the enforcement date a business without subscription is paused, but can subscribe and export', async () => {
    process.env.BILLING_ENFORCEMENT_DATE = '2020-01-01';
    const locked = await api(LOCKED, '/appointments?from=2026-11-01&to=2026-11-02');
    expect(locked.status).toBe(402);
    expect(locked.body.error.code).toBe('SUBSCRIPTION_REQUIRED');
    expect((await api(LOCKED, '/billing')).status).toBe(200);
    expect((await api(LOCKED, '/appointments/export')).status).toBe(200);

    const pub = await request(app).get('/api/v1/public/businesses/addons-locked/availability?serviceId=s&staffId=t&date=2026-11-20');
    expect(pub.status).toBe(403);
    expect(pub.body.error.code).toBe('BOOKINGS_PAUSED');

    // The subscribed business keeps working.
    expect((await api(BIZ, '/appointments?from=2026-11-01&to=2026-11-02')).status).toBe(200);
  });
});
