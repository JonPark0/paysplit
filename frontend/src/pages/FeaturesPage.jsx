import React from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { 
  Camera, 
  Brain, 
  Calculator, 
  Users, 
  Shield, 
  Lock, 
  Zap,
  CheckCircle,
  ArrowRight,
  Sparkles,
  Cpu,
  Eye,
  UserCheck,
  FileText,
  CreditCard,
  RefreshCw
} from 'lucide-react'

import Button from '../components/common/Button'
import { useSettingsStore } from '../stores/settingsStore'

const FeaturesPage = () => {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { language } = useSettingsStore()

  const features = [
    {
      icon: <Brain className="w-8 h-8" />,
      title: t('features.aiOcr.title'),
      subtitle: t('features.aiOcr.subtitle'),
      description: t('features.aiOcr.description'),
      highlights: [
        t('features.aiOcr.highlights.accuracy'),
        t('features.aiOcr.highlights.speed'),
        t('features.aiOcr.highlights.languages'),
        t('features.aiOcr.highlights.adaptation')
      ],
      color: 'from-blue-500 to-purple-600',
      bgColor: 'bg-blue-50',
      textColor: 'text-blue-600'
    },
    {
      icon: <Calculator className="w-8 h-8" />,
      title: t('features.smartSplit.title'),
      subtitle: t('features.smartSplit.subtitle'),
      description: t('features.smartSplit.description'),
      highlights: [
        t('features.smartSplit.highlights.optimal'),
        t('features.smartSplit.highlights.flexible'),
        t('features.smartSplit.highlights.automatic'),
        t('features.smartSplit.highlights.transparent')
      ],
      color: 'from-green-500 to-teal-600',
      bgColor: 'bg-green-50',
      textColor: 'text-green-600'
    },
    {
      icon: <Shield className="w-8 h-8" />,
      title: t('features.security.title'),
      subtitle: t('features.security.subtitle'),
      description: t('features.security.description'),
      highlights: [
        t('features.security.highlights.encryption'),
        t('features.security.highlights.authentication'),
        t('features.security.highlights.privacy'),
        t('features.security.highlights.compliance')
      ],
      color: 'from-red-500 to-orange-600',
      bgColor: 'bg-red-50',
      textColor: 'text-red-600'
    }
  ]

  const technicalFeatures = [
    {
      icon: <Cpu className="w-6 h-6" />,
      title: t('features.technical.realtime.title'),
      description: t('features.technical.realtime.description')
    },
    {
      icon: <Eye className="w-6 h-6" />,
      title: t('features.technical.transparency.title'),
      description: t('features.technical.transparency.description')
    },
    {
      icon: <UserCheck className="w-6 h-6" />,
      title: t('features.technical.collaboration.title'),
      description: t('features.technical.collaboration.description')
    },
    {
      icon: <FileText className="w-6 h-6" />,
      title: t('features.technical.audit.title'),
      description: t('features.technical.audit.description')
    },
    {
      icon: <CreditCard className="w-6 h-6" />,
      title: t('features.technical.settlement.title'),
      description: t('features.technical.settlement.description')
    },
    {
      icon: <RefreshCw className="w-6 h-6" />,
      title: t('features.technical.backup.title'),
      description: t('features.technical.backup.description')
    }
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-neutral-50 to-neutral-100">
      {/* Hero Section */}
      <div className="relative overflow-hidden bg-gradient-to-r from-primary-600 to-primary-800">
        <div className="absolute inset-0 bg-black/10"></div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
          <div className="text-center">
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white mb-6">
              {t('features.hero.title')}
            </h1>
            <p className="text-xl text-primary-100 mb-8 max-w-3xl mx-auto">
              {t('features.hero.subtitle')}
            </p>
            <div className="flex justify-center space-x-4">
              <Button
                size="lg"
                variant="secondary"
                onClick={() => navigate(`/${language}`)}
                rightIcon={<ArrowRight className="w-5 h-5" />}
              >
                {t('features.hero.tryNow')}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Features */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold text-neutral-900 mb-4">
            {t('features.main.title')}
          </h2>
          <p className="text-xl text-neutral-600 max-w-3xl mx-auto">
            {t('features.main.subtitle')}
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <div key={index} className="relative">
              <div className="bg-white rounded-2xl shadow-lg overflow-hidden hover:shadow-xl transition-shadow duration-300">
                {/* Header */}
                <div className={`${feature.bgColor} p-6`}>
                  <div className={`inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-r ${feature.color} text-white mb-4`}>
                    {feature.icon}
                  </div>
                  <h3 className="text-xl font-bold text-neutral-900 mb-2">
                    {feature.title}
                  </h3>
                  <p className={`text-sm font-medium ${feature.textColor}`}>
                    {feature.subtitle}
                  </p>
                </div>

                {/* Content */}
                <div className="p-6">
                  <p className="text-neutral-600 mb-6">
                    {feature.description}
                  </p>

                  {/* Highlights */}
                  <div className="space-y-3">
                    {feature.highlights.map((highlight, highlightIndex) => (
                      <div key={highlightIndex} className="flex items-start space-x-3">
                        <CheckCircle className={`w-5 h-5 ${feature.textColor} mt-0.5 flex-shrink-0`} />
                        <span className="text-sm text-neutral-700">{highlight}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Technical Features */}
      <div className="bg-white py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-neutral-900 mb-4">
              {t('features.technical.title')}
            </h2>
            <p className="text-xl text-neutral-600 max-w-3xl mx-auto">
              {t('features.technical.subtitle')}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {technicalFeatures.map((feature, index) => (
              <div key={index} className="flex items-start space-x-4 p-6 bg-neutral-50 rounded-xl hover:bg-neutral-100 transition-colors">
                <div className="flex-shrink-0 w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center">
                  <div className="text-primary-600">
                    {feature.icon}
                  </div>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-neutral-900 mb-2">
                    {feature.title}
                  </h3>
                  <p className="text-neutral-600 text-sm">
                    {feature.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* AI Spotlight */}
      <div className="bg-gradient-to-r from-primary-600 to-primary-800 py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-white/10 text-white mb-6">
              <Sparkles className="w-10 h-10" />
            </div>
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-6">
              {t('features.ai.title')}
            </h2>
            <p className="text-xl text-primary-100 mb-8 max-w-3xl mx-auto">
              {t('features.ai.description')}
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 mt-12">
              {[
                { icon: <Camera className="w-8 h-8" />, title: t('features.ai.benefits.scanning') },
                { icon: <Brain className="w-8 h-8" />, title: t('features.ai.benefits.learning') },
                { icon: <Zap className="w-8 h-8" />, title: t('features.ai.benefits.speed') },
                { icon: <Users className="w-8 h-8" />, title: t('features.ai.benefits.experience') }
              ].map((benefit, index) => (
                <div key={index} className="text-center">
                  <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-white/10 text-white mb-4">
                    {benefit.icon}
                  </div>
                  <h3 className="text-lg font-semibold text-white">
                    {benefit.title}
                  </h3>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="bg-neutral-900 py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold text-white mb-4">
            {t('features.cta.title')}
          </h2>
          <p className="text-xl text-neutral-300 mb-8">
            {t('features.cta.subtitle')}
          </p>
          <Button
            size="lg"
            onClick={() => navigate(`/${language}`)}
            rightIcon={<ArrowRight className="w-5 h-5" />}
          >
            {t('features.cta.button')}
          </Button>
        </div>
      </div>
    </div>
  )
}

export default FeaturesPage