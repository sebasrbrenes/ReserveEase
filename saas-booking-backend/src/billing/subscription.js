// Subscription state of each business, kept in
// businesses/{businessId}/billing/subscription. Only verified Paddle webhooks
// write it (Firestore rules deny the browser), so nothing the client sends
// can turn a subscription or an add-on on.

import { FieldValue } from 'firebase-admin/firestore';
import { idSchema } from '../domain/schemas.js';
import { ADDONS, catalogFromEnv, monthlyTotalUsd, PLANS, resolveItems } from './catalog.js';

export const subscriptionRef = (db, businessId) => db.doc(`businesses/${businessId}/billing/subscription`);

const STATUSES = ['active', 'trialing', 'past_due', 'paused', 'canceled'];
// past_due keeps access while Paddle retries the card; it becomes canceled
// if every retry fails.
const WITH_ACCESS = ['active', 'trialing', 'past_due'];
// A business in one of these already has a subscription to manage instead of buying another.
export const LIVE_STATUSES = ['active', 'trialing', 'past_due', 'paused'];
// Paddle only lets these change their items.
const CHANGEABLE_STATUSES = ['active', 'trialing'];

const iso = (value) => (value ? new Date(value).toISOString() : null);

/**
 * Applies a verified subscription.* webhook event. Returns what happened so
 * the route can log it; unknown businesses, repeated and stale events are
 * ignored (Paddle may deliver events more than once and out of order).
 */
export const applySubscriptionEvent = async (db, event, { catalog = catalogFromEnv() } = {}) => {
  if (!String(event?.event_type ?? '').startsWith('subscription.')) return { applied: false, reason: 'not_a_subscription_event' };
  const sub = event.data ?? {};
  const businessId = sub.custom_data?.businessId;
  if (!idSchema.safeParse(businessId).success) return { applied: false, reason: 'no_business' };
  if (!STATUSES.includes(sub.status)) return { applied: false, reason: 'unknown_status' };

  const occurredAt = Date.parse(event.occurred_at);
  if (Number.isNaN(occurredAt)) return { applied: false, reason: 'no_date' };

  // Every recurring item, not just the first: the plan and its add-ons.
  const items = (sub.items ?? [])
    .filter((item) => item?.price?.id && (item.status ?? 'active') === 'active')
    .map((item) => ({ priceId: item.price.id, quantity: item.quantity ?? 1 }));
  const { plan, addons } = resolveItems(items.map((i) => i.priceId), catalog);

  return db.runTransaction(async (tx) => {
    const business = await tx.get(db.doc(`businesses/${businessId}`));
    if (!business.exists) return { applied: false, reason: 'no_business' };
    const ref = subscriptionRef(db, businessId);
    const current = await tx.get(ref);
    if (current.exists && event.event_id && current.data().lastEventId === event.event_id) {
      return { applied: false, reason: 'duplicate' };
    }
    const last = current.exists ? Date.parse(current.data().lastEventAt) : NaN;
    if (occurredAt < last) return { applied: false, reason: 'stale' };

    tx.set(ref, {
      provider: 'paddle',
      subscriptionId: sub.id,
      customerId: sub.customer_id ?? null,
      status: sub.status,
      items,
      plan,
      addons,
      // Kept for the code written before add-ons: the first item's price.
      priceId: items[0]?.priceId ?? null,
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
    return { applied: true, businessId, status: sub.status, plan, addons };
  });
};

// Stored documents from before add-ons have priceId but no plan.
const planOf = (data, catalog) => data?.plan
  ?? resolveItems(data?.items?.map((i) => i.priceId) ?? [data?.priceId].filter(Boolean), catalog).plan
  ?? (data?.status ? 'basic' : null);

export const hasPaidAccess = (data) => WITH_ACCESS.includes(data?.status);

/**
 * Whether the business may use an add-on right now: the subscription grants
 * access and holds the add-on's price.
 */
export const hasAddon = (data, key) => hasPaidAccess(data) && (data?.addons ?? []).includes(key);

/**
 * Access enforcement. Until BILLING_ENFORCEMENT_DATE (an ISO date or
 * instant) every business keeps using ReserveEase; from then on, only those
 * with an active subscription. It never applies while Paddle is not set up,
 * so a missing variable cannot lock everyone out.
 */
export const enforcementFromEnv = (env = process.env, { billingConfigured } = {}) => {
  const at = Date.parse(env.BILLING_ENFORCEMENT_DATE ?? '');
  return { startsAtMs: Number.isNaN(at) || !billingConfigured ? null : at };
};

export const accessFor = (data, { enforcement, nowMs = Date.now() }) => {
  const paid = hasPaidAccess(data);
  const enforced = enforcement.startsAtMs !== null && nowMs >= enforcement.startsAtMs;
  return {
    allowed: paid || !enforced,
    // The date shown to owners without a subscription before it applies.
    requiredFrom: !paid && enforcement.startsAtMs !== null ? new Date(enforcement.startsAtMs).toISOString() : null,
    enforced,
  };
};

/** Items to send to Paddle for the subscription with an add-on added or removed. */
export const itemsWithAddon = (data, addonPriceId, { add }) => {
  const kept = (data?.items?.length ? data.items : [{ priceId: data?.priceId, quantity: 1 }])
    .filter((i) => i.priceId && i.priceId !== addonPriceId);
  return add ? [...kept, { priceId: addonPriceId, quantity: 1 }] : kept;
};

export const canChangeItems = (data) => CHANGEABLE_STATUSES.includes(data?.status) && Boolean(data?.subscriptionId)
  && data?.scheduledChange?.action !== 'cancel';

// What the owner's settings screen shows. Never includes Paddle ids it does not need.
export const toBillingView = (data, {
  available, addonsAvailable = {}, enforcement = { startsAtMs: null }, nowMs = Date.now(),
  catalog = catalogFromEnv(),
}) => {
  const plan = planOf(data, catalog);
  const addons = hasPaidAccess(data) ? (data?.addons ?? []) : [];
  return {
    available,
    status: data?.status ?? 'none',
    hasAccess: hasPaidAccess(data),
    access: accessFor(data, { enforcement, nowMs }),
    canSubscribe: !LIVE_STATUSES.includes(data?.status),
    canManage: Boolean(data?.customerId),
    canChangeAddons: canChangeItems(data),
    plan: plan ? { key: plan, amountUsd: PLANS[plan]?.amountUsd ?? null } : null,
    addons: Object.fromEntries(Object.keys(ADDONS).map((key) => [key, {
      active: addons.includes(key),
      available: Boolean(addonsAvailable[key]),
      amountUsd: ADDONS[key].amountUsd,
    }])),
    monthlyTotalUsd: plan ? monthlyTotalUsd({ plan, addons }) : PLANS.basic.amountUsd,
    currentPeriodStart: data?.currentPeriodStart ?? null,
    currentPeriodEnd: data?.currentPeriodEnd ?? null,
    nextBilledAt: data?.nextBilledAt ?? null,
    cancelsAt: data?.scheduledChange?.action === 'cancel' ? data.scheduledChange.effectiveAt : null,
    canceledAt: data?.canceledAt ?? null,
  };
};
