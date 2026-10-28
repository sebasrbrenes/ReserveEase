import { createContext, useContext, useMemo, useState } from 'react';
import { useLanguage } from '../../i18n/LanguageContext';

const BusinessContext = createContext(null);

// The demo business picked in the "Tu negocio" scene, in the visitor's language.
export function BusinessProvider({ children }) {
  const { t } = useLanguage();
  const [id, setId] = useState(t.businesses[0].id);
  const value = useMemo(() => ({
    business: t.businesses.find((b) => b.id === id) ?? t.businesses[0],
    businesses: t.businesses,
    setBusinessId: setId,
  }), [id, t]);
  return <BusinessContext.Provider value={value}>{children}</BusinessContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export const useBusiness = () => useContext(BusinessContext);
