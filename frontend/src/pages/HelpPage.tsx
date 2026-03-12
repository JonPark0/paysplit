import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { HelpCircle, ArrowLeft, Check } from 'lucide-react'

import Button from '../components/common/Button'
import { useSettingsStore } from '../stores/settingsStore'

interface HelpItem {
  question: string
  answer: string
}

interface HelpSection {
  id: string
  title: string
  items: HelpItem[]
}

const HelpPage = () => {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { language } = useSettingsStore()

  const sections = t('helpPage.sections', { returnObjects: true }) as HelpSection[]
  const supportTips = t('helpPage.supportTips', { returnObjects: true }) as string[]

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
            <h1 className="text-2xl font-bold text-neutral-900">{t('helpPage.title')}</h1>
            <div className="w-16" />
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="bg-white rounded-lg shadow-sm border border-neutral-200 p-6 mb-8">
          <div className="flex items-center mb-4">
            <div className="w-12 h-12 bg-primary-100 rounded-full flex items-center justify-center mr-4">
              <HelpCircle className="w-6 h-6 text-primary-600" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-neutral-900">{t('helpPage.introTitle')}</h2>
              <p className="text-neutral-600">{t('helpPage.introSubtitle')}</p>
            </div>
          </div>
          <p className="text-neutral-700 leading-relaxed">{t('helpPage.introBody')}</p>
        </div>

        <div className="space-y-6">
          {sections.map((section) => (
            <div key={section.id} className="bg-white rounded-lg shadow-sm border border-neutral-200">
              <div className="p-6 border-b border-neutral-200">
                <h3 className="text-lg font-semibold text-neutral-900">{section.title}</h3>
              </div>
              <div className="divide-y divide-neutral-200">
                {section.items.map((item, index) => (
                  <div key={index} className="p-6">
                    <h4 className="font-medium text-neutral-900 mb-2">{item.question}</h4>
                    <p className="text-neutral-700 leading-relaxed">{item.answer}</p>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="bg-primary-50 rounded-lg border border-primary-200 p-6 mt-8">
          <h3 className="text-lg font-semibold text-primary-900 mb-3">{t('helpPage.supportTitle')}</h3>
          <ul className="space-y-2 text-primary-800">
            {supportTips.map((tip, index) => (
              <li key={index} className="flex items-center">
                <Check className="w-4 h-4 mr-2" />
                <span>{tip}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-neutral-200 p-6 mt-6">
          <h3 className="text-lg font-semibold text-neutral-900 mb-4">{t('helpPage.quickStartTitle')}</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Button variant="outline" onClick={() => navigate(`/${language}`)}>
              {t('notFound.goHome')}
            </Button>
            <Button variant="outline" onClick={() => navigate(`/${language}/features`)}>
              {t('helpPage.viewFeatures')}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default HelpPage
