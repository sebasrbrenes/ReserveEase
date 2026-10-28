// Where "Sign in" and "Create account" go. Set VITE_APP_URL (e.g. in Vercel) to the deployed app's URL.
export const APP_URL = (import.meta.env.VITE_APP_URL || 'https://app.reserveease.com').replace(/\/+$/, '');

// Address shown on the legal pages and the footer. Set VITE_CONTACT_EMAIL to a mailbox you read.
export const CONTACT_EMAIL = import.meta.env.VITE_CONTACT_EMAIL || 'contact@reservease.com';
