import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { db, auth } from '../firebase/config';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { syncMyBusiness } from '../services/api';
import { useAuthState } from 'react-firebase-hooks/auth';
import { toast } from 'react-hot-toast';
import { getUiLanguage } from '../i18n/language';
import { uiCopy } from '../i18n/copy';

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
    timeInterval: 30,  // Time interval in minutes for appointment slots
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    currency: 'USD'
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
  // The business as the booking API sees it (id, public slug, publish status),
  // rebuilt by the server from these settings after each load and save.
  const [business, setBusiness] = useState({ loading: true, data: null, error: null });

  const refreshBusiness = useCallback(async () => {
    if (!auth.currentUser) return null;
    try {
      const data = await syncMyBusiness();
      setBusiness({ loading: false, data, error: null });
      return data;
    } catch (error) {
      console.error('Error syncing business:', error);
      setBusiness((prev) => ({ loading: false, data: prev.data, error }));
      return null;
    }
  }, []);

  useEffect(() => {
    const loadSettings = async () => {
      if (!user) {
        setSettings(defaultSettings);
        setBusiness({ loading: false, data: null, error: null });
        return;
      }
      setBusiness((prev) => ({ ...prev, loading: true }));

      try {
        const userSettingsRef = doc(db, 'users', user.uid, 'settings', 'business');
        const settingsDoc = await getDoc(userSettingsRef);

        if (settingsDoc.exists()) {
          const data = settingsDoc.data();
          // Accounts created before time zone and currency existed get the defaults once.
          if (!data.business?.timezone || !data.business?.currency) {
            data.business = {
              ...data.business,
              timezone: data.business?.timezone || defaultSettings.business.timezone,
              currency: data.business?.currency || defaultSettings.business.currency,
            };
            await setDoc(userSettingsRef, { business: data.business }, { merge: true });
          }
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
          // A new business starts with its booking pages and client emails in
          // the language its owner signed up in.
          const language = getUiLanguage();
          const initial = {
            ...defaultSettings,
            business: { ...defaultSettings.business, language },
            ui: { ...defaultSettings.ui, language },
          };
          await setDoc(userSettingsRef, initial);
          setSettings(initial);
        }
        await refreshBusiness();
      } catch (error) {
        console.error('Error loading settings:', error);
        toast.error(uiCopy().settingsLoadFailed);
        setBusiness((prev) => ({ ...prev, loading: false, error }));
      }
    };

    loadSettings();
  }, [user, refreshBusiness]);

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
      await refreshBusiness();
    } catch (error) {
      console.error('Error updating settings:', error);
      throw error; // Re-throw to handle in the component
    }
  };

  return (
    <SettingsContext.Provider value={{ settings, updateSettings, business, refreshBusiness }}>
      {children}
    </SettingsContext.Provider>
  );
};
