import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import LanguageDetector from 'i18next-browser-languagedetector'

// Import translations
import ko from '../locales/ko.json'
import en from '../locales/en.json'

const resources = {
  ko: {
    translation: ko
  },
  en: {
    translation: en
  }
}

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'ko',
    debug: false,
    
    interpolation: {
      escapeValue: false, // React already does escaping
    },
    
    detection: {
      order: ['path', 'localStorage', 'navigator', 'htmlTag'],
      lookupFromPathIndex: 0
    },

    supportedLngs: ['ko', 'en'],
    
    react: {
      useSuspense: false
    }
  })

export default i18n
