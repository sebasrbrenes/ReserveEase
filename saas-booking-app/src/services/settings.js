import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase/config';

// Local Storage Keys
const LOCAL_SETTINGS_KEY = 'bookingApp_settings';

// Default settings
const DEFAULT_SETTINGS = {
  // Business settings (stored in Firestore)
  business: {
    name: '',
    email: '',
    phone: '',
    address: '',
    workingHours: {
      monday: { start: '09:00', end: '17:00', isOpen: true },
      tuesday: { start: '09:00', end: '17:00', isOpen: true },
      wednesday: { start: '09:00', end: '17:00', isOpen: true },
      thursday: { start: '09:00', end: '17:00', isOpen: true },
      friday: { start: '09:00', end: '17:00', isOpen: true },
      saturday: { start: '09:00', end: '13:00', isOpen: true },
      sunday: { start: '09:00', end: '13:00', isOpen: false },
    },
    services: [
      { id: '1', name: 'Haircut', duration: 30, price: 30 },
      { id: '2', name: 'Beard Trim', duration: 15, price: 20 },
      { id: '3', name: 'Hair Color', duration: 60, price: 60 },
    ],
    staff: [
      { id: '1', name: 'Default Staff', services: ['1', '2', '3'] }
    ]
  },
  // UI settings (stored in localStorage)
  ui: {
    theme: 'dark',
    language: 'en',
    notifications: true,
    defaultView: 'week'
  }
};

class SettingsService {
  constructor() {
    this.settings = DEFAULT_SETTINGS;
    this.loadLocalSettings();
  }

  // Load settings from localStorage
  loadLocalSettings() {
    try {
      const savedSettings = localStorage.getItem(LOCAL_SETTINGS_KEY);
      if (savedSettings) {
        this.settings.ui = { ...this.settings.ui, ...JSON.parse(savedSettings) };
      }
    } catch (error) {
      console.error('Error loading local settings:', error);
    }
  }

  // Save UI settings to localStorage
  saveLocalSettings(settings) {
    try {
      localStorage.setItem(LOCAL_SETTINGS_KEY, JSON.stringify(settings));
      this.settings.ui = settings;
    } catch (error) {
      console.error('Error saving local settings:', error);
    }
  }

  // Load business settings from Firestore
  async loadBusinessSettings(userId) {
    try {
      const docRef = doc(db, 'users', userId);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        const data = docSnap.data();
        this.settings.business = { ...this.settings.business, ...data.settings };
        return this.settings.business;
      } else {
        // If no settings exist, create default ones
        await this.saveBusinessSettings(userId, this.settings.business);
        return this.settings.business;
      }
    } catch (error) {
      console.error('Error loading business settings:', error);
      return this.settings.business;
    }
  }

  // Save business settings to Firestore
  async saveBusinessSettings(userId, settings) {
    try {
      const docRef = doc(db, 'users', userId);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        await updateDoc(docRef, { settings });
      } else {
        await setDoc(docRef, { settings });
      }
      
      this.settings.business = settings;
      return settings;
    } catch (error) {
      console.error('Error saving business settings:', error);
      throw error;
    }
  }

  // Get all settings
  getSettings() {
    return this.settings;
  }

  // Get UI settings
  getUISettings() {
    return this.settings.ui;
  }

  // Get business settings
  getBusinessSettings() {
    return this.settings.business;
  }
}

export const settingsService = new SettingsService();
