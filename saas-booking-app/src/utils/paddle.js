// Loads Paddle.js (the checkout overlay) only when the owner opens it, so no
// page pays for it otherwise. VITE_PADDLE_CLIENT_TOKEN is a public client-side
// token; it can only open checkouts that the server already created.

const CLIENT_TOKEN = import.meta.env.VITE_PADDLE_CLIENT_TOKEN || '';
const SCRIPT_URL = 'https://cdn.paddle.com/paddle/v2/paddle.js';

export const isPaddleReady = Boolean(CLIENT_TOKEN);

let loading;
let onEvent = () => {};

const loadScript = () => {
  loading ??= new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = SCRIPT_URL;
    script.async = true;
    script.onload = () => resolve(window.Paddle);
    script.onerror = () => {
      loading = undefined;
      reject(new Error('Paddle.js did not load'));
    };
    document.head.appendChild(script);
  });
  return loading;
};

/**
 * Opens the checkout for a transaction the server created.
 * @param {{ transactionId: string, environment: 'sandbox'|'production', email?: string, onEvent?: Function }} options
 */
export const openCheckout = async ({ transactionId, environment, email, onEvent: handler }) => {
  const Paddle = await loadScript();
  onEvent = handler || (() => {});
  if (!Paddle.Initialized) {
    if (environment === 'sandbox') Paddle.Environment.set('sandbox');
    Paddle.Initialize({ token: CLIENT_TOKEN, eventCallback: (event) => onEvent(event) });
  }
  Paddle.Checkout.open({
    transactionId,
    ...(email ? { customer: { email } } : {}),
    settings: { displayMode: 'overlay', locale: 'es', theme: 'light' },
  });
};
