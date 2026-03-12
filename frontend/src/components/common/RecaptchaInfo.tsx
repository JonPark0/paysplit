import { useTranslation } from 'react-i18next'
import { Shield } from 'lucide-react'

/**
 * Small informational component about reCAPTCHA protection
 * Shows users that the form is protected by reCAPTCHA V3
 */
const RecaptchaInfo = ({ className = '' }) => {
  const { t } = useTranslation()

  // Don't show if reCAPTCHA is not configured
  if (!import.meta.env.VITE_RECAPTCHA_SITE_KEY) {
    return null
  }

  return (
    <div className={`flex items-center text-xs text-neutral-500 ${className}`}>
      <Shield className="w-3 h-3 mr-1" />
      <span>
        {t('recaptcha.noticePrefix')}{' '}
        <a 
          href="https://policies.google.com/privacy" 
          target="_blank" 
          rel="noopener noreferrer"
          className="text-primary-600 hover:underline"
        >
          {t('recaptcha.privacy')}
        </a>
        {' '}{t('recaptcha.and')}{' '}
        <a 
          href="https://policies.google.com/terms" 
          target="_blank" 
          rel="noopener noreferrer"
          className="text-primary-600 hover:underline"
        >
          {t('recaptcha.terms')}
        </a>
        {t('recaptcha.noticeSuffix')}
      </span>
    </div>
  )
}

export default RecaptchaInfo
