import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { Heart, Github, Globe } from 'lucide-react'
import { useSettingsStore } from '../../stores/settingsStore'

const Footer = () => {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { language } = useSettingsStore()
  const currentYear = new Date().getFullYear()

  return (
    <footer className="bg-white border-t border-neutral-200 safe-bottom">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* About */}
          <div>
            <h3 className="text-sm font-semibold text-neutral-900 mb-4">
              PaySplit
            </h3>
            <p className="text-sm text-neutral-600 mb-4">
              {t('home.description')}
            </p>
            <div className="flex items-center text-sm text-neutral-500">
              Made with <Heart className="w-4 h-4 mx-1 text-red-500" /> for easier bill splitting
            </div>
          </div>

          {/* Links */}
          <div>
            <h3 className="text-sm font-semibold text-neutral-900 mb-4">
              Links
            </h3>
            <div className="space-y-2">
              <button
                onClick={() => navigate(`/${language}/help`)}
                className="block text-sm text-neutral-600 hover:text-neutral-900 transition-colors text-left"
              >
                도움말
              </button>
              <button
                onClick={() => navigate(`/${language}/privacy`)}
                className="block text-sm text-neutral-600 hover:text-neutral-900 transition-colors text-left"
              >
                개인정보 처리방침
              </button>
              <button
                onClick={() => navigate(`/${language}/terms`)}
                className="block text-sm text-neutral-600 hover:text-neutral-900 transition-colors text-left"
              >
                이용약관
              </button>
              <a
                href="https://palnarium.com"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center text-sm text-neutral-600 hover:text-neutral-900 transition-colors"
              >
                <Globe className="w-4 h-4 mr-2" />
                palnarium.com
              </a>
            </div>
          </div>
        </div>

        {/* Bottom */}
        <div className="mt-8 pt-8 border-t border-neutral-200">
          <div className="flex flex-col sm:flex-row justify-between items-center">
            <p className="text-sm text-neutral-500">
              © {currentYear} Palnarium. All rights reserved.
            </p>
            <p className="text-sm text-neutral-500 mt-2 sm:mt-0">
              Version 1.0.0
            </p>
          </div>
        </div>
      </div>
    </footer>
  )
}

export default Footer
