// Paddle Billing (merchant of record) for the ReserveEase subscription.
// Only the server talks to the Paddle API: the price and the business a
// checkout belongs to are set here, never by the browser, and a subscription
// becomes active only from a signed webhook (see subscription.js).

import crypto from 'crypto';

const API_URL = {
  sandbox: 'https://sandbox-api.paddle.com',
  production: 'https://api.paddle.com',
};

// Signed webhooks older than this are refused, so a captured one cannot be replayed later.
const SIGNATURE_TOLERANCE_SECONDS = 5 * 60;

export const paddleConfig = (env = process.env) => {
  const environment = env.PADDLE_ENV === 'production' ? 'production' : 'sandbox';
  return {
    environment,
    apiKey: env.PADDLE_API_KEY || '',
    priceId: env.PADDLE_PRICE_ID || '',
    webhookSecret: env.PADDLE_WEBHOOK_SECRET || '',
    apiUrl: API_URL[environment],
  };
};

// Checkout is offered only when every server-side piece exists.
export const isBillingConfigured = (config = paddleConfig()) =>
  Boolean(config.apiKey && config.priceId && config.webhookSecret);

/**
 * Checks the Paddle-Signature header ("ts=...;h1=...") against the raw body.
 * There can be several h1 values while a secret is being rotated.
 */
export const verifyPaddleSignature = ({ header, rawBody, secret, nowSeconds = Math.floor(Date.now() / 1000) }) => {
  if (!header || !secret || !Buffer.isBuffer(rawBody)) return false;
  const parts = String(header).split(';').map((p) => p.split('='));
  const ts = parts.find(([k]) => k === 'ts')?.[1];
  const signatures = parts.filter(([k]) => k === 'h1').map(([, v]) => v);
  if (!/^\d+$/.test(ts ?? '') || signatures.length === 0) return false;
  if (Math.abs(nowSeconds - Number(ts)) > SIGNATURE_TOLERANCE_SECONDS) return false;

  const expected = crypto.createHmac('sha256', secret)
    .update(`${ts}:`).update(rawBody)
    .digest();
  return signatures.some((sig) => {
    if (!/^[0-9a-f]{64}$/i.test(sig)) return false;
    return crypto.timingSafeEqual(expected, Buffer.from(sig, 'hex'));
  });
};

export class PaddleError extends Error {
  constructor(status, code, message) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

const call = async (config, method, path, body) => {
  const response = await fetch(`${config.apiUrl}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${config.apiKey}`,
      'Content-Type': 'application/json',
      'Paddle-Version': '1',
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new PaddleError(response.status, payload.error?.code || 'paddle_error', payload.error?.detail || 'Paddle request failed');
  }
  return payload.data;
};

// A draft transaction for the plan's price, tied to the business. The browser
// opens it with Paddle.js; custom_data is copied to the subscription it creates.
export const createCheckoutTransaction = (config, { businessId, customerId }) => call(config, 'POST', '/transactions', {
  items: [{ price_id: config.priceId, quantity: 1 }],
  custom_data: { businessId },
  ...(customerId ? { customer_id: customerId } : {}),
});

// A short-lived link to Paddle's customer portal, where the business updates
// its card, sees its invoices or cancels.
export const createPortalSession = (config, { customerId, subscriptionId }) => call(
  config, 'POST', `/customers/${encodeURIComponent(customerId)}/portal-sessions`,
  subscriptionId ? { subscription_ids: [subscriptionId] } : {},
);
