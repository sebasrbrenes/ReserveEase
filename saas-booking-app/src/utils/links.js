// The landing hosts the privacy notice and the terms. Set VITE_LANDING_URL to the deployed landing.
export const LANDING_URL = (import.meta.env.VITE_LANDING_URL || 'https://reserve-ease-nwpq.vercel.app').replace(/\/+$/, '');
export const PRIVACY_URL = `${LANDING_URL}/privacy-policy`;
export const PRIVACY_URL_EN = `${LANDING_URL}/privacy-policy/en`;
export const TERMS_URL = `${LANDING_URL}/terms`;
