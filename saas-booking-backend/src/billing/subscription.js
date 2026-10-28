// Subscription state of each business, kept in
// businesses/{businessId}/billing/subscription. Only verified Paddle webhooks
// write it (Firestore rules deny the browser), so nothing the client sends
// can turn a subscription on.

import { FieldValue } from 'firebase-admin/firestore';
import { idSchema } from '../domain/schemas.js';

export const subscriptionRef = (db, businessId) => db.doc(`businesses/${businessId}/billing/subscription`);

const STATUSES = ['active', 'trialing', 'past_due', 'paused', 'canceled'];
// past_due keeps access while Paddle retries the card; it becomes canceled
// if every retry fails.
const WITH_ACCESS = ['active', 'trialing', 'past_due'];
// A business in one of these already has a subscription to manage instead of buying another.
export const LIVE_STATUSES = ['active', 'trialing', 'past_due', 'paused'];

const iso = (value) => (value ? new Date(value).toISOString() : null);

/**
 * Applies a verified subscription.* webhook event. Returns what happened so
 * the route can log it; unknown businesses and stale events are ignored
 * (Paddle may deliver events more than once and out of order).
 */
export const applySubscriptionEvent = async (db, event) => {
  if (!String(event?.event_type ?? '').startsWith('subscription.')) return { applied: false, reason: 'not_a_subscription_event' };
  const sub = event.data ?? {};
  const businessId = sub.custom_data?.businessId;
  if (!idSchema.safeParse(businessId).success) return { applied: false, reason: 'no_business' };
  if (!STATUSES.includes(sub.status)) return { applied: false, reason: 'unknown_status' };

  const occurredAt = Date.parse(event.occurred_at);
  if (Number.isNaN(occurredAt)) return { applied: false, reason: 'no_date' };

  return db.runTransaction(async (tx) => {
    const business = await tx.get(db.doc(`businesses/${businessId}`));
    if (!business.exists) return { applied: false, reason: 'no_business' };
    const ref = subscriptionRef(db, businessId);
    const current = await tx.get(ref);
    const last = current.exists ? Date.parse(current.data().lastEventAt) : NaN;
    if (occurredAt < last) return { applied: false, reason: 'stale' };

    tx.set(ref, {
      provider: 'paddle',
      subscriptionId: sub.id,
      customerId: sub.customer_id ?? null,
      status: sub.status,
      priceId: sub.items?.[0]?.price?.id ?? null,
      currentPeriodStart: iso(sub.current_billing_period?.starts_at),
      currentPeriodEnd: iso(sub.current_billing_period?.ends_at),
      nextBilledAt: iso(sub.next_billed_at),
      scheduledChange: sub.scheduled_change
        ? { action: sub.scheduled_change.action, effectiveAt: iso(sub.scheduled_change.effective_at) }
        : null,
      canceledAt: iso(sub.canceled_at),
      lastEventId: event.event_id ?? null,
      lastEventType: event.event_type,
      lastEventAt: new Date(occurredAt).toISOString(),
      updatedAt: FieldValue.serverTimestamp(),
    });
    return { applied: true, businessId, status: sub.status };
  });
};

// What the owner's settings screen shows. Never includes Paddle ids it does not need.
export const toBillingView = (data, { available }) => ({
  available,
  status: data?.status ?? 'none',
  hasAccess: WITH_ACCESS.includes(data?.status),
  canSubscribe: !LIVE_STATUSES.includes(data?.status),
  canManage: Boolean(data?.customerId),
  currentPeriodEnd: data?.currentPeriodEnd ?? null,
  nextBilledAt: data?.nextBilledAt ?? null,
  cancelsAt: data?.scheduledChange?.action === 'cancel' ? data.scheduledChange.effectiveAt : null,
  canceledAt: data?.canceledAt ?? null,
});
