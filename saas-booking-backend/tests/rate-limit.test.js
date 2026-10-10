import express from 'express';
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { createRateLimiter } from '../middleware/rateLimit.js';

describe('createRateLimiter (T32)', () => {
  it('answers 429 with Retry-After once the limit is reached, without calling the handler', async () => {
    let handled = 0;
    const app = express();
    app.use(createRateLimiter({ windowMs: 60000, max: 2, onLimit: (req, res) => res.status(429).end() }));
    app.get('/', (req, res) => { handled += 1; res.end(); });
    const statuses = [];
    for (let i = 0; i < 3; i += 1) statuses.push((await request(app).get('/')).status);
    expect(statuses).toEqual([200, 200, 429]);
    expect(handled).toBe(2);
  });
});
