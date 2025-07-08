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
        이 사이트는 reCAPTCHA로 보호되며 Google의{' '}
        <a 
          href="https://policies.google.com/privacy" 
          target="_blank" 
          rel="noopener noreferrer"
          className="text-primary-600 hover:underline"
        >
          개인정보처리방침
        </a>
        {' '}및{' '}
        <a 
          href="https://policies.google.com/terms" 
          target="_blank" 
          rel="noopener noreferrer"
          className="text-primary-600 hover:underline"
        >
          서비스약관
        </a>
        이 적용됩니다.
      </span>
    </div>
  )
}

export default RecaptchaInfo