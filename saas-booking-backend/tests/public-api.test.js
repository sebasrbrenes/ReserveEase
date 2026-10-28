// Runs against the Firestore emulator (npm run test:emulator).
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const hasEmulator = Boolean(process.env.FIRESTORE_EMULATOR_HOST);

describe.skipIf(!hasEmulator)('GET /api/v1/public/businesses/:slug', () => {
  let app;
  let db;

  const published = {
    businessId: 'biz-test',
    slug: 'test-barberia',
    name: 'Test Barbería',
    timezone: 'America/Costa_Rica',
    currency: 'CRC',
    status: 'published',
    services: [{ id: 'svc-1', name: 'Corte', durationMinutes: 30, priceMinor: 600000, currency: 'CRC' }],
    staff: [{ id: 'staff-1', displayName: 'Ana', serviceIds: ['svc-1'] }],
    // Not part of the public allow-list: must never be returned.
    ownerUid: 'secret-owner',
    ownerEmail: 'owner@example.com',
  };

  beforeAll(async () => {
    ({ default: app } = await import('../app.js'));
    ({ db } = await import('../config/firebase.js'));
    await db.doc('publicBusinesses/test-barberia').set(published);
    await db.doc('publicBusinesses/test-draft').set({ ...published, slug: 'test-draft', status: 'draft' });
  });

  afterAll(async () => {
    await db.doc('publicBusinesses/test-barberia').delete();
    await db.doc('publicBusinesses/test-draft').delete();
  });

  it('returns only allow-listed public fields', async () => {
    const res = await request(app).get('/api/v1/public/businesses/test-barberia');
    expect(res.status).toBe(200);
    expect(res.body.requestId).toMatch(/^req_/);
    expect(res.body.data).toEqual({
      businessId: 'biz-test',
      slug: 'test-barberia',
      name: 'Test Barbería',
      description: '',
      timezone: 'America/Costa_Rica',
      currency: 'CRC',
      language: 'es',
      services: [{ id: 'svc-1', name: 'Corte', description: '', durationMinutes: 30, priceMinor: 600000, currency: 'CRC' }],
      staff: [{ id: 'staff-1', displayName: 'Ana', serviceIds: ['svc-1'] }],
    });
  });

  it('sends security headers and hides the framework', async () => {
    const res = await request(app).get('/api/v1/public/businesses/test-barberia');
    expect(res.headers['x-content-type-options']).toBe('nosniff');
    expect(res.headers['x-frame-options']).toBe('DENY');
    expect(res.headers['strict-transport-security']).toMatch(/max-age=\d+/);
    expect(res.headers['content-security-policy']).toContain("frame-ancestors 'none'");
    expect(res.headers['x-powered-by']).toBeUndefined();
  });

  it('hides draft businesses', async () => {
    const res = await request(app).get('/api/v1/public/businesses/test-draft');
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('BUSINESS_NOT_FOUND');
  });

  it('returns 404 for unknown slugs', async () => {
    const res = await request(app).get('/api/v1/public/businesses/does-not-exist');
    expect(res.status).toBe(404);
    expect(res.body).toMatchObject({ error: { code: 'BUSINESS_NOT_FOUND', fields: [] } });
  });

  it('rejects malformed slugs with field details', async () => {
    const res = await request(app).get('/api/v1/public/businesses/Not_A_Slug');
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('INVALID_INPUT');
    expect(res.body.error.fields[0].path).toBe('slug');
  });

  it('answers unknown v1 routes with the JSON error format', async () => {
    const res = await request(app).get('/api/v1/nope');
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });
});
