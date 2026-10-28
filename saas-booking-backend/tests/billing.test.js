// Subscription billing through Paddle: signature checks, webhook-driven state
// and the owner's checkout and portal routes, against the emulators. The
// Paddle API itself is replaced by a fake fetch; nothing reaches Paddle.
import crypto from 'crypto';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { verifyPaddleSignature } from '../src/billing/paddle.js';

const SECRET = 'pdl_ntfset_test_secret';
process.env.PADDLE_ENV = 'sandbox';
process.env.PADDLE_API_KEY = 'pdl_sdbx_apikey_test';
process.env.PADDLE_PRICE_ID = 'pri_test_15usd';
process.env.PADDLE_WEBHOOK_SECRET = SECRET;

const sign = (body, secret = SECRET, ts = Math.floor(Date.now() / 1000)) => {
  const h1 = crypto.createHmac('sha256', secret).update(`${ts}:${body}`).digest('hex');
  return `ts=${ts};h1=${h1}`;
};

describe('verifyPaddleSignature', () => {
  const body = '{"event_type":"subscription.created"}';
  const rawBody = Buffer.from(body);

  it('accepts a fresh signature over the raw body', () => {
    expect(verifyPaddleSignature({ header: sign(body), rawBody, secret: SECRET })).toBe(true);
  });

  it('accepts any h1 while a secret is rotated', () => {
    const ts = Math.floor(Date.now() / 1000);
    const header = `${sign(body, 'old', ts)};h1=${sign(body, SECRET, ts).split('h1=')[1]}`;
    expect(verifyPaddleSignature({ header, rawBody, secret: SECRET })).toBe(true);
  });

  it('rejects another secret, a changed body, an old timestamp and junk', () => {
    expect(verifyPaddleSignature({ header: sign(body, 'other'), rawBody, secret: SECRET })).toBe(false);
    expect(verifyPaddleSignature({ header: sign(body), rawBody: Buffer.from(`${body} `), secret: SECRET })).toBe(false);
    const old = Math.floor(Date.now() / 1000) - 600;
    expect(verifyPaddleSignature({ header: sign(body, SECRET, old), rawBody, secret: SECRET })).toBe(false);
    expect(verifyPaddleSignature({ header: 'ts=1;h1=zz', rawBody, secret: SECRET })).toBe(false);
    expect(verifyPaddleSignature({ header: undefined, rawBody, secret: SECRET })).toBe(false);
  });
});

const hasEmulators = Boolean(process.env.FIRESTORE_EMULATOR_HOST && process.env.FIREBASE_AUTH_EMULATOR_HOST);

