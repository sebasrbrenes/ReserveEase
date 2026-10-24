import { createContext, useContext, useMemo, useState } from 'react';
import { BUSINESSES } from './demo';

const BusinessContext = createContext(null);

export function BusinessProvider({ children }) {
  const [id, setId] = useState(BUSINESSES[0].id);
  const value = useMemo(() => ({
    business: BUSINESSES.find((b) => b.id === id),
    setBusinessId: setId,
  }), [id]);
  return <BusinessContext.Provider value={value}>{children}</BusinessContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export const useBusiness = () => useContext(BusinessContext);
