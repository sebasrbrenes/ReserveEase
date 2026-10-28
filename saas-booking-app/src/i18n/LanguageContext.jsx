import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { COPY } from './copy';
import { applyLanguage, getUiLanguage, storeLanguage } from './language';
import { localeFor } from '../utils/datetime';

const LanguageContext = createContext(null);

// main.jsx applies the starting language before the first render.
export function LanguageProvider({ children }) {
  const [language, setLanguageState] = useState(getUiLanguage);

  const setLanguage = useCallback((next) => {
    if (!COPY[next]) return;
    storeLanguage(next);
    applyLanguage(next);
    setLanguageState(next);
  }, []);

  const value = useMemo(() => ({
    language, setLanguage, t: COPY[language], locale: localeFor(language),
  }), [language, setLanguage]);

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export const useLanguage = () => useContext(LanguageContext);

// The client pages are in the business's language: the page says so while it is open.
// eslint-disable-next-line react-refresh/only-export-components
export const useDocumentLanguage = (language) => {
  useEffect(() => {
    const previous = document.documentElement.lang;
    document.documentElement.lang = language === 'en' ? 'en-US' : 'es';
    return () => { document.documentElement.lang = previous; };
  }, [language]);
};
