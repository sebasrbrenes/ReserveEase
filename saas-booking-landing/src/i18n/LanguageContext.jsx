import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import en from './en';
import es from './es';
import { initialLanguage, storeLanguage } from './language';
import { APP_URL } from '../config';

const COPY = { en, es };

const LanguageContext = createContext(null);

const setMeta = (name, content) => {
  const tag = document.querySelector(`meta[name="${name}"]`);
  if (tag) tag.setAttribute('content', content);
};

export function LanguageProvider({ children }) {
  const [language, setLanguageState] = useState(initialLanguage);
  const t = COPY[language];

  // The page's language attribute, title and description follow the choice.
  useEffect(() => {
    document.documentElement.lang = t.htmlLang;
    document.title = t.meta.title;
    setMeta('description', t.meta.description);
  }, [t]);

  const setLanguage = useCallback((next) => {
    if (!COPY[next]) return;
    storeLanguage(next);
    setLanguageState(next);
  }, []);

  const value = useMemo(() => ({
    language,
    setLanguage,
    t,
    // Prices in the visitor's currency and conventions (demo data only).
    money: (amount) => new Intl.NumberFormat(t.locale, { style: 'currency', currency: t.currency, maximumFractionDigits: 0 }).format(amount),
    // Links into the app open it in the same language.
    appLink: (path) => `${APP_URL}${path}?lang=${language}`,
  }), [language, setLanguage, t]);

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export const useLanguage = () => useContext(LanguageContext);
