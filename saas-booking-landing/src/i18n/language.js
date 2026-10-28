// The visitor's language. English is the default; a choice made with the
// EN/ES switch (or ?lang= in a link) is kept in this browser for next visits.
export const LANGUAGES = ['en', 'es'];
export const DEFAULT_LANGUAGE = 'en';
const STORAGE_KEY = 'reserveease.language';

const known = (value) => (LANGUAGES.includes(value) ? value : null);

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
