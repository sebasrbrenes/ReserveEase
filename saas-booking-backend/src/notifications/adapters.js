// Email senders used by the notification worker. The mock never contacts a
// provider and its result says so ("simulated"); the SendGrid adapter is only
// used with NOTIFICATIONS_MODE=live and an API key.

import sgMail from '@sendgrid/mail';

export class SendError extends Error {
  constructor(code, { permanent = false } = {}) {
    super(code);
    this.code = code;
    this.permanent = permanent;
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

// SendGrid accepts a message and delivers it later: "accepted" is not
// "delivered". It has no idempotency key, so a worker that stops between the
// provider's acceptance and saving the result can send a message twice; the
// job id travels in custom_args so the two can be reconciled.
export const createSendgridAdapter = ({ apiKey, from }) => {
  sgMail.setApiKey(apiKey);
  return {
    name: 'sendgrid',
    async send(message, { idempotencyKey }) {
      try {
        const [response] = await sgMail.send({
          to: message.to, from, subject: message.subject, text: message.text, html: message.html,
          customArgs: { jobId: idempotencyKey },
        });
        return { status: 'accepted', providerMessageId: response?.headers?.['x-message-id'] ?? null };
      } catch (error) {
        const status = error?.code ?? error?.response?.statusCode;
        // 4xx other than rate limiting will fail again the same way.
        const permanent = typeof status === 'number' && status >= 400 && status < 500 && status !== 429;
        throw new SendError(`SENDGRID_${status ?? 'NETWORK'}`, { permanent });
      }
    },
  };
};

export const adapterFromEnv = (env = process.env) => (
  env.NOTIFICATIONS_MODE === 'live' && env.SENDGRID_API_KEY && env.FROM_EMAIL
    ? createSendgridAdapter({ apiKey: env.SENDGRID_API_KEY, from: env.FROM_EMAIL })
    : createMockAdapter()
);
