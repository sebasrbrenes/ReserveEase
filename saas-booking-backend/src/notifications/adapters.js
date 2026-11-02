// Email senders used by the notification worker. The worker only knows the
// small interface below, so the provider can change without touching it:
//
//   adapter.send({ to, subject, text, html, fromName? }, { idempotencyKey })
//     -> { status: 'accepted' | 'simulated', providerMessageId }
//     throws SendError on failure
//
// The mock never contacts a provider and its result says so ("simulated");
// the Resend adapter is only used with NOTIFICATIONS_MODE=live and a key.

import { Resend } from 'resend';

/**
 * code: short error code stored on the job (never the message, which can hold personal data).
 * permanent: the same request will fail again, so the worker stops retrying.
 * retryAt: the provider asked us to wait until then (a quota); the worker
 *          defers the job without spending one of its attempts.
 */
export class SendError extends Error {
  constructor(code, { permanent = false, retryAt = null } = {}) {
    super(code);
    this.code = code;
    this.permanent = permanent;
    this.retryAt = retryAt;
  }
}

// Records messages in memory. Like a provider that deduplicates by key, a
// repeated idempotency key returns the first result without sending again.
export const createMockAdapter = ({ fail } = {}) => {
  const sent = [];
  const byKey = new Map();
  return {
    name: 'mock',
    sent,
    async send(message, { idempotencyKey }) {
      if (fail) await fail(message, { idempotencyKey });
      if (byKey.has(idempotencyKey)) return { ...byKey.get(idempotencyKey), duplicate: true };
      const result = { status: 'simulated', providerMessageId: `mock_${idempotencyKey}` };
      byKey.set(idempotencyKey, result);
      sent.push({ ...message, idempotencyKey });
      // Only the template key: message bodies contain personal data.
      console.log(`[notifications:mock] ${idempotencyKey} not sent (mock mode)`);
      return result;
    },
  };
};

// Start of the next UTC day: Resend's daily quota resets at midnight UTC.
export const nextUtcMidnight = (nowMs) => {
  const d = new Date(nowMs);
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() + 1);
};

const MONTHLY_QUOTA_WAIT_MS = 6 * 60 * 60 * 1000;

// Resend error names that will fail the same way if repeated.
const PERMANENT = new Set([
  'validation_error', 'missing_required_field', 'invalid_parameter', 'invalid_from_address',
  'invalid_attachment', 'missing_api_key', 'invalid_api_key', 'restricted_api_key', 'invalid_access',
  'invalid_region', 'not_found', 'method_not_allowed', 'security_error', 'invalid_idempotency_key',
  // The key was already used with another body: the first request went
  // through, so sending again could only produce a duplicate.
  'invalid_idempotent_request',
]);

export const sendErrorFromResend = (error, nowMs = Date.now()) => {
  const name = String(error?.name || 'application_error');
  const code = `RESEND_${name.toUpperCase()}`;
  if (name === 'daily_quota_exceeded') return new SendError(code, { retryAt: nextUtcMidnight(nowMs) });
  if (name === 'monthly_quota_exceeded') return new SendError(code, { retryAt: nowMs + MONTHLY_QUOTA_WAIT_MS });
  if (PERMANENT.has(name)) return new SendError(code, { permanent: true });
  // rate_limit_exceeded, concurrent_idempotent_requests, application_error,
  // internal_server_error and network failures: try again later.
  return new SendError(code);
};

// Display name of the sender: the business, so clients recognise it, with
// characters that would break the From header removed.
const displayName = (name) => String(name ?? '').replace(/["<>\\\r\n]/g, '').trim().slice(0, 70);

/**
 * Resend accepts a message and delivers it later: "accepted" is not
 * "delivered". The job id is sent as Resend's idempotency key (kept 24
 * hours), so a worker that stops between Resend's answer and saving it does
 * not send the email twice when another worker retries.
 * @param {{ apiKey?: string, from: string, replyTo?: string, client?: object, clock?: () => number }} options
 *        from: "Name <address@verified-domain>" or a bare address; client: injected in tests.
 */
export const createResendAdapter = ({ apiKey, from, replyTo, client, clock = Date.now }) => {
  const resend = client ?? new Resend(apiKey);
  const address = from.match(/<([^>]+)>/)?.[1] ?? from.trim();
  return {
    name: 'resend',
    async send(message, { idempotencyKey }) {
      const sender = message.fromName ? `${displayName(message.fromName)} <${address}>` : from;
      const { data, error } = await resend.emails.send({
        from: sender,
        to: [message.to],
        subject: message.subject,
        html: message.html,
        text: message.text,
        ...(replyTo ? { replyTo } : {}),
        tags: [{ name: 'job', value: idempotencyKey.replace(/[^A-Za-z0-9_-]/g, '_').slice(0, 256) }],
      }, { idempotencyKey });
      if (error) throw sendErrorFromResend(error, clock());
      return { status: 'accepted', providerMessageId: data?.id ?? null };
    },
  };
};

export const adapterFromEnv = (env = process.env) => (
  env.NOTIFICATIONS_MODE === 'live' && env.RESEND_API_KEY && env.EMAIL_FROM
    ? createResendAdapter({ apiKey: env.RESEND_API_KEY, from: env.EMAIL_FROM, replyTo: env.EMAIL_REPLY_TO || undefined })
    : createMockAdapter()
);