describe.skipIf(!hasEmulators)('billing API', () => {
  let app;
  let db;
  let auth;
  let token;
  let otherToken;
  const BIZ = 'biz-billing-a';
  const paddleCalls = [];

  const signIn = async (uid) => {
    const email = `${uid}@demo.test`;
    await auth.createUser({ uid, email, password: 'demo1234', emailVerified: true }).catch(() => {});
    const res = await fetch(
      `http://${process.env.FIREBASE_AUTH_EMULATOR_HOST}/identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=demo`,
      { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email, password: 'demo1234', returnSecureToken: true }) },
    );
    return (await res.json()).idToken;
  };

  const event = (type, status, occurredAt, extra = {}) => ({
    event_id: `evt_${crypto.randomUUID()}`,
    event_type: type,
    occurred_at: occurredAt,
    data: {
      id: 'sub_test_1',
      status,
      customer_id: 'ctm_test_1',
      custom_data: { businessId: BIZ },
      items: [{ price: { id: 'pri_test_15usd' } }],
      current_billing_period: { starts_at: '2026-11-01T00:00:00Z', ends_at: '2026-12-01T00:00:00Z' },
      next_billed_at: '2026-12-01T00:00:00Z',
      scheduled_change: null,
      canceled_at: null,
      ...extra,
    },
  });

  const deliver = (payload, header) => {
    const body = JSON.stringify(payload);
    return request(app).post('/api/v1/billing/paddle/webhook')
      .set('Content-Type', 'application/json')
      .set('Paddle-Signature', header ?? sign(body))
      .send(body);
  };
  const stored = async () => (await db.doc(`businesses/${BIZ}/billing/subscription`).get()).data();
  const billing = (path = '', method = 'get', t = token) => request(app)[method](`/api/v1/businesses/${BIZ}/billing${path}`)
    .set('Authorization', `Bearer ${t}`);

  beforeAll(async () => {
    ({ default: app } = await import('../app.js'));
    const firebase = await import('../config/firebase.js');
    db = firebase.db;
    const { getAuth } = await import('firebase-admin/auth');
    auth = getAuth(firebase.default);
    await db.doc(`businesses/${BIZ}`).set({ id: BIZ, ownerUid: 'owner-billing-a', name: BIZ });
    await db.doc(`businesses/${BIZ}/members/owner-billing-a`).set({ role: 'owner' });
    token = await signIn('owner-billing-a');
    otherToken = await signIn('owner-billing-b');

    // Fake Paddle API; every other request (the Auth emulator) goes through.
    const realFetch = globalThis.fetch;
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (url, init) => {
      if (!String(url).startsWith('https://sandbox-api.paddle.com')) return realFetch(url, init);
      paddleCalls.push({ url: String(url), init, body: init.body ? JSON.parse(init.body) : undefined });
      if (String(url).endsWith('/transactions')) {
        return new Response(JSON.stringify({ data: { id: 'txn_test_1' } }), { status: 201 });
      }
      return new Response(JSON.stringify({ data: { urls: { general: { overview: 'https://sandbox-customer-portal.paddle.com/x' } } } }), { status: 201 });
    });
  });

  afterAll(async () => {
    vi.restoreAllMocks();
    await db.recursiveDelete(db.doc(`businesses/${BIZ}`));
  });

  it('starts with no subscription and only members can read it', async () => {
    const res = await billing();
    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({ available: true, status: 'none', hasAccess: false, canSubscribe: true, canManage: false });
    expect((await billing('', 'get', otherToken)).status).toBe(403);
  });

  it('creates the checkout on the server with the configured price and business', async () => {
    const res = await billing('/checkout', 'post').send({ priceId: 'pri_free', businessId: 'someone-else' });
    expect(res.status).toBe(201);
    expect(res.body.data).toEqual({ transactionId: 'txn_test_1', environment: 'sandbox' });
    const call = paddleCalls.at(-1);
    expect(call.body).toEqual({ items: [{ price_id: 'pri_test_15usd', quantity: 1 }], custom_data: { businessId: BIZ } });
    expect(call.init.headers.Authorization).toBe('Bearer pdl_sdbx_apikey_test');
    // Starting a checkout changes nothing until Paddle confirms the payment.
    expect(await stored()).toBeUndefined();
  });

  it('refuses unsigned or forged webhooks', async () => {
    const payload = event('subscription.created', 'active', '2026-11-01T00:00:01Z');
    expect((await deliver(payload, 'ts=1;h1=00')).status).toBe(401);
    expect((await deliver(payload, sign(JSON.stringify(payload), 'not-the-secret'))).status).toBe(401);
    expect(await stored()).toBeUndefined();
  });

  it('activates from a signed webhook and blocks a second checkout', async () => {
    expect((await deliver(event('subscription.created', 'active', '2026-11-01T00:00:01Z'))).status).toBe(200);
    expect(await stored()).toMatchObject({ status: 'active', subscriptionId: 'sub_test_1', customerId: 'ctm_test_1' });
    const res = await billing();
    expect(res.body.data).toMatchObject({ status: 'active', hasAccess: true, canSubscribe: false, canManage: true, nextBilledAt: '2026-12-01T00:00:00.000Z' });
    expect((await billing('/checkout', 'post')).status).toBe(409);
  });

  it('keeps access while a renewal payment is retried, ignores stale events and records cancellation', async () => {
    await deliver(event('subscription.past_due', 'past_due', '2026-12-01T00:05:00Z'));
    expect((await billing()).body.data).toMatchObject({ status: 'past_due', hasAccess: true });

    // An older event arriving late does not undo the newer state.
    await deliver(event('subscription.updated', 'active', '2026-11-15T00:00:00Z'));
    expect((await stored()).status).toBe('past_due');

    await deliver(event('subscription.updated', 'active', '2026-12-02T00:00:00Z', {
      scheduled_change: { action: 'cancel', effective_at: '2027-01-01T00:00:00Z' },
    }));
    expect((await billing()).body.data).toMatchObject({ status: 'active', cancelsAt: '2027-01-01T00:00:00.000Z' });

    await deliver(event('subscription.canceled', 'canceled', '2027-01-01T00:00:01Z', { canceled_at: '2027-01-01T00:00:00Z' }));
    expect((await billing()).body.data).toMatchObject({ status: 'canceled', hasAccess: false, canSubscribe: true, canManage: true });
  });

  it('acknowledges events for unknown businesses without writing anything', async () => {
    const payload = event('subscription.created', 'active', '2026-11-01T00:00:01Z', { custom_data: { businessId: 'biz-does-not-exist' } });
    expect((await deliver(payload)).status).toBe(200);
    expect((await db.doc('businesses/biz-does-not-exist/billing/subscription').get()).exists).toBe(false);
  });

  it('opens the portal for the stored customer, reusing it on a new checkout', async () => {
    const res = await billing('/portal', 'post');
    expect(res.status).toBe(200);
    expect(res.body.data.url).toMatch(/^https:\/\/sandbox-customer-portal\.paddle\.com/);
    expect(paddleCalls.at(-1).url).toContain('/customers/ctm_test_1/portal-sessions');

    expect((await billing('/checkout', 'post')).status).toBe(201);
    expect(paddleCalls.at(-1).body.customer_id).toBe('ctm_test_1');
  });
});
