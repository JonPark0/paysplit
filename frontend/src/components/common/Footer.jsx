import { useTranslation } from 'react-i18next'
import { Heart, Github, Globe } from 'lucide-react'

const Footer = () => {
  const { t } = useTranslation()

  return (
    <footer className="bg-white border-t border-neutral-200 safe-bottom">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
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

          {/* Features */}
          <div>
            <h3 className="text-sm font-semibold text-neutral-900 mb-4">
              {t('navigation.features')}
            </h3>
            <ul className="space-y-2 text-sm text-neutral-600">
              <li>{t('home.features.ocr.title')}</li>
              <li>{t('home.features.split.title')}</li>
              <li>{t('home.features.secure.title')}</li>
              <li>PWA Support</li>
            </ul>
          </div>

          {/* Links */}
          <div>
            <h3 className="text-sm font-semibold text-neutral-900 mb-4">
              Links
            </h3>
            <div className="space-y-2">
              <a
                href="https://nphani.com"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center text-sm text-neutral-600 hover:text-neutral-900 transition-colors"
              >
                <Globe className="w-4 h-4 mr-2" />
                nphani.com
              </a>
              <a
                href="#privacy"
                className="block text-sm text-neutral-600 hover:text-neutral-900 transition-colors"
              >
                Privacy Policy
              </a>
              <a
                href="#terms"
                className="block text-sm text-neutral-600 hover:text-neutral-900 transition-colors"
              >
                Terms of Service
              </a>
            </div>
          </div>
        </div>

        {/* Bottom */}
        <div className="mt-8 pt-8 border-t border-neutral-200">
          <div className="flex flex-col sm:flex-row justify-between items-center">
            <p className="text-sm text-neutral-500">
              © 2024 PaySplit. All rights reserved.
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