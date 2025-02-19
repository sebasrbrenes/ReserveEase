import { createContext, useContext, useState, useEffect } from 'react';
import { db, auth } from '../firebase/config';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { useAuthState } from 'react-firebase-hooks/auth';
import { toast } from 'react-hot-toast';

const DAYS_OF_WEEK = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

const SettingsContext = createContext();

export const useSettings = () => {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
};

const defaultSettings = {
  business: {
    name: '',
    email: '',
    phone: '',
    address: '',
    services: [],
    staff: [],
    allowStaffPreference: true,
    timeInterval: 30  // Time interval in minutes for appointment slots
  },
  businessHours: DAYS_OF_WEEK.reduce((acc, day) => ({
    ...acc,
    [day]: { start: '9:00 AM', end: '5:00 PM', enabled: true }
  }), {}),
  ui: {
    language: 'en',
    notifications: true
  }
};

export const SettingsProvider = ({ children }) => {
  const [user] = useAuthState(auth);
  const [settings, setSettings] = useState(defaultSettings);

  useEffect(() => {
    const loadSettings = async () => {
      if (!user) {
        setSettings(defaultSettings);
        return;
      }

      try {
        const userSettingsRef = doc(db, 'users', user.uid, 'settings', 'business');
        const settingsDoc = await getDoc(userSettingsRef);

        if (settingsDoc.exists()) {
          const data = settingsDoc.data();
          // Ensure all required fields exist with defaults
          setSettings({
            ...defaultSettings,
            ...data,
            business: {
              ...defaultSettings.business,
              ...(data.business || {})
            },
            businessHours: {
              ...defaultSettings.businessHours,
              ...(data.businessHours || {})
            },
            ui: {
              ...defaultSettings.ui,
              ...(data.ui || {})
            }
          });
        } else {
          await setDoc(userSettingsRef, defaultSettings);
          setSettings(defaultSettings);
        }
      } catch (error) {
        console.error('Error loading settings:', error);
        toast.error('Failed to load settings');
      }
    };

    loadSettings();
  }, [user]);

  const updateSettings = async (newSettings) => {
    if (!user) return;

    try {
      // Merge the new settings with existing settings to ensure we don't lose any data
      const mergedSettings = {
        ...settings,
        ...newSettings,
        business: {
          ...settings.business,
          ...(newSettings.business || {}),
          services: newSettings.business?.services || settings.business.services,
          staff: newSettings.business?.staff || settings.business.staff
        },
        businessHours: {
          ...settings.businessHours,
          ...(newSettings.businessHours || {})
        },
        ui: {
          ...settings.ui,
          ...(newSettings.ui || {})
        }
      };

      // Save to Firestore
      const userSettingsRef = doc(db, 'users', user.uid, 'settings', 'business');
      await setDoc(userSettingsRef, mergedSettings);
      
      // Update local state
      setSettings(mergedSettings);
    } catch (error) {
      console.error('Error updating settings:', error);
      throw error; // Re-throw to handle in the component
    }
  };

  return (
    <SettingsContext.Provider value={{ settings, updateSettings }}>
      {children}
    </SettingsContext.Provider>
  );
};
