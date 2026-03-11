import { create } from 'zustand'
import { persist } from 'zustand/middleware'

type Language = 'ko' | 'en'
type Theme = 'light' | 'dark'

interface Preferences {
  currency: string
  notifications: boolean
  autoCalculate: boolean
  showTutorial: boolean
}

interface SettingsStoreState {
  language: Language
  setLanguage: (language: Language) => void
  theme: Theme
  setTheme: (theme: Theme) => void
  preferences: Preferences
  setPreference: <K extends keyof Preferences>(key: K, value: Preferences[K]) => void
  pwaInstalled: boolean
  setPwaInstalled: (installed: boolean) => void
  reset: () => void
}

const defaultPreferences: Preferences = {
  currency: 'KRW',
  notifications: true,
  autoCalculate: true,
  showTutorial: true
}

const useSettingsStore = create<SettingsStoreState>()(
  persist(
    (set) => ({
      language: 'ko',
      setLanguage: (language) => set({ language }),
      theme: 'light',
      setTheme: (theme) => set({ theme }),
      preferences: { ...defaultPreferences },
      setPreference: (key, value) => set((state) => ({
        preferences: {
          ...state.preferences,
          [key]: value
        }
      })),
      pwaInstalled: false,
      setPwaInstalled: (installed) => set({ pwaInstalled: installed }),
      reset: () => set({
        language: 'ko',
        theme: 'light',
        preferences: { ...defaultPreferences },
        pwaInstalled: false
      })
    }),
    {
      name: 'paysplit-settings',
      version: 1
    }
  )
)

export { useSettingsStore }
