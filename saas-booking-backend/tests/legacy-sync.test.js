// Bridge from the current settings screen to model v2.
import crypto from 'crypto';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { businessIdFor, legacyToV2, slugFor } from '../src/domain/legacySync.js';

const hours = (start, end, closed = []) => Object.fromEntries(
  ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
    .map((d) => [d, { start, end, enabled: !closed.includes(d) }])
);

const settings = {
  business: {
    name: 'Barbería Ñandú',
    timeInterval: 30,
    timezone: 'America/Mexico_City',
    currency: 'MXN',
    services: [
      { id: '1712345678901', name: 'Corte', duration: 32, price: 12.5 },
      { id: 'bad id!', name: 'Barba', duration: 20, price: 8 },
      { id: 'empty', name: '  ', duration: 20, price: 8 },
    ],
    staff: [
      { id: 's1', name: 'Ana', availableServices: ['1712345678901', 'deleted-service'], active: true },
      { id: 's2', name: 'Luis', availableServices: ['bad id!'], active: false },
    ],
  },
  businessHours: hours('9:00 AM', '5:30 PM', ['sunday']),
};

describe('legacyToV2', () => {
  it('maps services, staff, hours and policy into valid v2 documents', () => {
    const v2 = legacyToV2({ uid: 'uid-1', settings });
    expect(v2.business).toMatchObject({
      id: businessIdFor('uid-1'), name: 'Barbería Ñandú', status: 'published', timezone: 'America/Mexico_City', currency: 'MXN',
      bookingPolicy: { slotStepMinutes: 30 },
      weeklySchedule: { monday: [{ start: '09:00', end: '17:30' }], sunday: [] },
    });
    expect(v2.business.slug).toMatch(/^barberia-nandu-[0-9a-f]{6}$/);
    expect(v2.services).toEqual([
      expect.objectContaining({ id: '1712345678901', durationMinutes: 35, priceMinor: 1250, currency: 'MXN' }),
      expect.objectContaining({ id: 'bad-id-', name: 'Barba', priceMinor: 800 }),
    ]);
    expect(v2.staff[0]).toMatchObject({ id: 's1', displayName: 'Ana', serviceIds: ['1712345678901'] });
    expect(v2.publicBusiness.staff.map((s) => s.id)).toEqual(['s1']);
    expect(v2.problems).toEqual([]);
    expect(v2.business.clientEmails).toBe(true);
    expect(legacyToV2({ uid: 'uid-1', settings: { ...settings, business: { ...settings.business, clientEmails: false } } }).business.clientEmails).toBe(false);
    expect(JSON.stringify(v2.publicBusiness)).not.toContain('uid-1');
  });

  it('uses Spanish for the client pages unless the business picks English', () => {
    const withLanguage = (language) => legacyToV2({
      uid: 'uid-1', settings: { ...settings, business: { ...settings.business, language } },
    });
    expect(legacyToV2({ uid: 'uid-1', settings }).business.language).toBe('es');
    expect(withLanguage('en').business.language).toBe('en');
    expect(withLanguage('en').publicBusiness.language).toBe('en');
    expect(withLanguage('fr').business.language).toBe('es');
  });

  it('keeps an existing slug so shared links survive a rename', () => {
    const v2 = legacyToV2({ uid: 'uid-1', settings, existingSlug: 'mi-enlace-abc123' });
    expect(v2.business.slug).toBe('mi-enlace-abc123');
    expect(slugFor('uid-1', '')).toMatch(/^negocio-[0-9a-f]{6}$/);
  });

  it('stays a draft and lists what is missing for an empty account', () => {
    const v2 = legacyToV2({ uid: 'uid-2', settings: { business: { services: [], staff: [] }, businessHours: {} } });
    expect(v2.business.status).toBe('draft');
    expect(v2.publicBusiness.status).toBe('draft');
    expect(v2.problems).toEqual(['NAME_MISSING', 'NO_SERVICES', 'NO_STAFF_WITH_SERVICES', 'NO_OPENING_HOURS']);
  });

  it('treats a midnight closing time as the end of the day', () => {
    const v2 = legacyToV2({ uid: 'u', settings: { ...settings, businessHours: hours('6:00 PM', '12:00 AM') } });
    expect(v2.business.weeklySchedule.friday).toEqual([{ start: '18:00', end: '23:55' }]);
  });
});

