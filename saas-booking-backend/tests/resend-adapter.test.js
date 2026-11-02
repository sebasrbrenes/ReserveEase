// Resend adapter: what it sends and how provider errors become retry decisions.
// Uses a fake client, so it never contacts Resend.
import { describe, expect, it } from 'vitest';
import {
  adapterFromEnv, createResendAdapter, nextUtcMidnight, SendError, sendErrorFromResend,
} from '../src/notifications/adapters.js';

const fakeClient = (answer) => {
  const calls = [];
  return {
    calls,
    emails: {
      async send(payload, options) {
        calls.push({ payload, options });
        return typeof answer === 'function' ? answer(payload, options) : answer;
      },
    },
  };
};

const message = { to: 'client@example.com', subject: 'Hi', text: 'hi', html: '<p>hi</p>', fromName: 'Joe\'s "Best" <Barber>' };

describe('Resend adapter', () => {
  it('sends with the job id as idempotency key and the business as sender name', async () => {
    const client = fakeClient({ data: { id: 'email_123' }, error: null });
    const adapter = createResendAdapter({ from: 'ReserveEase <bookings@example.com>', replyTo: 'help@example.com', client });
    const result = await adapter.send(message, { idempotencyKey: 'apt1_v1_confirmation_email' });

    expect(result).toEqual({ status: 'accepted', providerMessageId: 'email_123' });
    const [{ payload, options }] = client.calls;
    expect(options).toEqual({ idempotencyKey: 'apt1_v1_confirmation_email' });
    expect(payload).toMatchObject({
      from: "Joe's Best Barber <bookings@example.com>",
      to: ['client@example.com'],
      subject: 'Hi',
      html: '<p>hi</p>',
      text: 'hi',
      replyTo: 'help@example.com',
      tags: [{ name: 'job', value: 'apt1_v1_confirmation_email' }],
    });
  });

  it('keeps the configured sender when the message has no business name', async () => {
    const client = fakeClient({ data: { id: 'e' }, error: null });
    await createResendAdapter({ from: 'bookings@example.com', client })
      .send({ ...message, fromName: undefined }, { idempotencyKey: 'k1' });
    expect(client.calls[0].payload.from).toBe('bookings@example.com');
    expect(client.calls[0].payload).not.toHaveProperty('replyTo');
  });

  it('turns Resend errors into permanent, retryable or deferred failures', async () => {
    const now = Date.UTC(2026, 10, 2, 15, 30);
    const fail = (name, statusCode) => createResendAdapter({
      from: 'a@example.com', client: fakeClient({ data: null, error: { name, statusCode, message: 'x' } }), clock: () => now,
    }).send(message, { idempotencyKey: 'k' }).catch((e) => e);

    const daily = await fail('daily_quota_exceeded', 429);
    expect(daily).toBeInstanceOf(SendError);
    expect(daily).toMatchObject({ code: 'RESEND_DAILY_QUOTA_EXCEEDED', permanent: false, retryAt: Date.UTC(2026, 10, 3) });

    expect(await fail('rate_limit_exceeded', 429)).toMatchObject({ permanent: false, retryAt: null });
    expect(await fail('application_error', null)).toMatchObject({ code: 'RESEND_APPLICATION_ERROR', permanent: false });
    expect(await fail('validation_error', 422)).toMatchObject({ code: 'RESEND_VALIDATION_ERROR', permanent: true });
    expect(await fail('invalid_api_key', 403)).toMatchObject({ permanent: true });
    // Same key, other body: the first request already went out.
    expect(await fail('invalid_idempotent_request', 409)).toMatchObject({ permanent: true });
    expect((await fail('monthly_quota_exceeded', 429)).retryAt).toBeGreaterThan(now);
  });

  it('computes the next UTC midnight', () => {
    expect(nextUtcMidnight(Date.UTC(2026, 11, 31, 23, 59))).toBe(Date.UTC(2027, 0, 1));
    expect(sendErrorFromResend(undefined).code).toBe('RESEND_APPLICATION_ERROR');
  });

  it('only goes live with the mode, a key and a sender', () => {
    expect(adapterFromEnv({}).name).toBe('mock');
    expect(adapterFromEnv({ NOTIFICATIONS_MODE: 'live', RESEND_API_KEY: 're_x' }).name).toBe('mock');
    expect(adapterFromEnv({ NOTIFICATIONS_MODE: 'mock', RESEND_API_KEY: 're_x', EMAIL_FROM: 'a@example.com' }).name).toBe('mock');
    expect(adapterFromEnv({ NOTIFICATIONS_MODE: 'live', RESEND_API_KEY: 're_x', EMAIL_FROM: 'a@example.com' }).name).toBe('resend');
  });
});
