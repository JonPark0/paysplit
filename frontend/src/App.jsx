import { Routes, Route, Navigate, Outlet } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { useTranslation } from 'react-i18next'
import { useEffect } from 'react'

// Layout components
import Header from './components/common/Header'
import Footer from './components/common/Footer'

// Page components
import HomePage from './pages/HomePage'
import RoomPage from './pages/RoomPage'
import JoinPage from './pages/JoinPage'
import FeaturesPage from './pages/FeaturesPage'
import HelpPage from './pages/HelpPage'
import PrivacyPolicyPage from './pages/PrivacyPolicyPage'
import TermsOfServicePage from './pages/TermsOfServicePage'
import NotFoundPage from './pages/NotFoundPage'

// Stores
import { useSettingsStore } from './stores/settingsStore'

function App() {
  const { i18n } = useTranslation()
  const { language, setLanguage } = useSettingsStore()

  useEffect(() => {
    // Set language from URL or store
    const pathLang = window.location.pathname.split('/')[1]
    if (pathLang === 'ko' || pathLang === 'en') {
      if (pathLang !== language) {
        setLanguage(pathLang)
      }
    } else {
      // Redirect to language-specific URL
      const newPath = `/${language}${window.location.pathname}`
      window.history.replaceState(null, '', newPath)
    }
    
    i18n.changeLanguage(language)
    document.documentElement.lang = language
  }, [language, setLanguage, i18n])

  return (
    <div className="min-h-screen flex flex-col bg-neutral-50">
      {/* Header */}
      <Header />
      
      {/* Main content */}
      <main className="flex-1 safe-top safe-bottom">
        <Routes>
          {/* Language-prefixed routes */}
          <Route path="/:lang" element={<LanguageRouter />}>
            <Route index element={<HomePage />} />
            <Route path="features" element={<FeaturesPage />} />
            <Route path="help" element={<HelpPage />} />
            <Route path="privacy" element={<PrivacyPolicyPage />} />
            <Route path="terms" element={<TermsOfServicePage />} />
            <Route path="room/:roomId" element={<RoomPage />} />
          </Route>
          
          {/* Join room route (language-independent) */}
          <Route path="/join/:roomId" element={<JoinPage />} />
          
          {/* Legacy room routes (redirect to Korean) */}
          <Route path="/room/:roomId" element={<Navigate to={`/ko/room/${window.location.pathname.split('/')[2]}`} replace />} />
          
          {/* Root redirect to Korean */}
          <Route path="/" element={<Navigate to="/ko" replace />} />
          
          {/* 404 page */}
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </main>
      
      {/* Footer */}
      <Footer />
      
      {/* Toast notifications */}
      <Toaster
        position="top-center"
        toastOptions={{
          duration: 4000,
          style: {
            background: '#fff',
            color: '#374151',
            border: '1px solid #e5e7eb',
            borderRadius: '0.75rem',
            padding: '12px 16px',
            fontSize: '14px',
            fontWeight: '500',
            boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
          },
          success: {
            style: {
              background: '#ecfdf5',
              color: '#065f46',
              border: '1px solid #a7f3d0',
            },
          },
          error: {
            style: {
              background: '#fef2f2',
              color: '#7f1d1d',
              border: '1px solid #fecaca',
            },
          },
        }}
      />
    </div>
  )
}

// Language router component to handle language-specific routes
function LanguageRouter() {
  const { setLanguage } = useSettingsStore()
  const { i18n } = useTranslation()
  
  useEffect(() => {
    const pathLang = window.location.pathname.split('/')[1]
    if (pathLang === 'ko' || pathLang === 'en') {
      setLanguage(pathLang)
      i18n.changeLanguage(pathLang)
      document.documentElement.lang = pathLang
    }
  }, [setLanguage, i18n])

  return <Outlet />
}

export default App