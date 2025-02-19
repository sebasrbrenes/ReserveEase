import { createContext, useContext } from 'react';

const TimeContext = createContext();

export const useTime = () => {
  const context = useContext(TimeContext);
  if (!context) {
    throw new Error('useTime must be used within a TimeProvider');
  }
  return context;
};

export const TimeProvider = ({ children, currentTime }) => {
  // Parse the ISO string into a Date object
  const currentDate = new Date(currentTime);

  return (
    <TimeContext.Provider value={{ currentDate, currentTime }}>
      {children}
    </TimeContext.Provider>
  );
};
