import { create } from 'zustand';
import { api } from '../lib/api';

interface UserSettings {
  name: string;
  pronouns: string;
  autoLocation: boolean;
  location: string;
  timezone: string;
  country: string;
}

interface UserSettingsState extends UserSettings {
  isLoading: boolean;

  // Actions
  fetchSettings: () => Promise<void>;
  updateSettings: (updates: Partial<UserSettings>) => Promise<void>;
}

export const useUserSettingsStore = create<UserSettingsState>((set, get) => ({
  name: '',
  pronouns: '',
  autoLocation: false,
  location: '',
  timezone: '',
  country: '',
  isLoading: false,

  fetchSettings: async () => {
    set({ isLoading: true });
    try {
      const { data } = await api.get<UserSettings>('/user/settings');
      set({
        name: data.name,
        pronouns: data.pronouns,
        autoLocation: data.autoLocation,
        location: data.location,
        timezone: data.timezone,
        country: data.country,
      });
    } catch (err) {
      console.error('Failed to fetch user settings:', err);
    } finally {
      set({ isLoading: false });
    }
  },

  updateSettings: async updates => {
    // Optimistic update locally
    set(updates as Partial<UserSettingsState>);

    // When autoLocation is toggled ON — try GPS first, fall back to IP
    if (updates.autoLocation === true) {
      // Persist the toggle immediately
      await api.put('/user/settings', { autoLocation: true }).catch(() => {});

      const tryGPS = (): Promise<void> =>
        new Promise(resolve => {
          if (!navigator.geolocation) {
            resolve();
            return;
          }
          navigator.geolocation.getCurrentPosition(
            async pos => {
              try {
                const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
                const geoRes = await api.post<{
                  location: string;
                  timezone: string;
                  country: string;
                }>('/user/location-by-coords', {
                  lat: pos.coords.latitude,
                  lon: pos.coords.longitude,
                  timezone: tz,
                });
                set({
                  autoLocation: true,
                  location: geoRes.data.location,
                  timezone: geoRes.data.timezone || tz,
                  country: geoRes.data.country,
                });
              } catch {
                /* fall through to IP */
              }
              resolve();
            },
            async () => {
              // GPS denied — fall back to IP
              try {
                const geoRes = await api.post<{
                  location: string;
                  timezone: string;
                  country: string;
                }>('/user/refresh-location');
                set({
                  autoLocation: true,
                  location: geoRes.data.location,
                  timezone: geoRes.data.timezone,
                  country: geoRes.data.country,
                });
              } catch {
                /* best effort */
              }
              resolve();
            },
            { timeout: 8000 },
          );
        });

      set({ isLoading: true });
      await tryGPS();
      set({ isLoading: false });
      return;
    }

    // When autoLocation is toggled OFF — clear geo fields
    if (updates.autoLocation === false) {
      updates.location = '';
      set({ location: '', timezone: '', country: '' });
    }

    // Persist remaining updates to backend
    try {
      const { data } = await api.put<UserSettings>('/user/settings', updates);
      // Sync with server response
      set({
        name: data.name,
        pronouns: data.pronouns,
        autoLocation: data.autoLocation,
        location: data.location,
        timezone: data.timezone,
        country: data.country,
      });
    } catch (err) {
      console.error('Failed to update user settings:', err);
    }
  },
}));