const hasEmulators = Boolean(process.env.FIRESTORE_EMULATOR_HOST && process.env.FIREBASE_AUTH_EMULATOR_HOST);

describe.skipIf(!hasEmulators)('POST /api/v1/me/business/sync', () => {
  let app;
  let db;
  let token;
  const uid = `sync-owner-${crypto.randomUUID().slice(0, 8)}`;
  const bizId = businessIdFor(uid);

  beforeAll(async () => {
    ({ default: app } = await import('../app.js'));
    const firebase = await import('../config/firebase.js');
    db = firebase.db;
    const { getAuth } = await import('firebase-admin/auth');
    const email = `${uid}@demo.test`;
    await getAuth(firebase.default).createUser({ uid, email, password: 'demo1234', emailVerified: true });
    const res = await fetch(
      `http://${process.env.FIREBASE_AUTH_EMULATOR_HOST}/identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=demo`,
      { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email, password: 'demo1234', returnSecureToken: true }) },
    );
    token = (await res.json()).idToken;
    await db.doc(`users/${uid}/settings/business`).set(settings);
  });

  afterAll(async () => {
    const biz = await db.doc(`businesses/${bizId}`).get();
    if (biz.exists) await db.doc(`publicBusinesses/${biz.data().slug}`).delete();
    await db.recursiveDelete(db.doc(`businesses/${bizId}`));
    await db.recursiveDelete(db.doc(`users/${uid}`));
  });

  const sync = () => request(app).post('/api/v1/me/business/sync').set('Authorization', `Bearer ${token}`);

  it('requires a signed-in user', async () => {
    expect((await request(app).post('/api/v1/me/business/sync')).status).toBe(401);
  });

  it('publishes the business, makes the user its owner and opens the booking page', async () => {
    const res = await sync();
    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({ businessId: `${bizId}`, status: 'published', problems: [] });
    expect((await db.doc(`businesses/${bizId}/members/${uid}`).get()).data()).toEqual({ role: 'owner' });
    const page = await request(app).get(`/api/v1/public/businesses/${res.body.data.slug}`);
    expect(page.status).toBe(200);
    expect(page.body.data.services.map((s) => s.name)).toEqual(['Corte', 'Barba']);
    const list = await request(app).get(`/api/v1/businesses/${bizId}/appointments?from=2026-10-01&to=2026-10-31`)
      .set('Authorization', `Bearer ${token}`);
    expect(list.status).toBe(200);
  });

  it('deactivates removed services and keeps the slug after a rename', async () => {
    const first = (await sync()).body.data;
    await db.doc(`users/${uid}/settings/business`).set({
      ...settings, business: { ...settings.business, name: 'Otro nombre', services: settings.business.services.slice(0, 1) },
    });
    const second = (await sync()).body.data;
    expect(second.slug).toBe(first.slug);
    expect((await db.doc(`businesses/${bizId}/services/bad-id-`).get()).data().active).toBe(false);
    const page = await request(app).get(`/api/v1/public/businesses/${second.slug}`);
    expect(page.body.data).toMatchObject({ name: 'Otro nombre' });
    expect(page.body.data.services).toHaveLength(1);
  });

  it('answers several syncs at once, as when a page loads while another is still saving', async () => {
    const started = Date.now();
    const results = await Promise.all([sync(), sync(), sync()]);
    expect(results.map((r) => r.status)).toEqual([200, 200, 200]);
    expect(Date.now() - started).toBeLessThan(1500);
  });
});
