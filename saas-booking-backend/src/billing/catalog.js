// What ReserveEase sells, in one place. Each plan or add-on is a key here and
// a Paddle price id in the environment; a subscription stores the price ids
// it holds, and what a business may use (its entitlements) is derived from
// them. A new plan or add-on is a new entry and a new variable, with no
// change to stored data.

export const PLANS = {
  basic: {
    // PADDLE_PRICE_ID is the name used before add-ons existed.
    priceEnv: ['PADDLE_PRICE_ID_BASIC', 'PADDLE_PRICE_ID'],
    amountUsd: 15,
    entitlements: { app: true, emailNotifications: true },
  },
};

export const ADDONS = {
  sms: {
    priceEnv: ['PADDLE_PRICE_ID_SMS'],
    amountUsd: 10,
    requiresPlan: 'basic',
    // Per billing cycle. More capacity is a future add-on, never an overage charge.
    entitlements: { smsPerCycle: 100 },
  },
};

const firstSet = (env, names) => names.map((n) => env[n]).find(Boolean) || '';

/** Price id of every plan and add-on, from the environment. */
export const catalogFromEnv = (env = process.env) => ({
  plans: Object.fromEntries(Object.entries(PLANS).map(([key, p]) => [key, { ...p, priceId: firstSet(env, p.priceEnv) }])),
  addons: Object.fromEntries(Object.entries(ADDONS).map(([key, a]) => [key, { ...a, priceId: firstSet(env, a.priceEnv) }])),
});

/**
 * Which plan and add-ons a list of Paddle price ids stands for.
 * Unknown prices are ignored, so a price created in Paddle by mistake grants nothing.
 */
export const resolveItems = (priceIds, catalog = catalogFromEnv()) => {
  const has = (priceId) => Boolean(priceId) && priceIds.includes(priceId);
  const plan = Object.entries(catalog.plans).find(([, p]) => has(p.priceId))?.[0] ?? null;
  const addons = Object.entries(catalog.addons)
    .filter(([, a]) => has(a.priceId) && (!a.requiresPlan || a.requiresPlan === plan))
    .map(([key]) => key);
  return { plan, addons };
};

/** Monthly total in USD for a plan and its add-ons. */
export const monthlyTotalUsd = ({ plan, addons }) => (plan ? PLANS[plan].amountUsd : 0)
  + addons.reduce((sum, key) => sum + (ADDONS[key]?.amountUsd ?? 0), 0);
