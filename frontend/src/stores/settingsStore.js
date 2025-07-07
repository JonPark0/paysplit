import { create } from 'zustand'
import { persist } from 'zustand/middleware'

const useSettingsStore = create(
  persist(
    (set, get) => ({
      // Language settings
      language: 'ko',
      setLanguage: (language) => set({ language }),

      // Theme settings (for future use)
      theme: 'light',
      setTheme: (theme) => set({ theme }),

      // User preferences
      preferences: {
        currency: 'KRW',
        notifications: true,
        autoCalculate: true,
        showTutorial: true,
      },
      setPreference: (key, value) => set((state) => ({
        preferences: {
          ...state.preferences,
          [key]: value
        }
      })),

      // PWA settings
      pwaInstalled: false,
      setPwaInstalled: (installed) => set({ pwaInstalled: installed }),

      // Reset all settings
      reset: () => set({
        language: 'ko',
        theme: 'light',
        preferences: {
          currency: 'KRW',
          notifications: true,
          autoCalculate: true,
          showTutorial: true,
        },
        pwaInstalled: false,
      }),
    }),
    {
      name: 'paysplit-settings',
      version: 1,
    }
  )
)

export { useSettingsStore }