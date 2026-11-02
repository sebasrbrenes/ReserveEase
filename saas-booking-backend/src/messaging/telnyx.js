// Telnyx Messaging API, called with fetch (Node 22) instead of the SDK: we
// only send messages and verify webhooks.
//
// Sending real texts needs three separate switches, all off by default:
//   1. SMS_MODE=live and TELNYX_API_KEY on the server;
//   2. the business's carrier registration approved, with its own number
//      (businesses/{id}/messaging/sms: status "approved", fromNumber);
//   3. the business's SMS add-on active and the client's consent.
// Without (1) the worker uses the mock and records "simulated".

import crypto from 'crypto';
import { SendError } from '../notifications/adapters.js';

const API_URL = 'https://api.telnyx.com/v2';
const SIGNATURE_TOLERANCE_SECONDS = 5 * 60;
// DER prefix of an Ed25519 public key: Telnyx gives the raw 32 bytes in base64.
const ED25519_SPKI_PREFIX = Buffer.from('302a300506032b6570032100', 'hex');

export const telnyxConfig = (env = process.env) => ({
  live: env.SMS_MODE === 'live' && Boolean(env.TELNYX_API_KEY),
  apiKey: env.TELNYX_API_KEY || '',
  publicKey: env.TELNYX_PUBLIC_KEY || '',
  messagingProfileId: env.TELNYX_MESSAGING_PROFILE_ID || '',
});

/**
 * Checks telnyx-signature-ed25519 over "timestamp|raw body" with the
 * account's public key, and refuses timestamps older than 5 minutes.
 */
export const verifyTelnyxSignature = ({
  signature, timestamp, rawBody, publicKey, nowSeconds = Math.floor(Date.now() / 1000),
}) => {
  if (!signature || !timestamp || !publicKey || !Buffer.isBuffer(rawBody)) return false;
  if (!/^\d+$/.test(String(timestamp))) return false;
  if (Math.abs(nowSeconds - Number(timestamp)) > SIGNATURE_TOLERANCE_SECONDS) return false;
  try {
    const raw = Buffer.from(publicKey, 'base64');
    if (raw.length !== 32) return false;
    const key = crypto.createPublicKey({ key: Buffer.concat([ED25519_SPKI_PREFIX, raw]), format: 'der', type: 'spki' });
    const message = Buffer.concat([Buffer.from(`${timestamp}|`), rawBody]);
    return crypto.verify(null, message, key, Buffer.from(String(signature), 'base64'));
  } catch {
    return false;
  }
};

// Same interface as the email adapters: send(message, { idempotencyKey }).
export const createMockSmsAdapter = ({ fail } = {}) => {
  const sent = [];
  const byKey = new Map();
  return {
    name: 'mock',
    sent,
    async send(message, { idempotencyKey }) {
      if (fail) await fail(message, { idempotencyKey });
      if (byKey.has(idempotencyKey)) return { ...byKey.get(idempotencyKey), duplicate: true };
      const result = { status: 'simulated', providerMessageId: `mock_sms_${idempotencyKey}`, cost: null };
      byKey.set(idempotencyKey, result);
      sent.push({ ...message, idempotencyKey });
      console.log(`[sms:mock] ${idempotencyKey} not sent (mock mode)`);
      return result;
    },
  };
};

/**
 * Telnyx has no idempotency key: a worker that stops between Telnyx's answer
 * and saving it could send twice. The job lease makes that window a few
 * seconds, and the job id travels as the message's tag for reconciliation.
 */
export const createTelnyxAdapter = ({ apiKey, messagingProfileId, webhookUrl, fetchImpl = fetch }) => ({
  name: 'telnyx',
  async send(message, { idempotencyKey }) {
    let response;
    try {
      response = await fetchImpl(`${API_URL}/messages`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: message.from,
          to: message.to,
          text: message.text,
          ...(messagingProfileId ? { messaging_profile_id: messagingProfileId } : {}),
          ...(webhookUrl ? { webhook_url: webhookUrl } : {}),
          type: 'SMS',
          tags: [idempotencyKey.slice(0, 64)],
        }),
      });
    } catch {
      throw new SendError('TELNYX_NETWORK');
    }
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      const code = payload.errors?.[0]?.code;
      // 4xx other than rate limiting will fail the same way again.
      const permanent = response.status >= 400 && response.status < 500 && response.status !== 429;
      throw new SendError(`TELNYX_${response.status}${code ? `_${code}` : ''}`, { permanent });
    }
    const data = payload.data ?? {};
    return {
      status: 'accepted',
      providerMessageId: data.id ?? null,
      cost: data.cost?.amount ? { amount: data.cost.amount, currency: data.cost.currency ?? 'USD' } : null,
    };
  },
});

export const smsAdapterFromEnv = (env = process.env) => {
  const config = telnyxConfig(env);
  return config.live
    ? createTelnyxAdapter({
      apiKey: config.apiKey,
      messagingProfileId: config.messagingProfileId,
      webhookUrl: env.TELNYX_WEBHOOK_URL || undefined,
    })
    : createMockSmsAdapter();
};
