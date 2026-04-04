import { create } from 'zustand';
import { api } from '../lib/api';

interface UserSettingsState {
  name: string;
  pronouns: string;
  autoLocation: boolean;
  location: string;
  isLoading: boolean;
  
  // Actions
  fetchSettings: () => Promise<void>;
  updateSettings: (updates: Partial<{ name: string; pronouns: string; autoLocation: boolean; location: string }>) => Promise<void>;
}

export const useUserSettingsStore = create<UserSettingsState>((set, get) => ({
  name: '',
  pronouns: '',
  autoLocation: false,
  location: '',
  isLoading: false,

  fetchSettings: async () => {
    set({ isLoading: true });
    try {
      const { data } = await api.get('/user/settings');
      set({ ...data });
    } catch (err) {
      console.error('Failed to fetch user settings:', err);
    } finally {
      set({ isLoading: false });
    }
  },

  updateSettings: async (updates) => {
    // Optimistic update locally
    set({ ...updates });

    // Handle autoLocation logic if it was just toggled ON
    if (updates.autoLocation) {
      try {
        const response = await fetch('https://ipapi.co/json/');
        const locationData = await response.json();
        
        if (locationData.city && locationData.region) {
          const locationString = `${locationData.city}, ${locationData.region}`;
          updates.location = locationString;
          set({ location: locationString });
        }
      } catch (err) {
        console.warn('Failed to auto-detect location by IP:', err);
      }
    } else if (updates.autoLocation === false) {
      // Clear location if autoLocation is toggled OFF
      updates.location = '';
      set({ location: '' });
    }

    // Persist to backend
    try {
      await api.put('/user/settings', updates);
    } catch (err) {
      console.error('Failed to update user settings:', err);
      // We don't rollback optimistic updates currently to keep UI smooth,
      // but in a production app we would handle errors and retries.
    }
  }
}));
