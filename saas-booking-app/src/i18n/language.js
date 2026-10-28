// The language of the interface for the business owner (sign-up, sign-in,
// dashboard, settings). English is the default; a choice made with the EN/ES
// switch, or the landing's ?lang= link, is kept in this browser.
// The client pages follow the business's choice instead (clientCopy.js).
import dayjs from 'dayjs';
import 'dayjs/locale/es';
import { setDefaultLocale } from 'react-datepicker';
import { auth } from '../firebase/config';
import { localeFor, setUiLocale } from '../utils/datetime';

export const LANGUAGES = ['en', 'es'];
export const DEFAULT_LANGUAGE = 'en';
const STORAGE_KEY = 'reserveease.language';

const known = (value) => (LANGUAGES.includes(value) ? value : null);

let current = DEFAULT_LANGUAGE;
export const getUiLanguage = () => current;

export const storeLanguage = (language) => {
  try {
    localStorage.setItem(STORAGE_KEY, language);
  } catch {
    // Private mode or blocked storage: the choice lasts for this visit only.
  }
};

export const initialLanguage = () => {
  const fromLink = known(new URLSearchParams(window.location.search).get('lang'));
  if (fromLink) {
    storeLanguage(fromLink);
    return fromLink;
  }
  try {
    return known(localStorage.getItem(STORAGE_KEY)) || DEFAULT_LANGUAGE;
  } catch {
    return DEFAULT_LANGUAGE;
  }
};

// Everything outside React that depends on the language: the page's lang
// attribute, month and day names, number and date formats, and the
// verification and password reset emails Firebase sends.
export const applyLanguage = (language) => {
  current = known(language) || DEFAULT_LANGUAGE;
  document.documentElement.lang = current === 'en' ? 'en-US' : 'es';
  dayjs.locale(current);
  setDefaultLocale(current);
  setUiLocale(localeFor(current));
  auth.languageCode = current;
};
