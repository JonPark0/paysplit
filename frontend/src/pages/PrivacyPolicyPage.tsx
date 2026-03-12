import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { Shield, ArrowLeft, CheckCircle } from 'lucide-react'

import Button from '../components/common/Button'

interface PolicySection {
  id: string
  title: string
  items: string[]
}

const PrivacyPolicyPage = () => {
  const { t } = useTranslation()
  const navigate = useNavigate()

  const sections = t('privacyPage.sections', { returnObjects: true }) as PolicySection[]

  return (
    <div className="min-h-screen bg-neutral-50">
      <div className="bg-white shadow-sm">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <Button
              variant="ghost"
              onClick={() => navigate(-1)}
              leftIcon={<ArrowLeft className="w-4 h-4" />}
              className="text-neutral-600 hover:text-neutral-900"
            >
              {t('common.back')}
            </Button>
            <h1 className="text-2xl font-bold text-neutral-900">{t('privacyPage.title')}</h1>
            <div className="w-16" />
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
        <div className="bg-white rounded-lg shadow-sm border border-neutral-200 p-6">
          <div className="flex items-center mb-4">
            <Shield className="w-6 h-6 text-primary-600 mr-3" />
            <h2 className="text-xl font-semibold text-neutral-900">{t('privacyPage.subtitle')}</h2>
          </div>
          <p className="text-sm text-neutral-600">{t('privacyPage.updatedAt')}</p>
          <p className="text-sm text-neutral-600">{t('privacyPage.scope')}</p>
        </div>

        {sections.map((section) => (
          <div key={section.id} className="bg-white rounded-lg shadow-sm border border-neutral-200 p-6">
            <h3 className="text-lg font-semibold text-neutral-900 mb-3">{section.title}</h3>
            <ul className="space-y-2 text-neutral-700">
              {section.items.map((item, index) => (
                <li key={index} className="flex items-start">
                  <CheckCircle className="w-4 h-4 text-primary-600 mr-2 mt-0.5 flex-shrink-0" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}

        <div className="pt-2">
          <Button onClick={() => navigate('/')}>
            {t('notFound.goHome')}
          </Button>
        </div>
      </div>
    </div>
  )
}

export default PrivacyPolicyPage
