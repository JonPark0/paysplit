import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { Home, ArrowLeft } from 'lucide-react'
import Button from '../components/common/Button'
import { useSettingsStore } from '../stores/settingsStore'

const NotFoundPage = () => {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { language } = useSettingsStore()

  const handleGoHome = () => {
    navigate(`/${language}`)
  }

  const handleGoBack = () => {
    navigate(-1)
  }

  return (
    <div className="min-h-screen bg-neutral-50 flex items-center justify-center px-4">
      <div className="text-center max-w-md mx-auto">
        {/* 404 Illustration */}
        <div className="mb-8">
          <div className="text-9xl font-bold text-neutral-200 mb-4">404</div>
          <div className="w-24 h-24 bg-primary-100 rounded-full flex items-center justify-center mx-auto">
            <div className="text-4xl">🤔</div>
          </div>
        </div>

        {/* Content */}
        <h1 className="text-2xl font-bold text-neutral-900 mb-4">
          {t('notFound.title')}
        </h1>
        <p className="text-neutral-600 mb-8">
          {t('notFound.description')}
        </p>

        {/* Actions */}
        <div className="space-y-3">
          <Button
            onClick={handleGoHome}
            fullWidth
            leftIcon={<Home className="w-4 h-4" />}
          >
            {t('notFound.goHome')}
          </Button>
          <Button
            onClick={handleGoBack}
            variant="outline"
            fullWidth
            leftIcon={<ArrowLeft className="w-4 h-4" />}
          >
            {t('notFound.goBack')}
          </Button>
        </div>

        {/* Help */}
        <div className="mt-12 p-4 bg-neutral-100 rounded-lg">
          <p className="text-sm text-neutral-600">
            {t('notFound.helpLine1')}
            <br />
            {t('notFound.helpLine2')}
          </p>
        </div>
      </div>
    </div>
  )
}

export default NotFoundPage
