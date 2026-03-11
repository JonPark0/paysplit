interface GrecaptchaApi {
  execute: (siteKey: string, options: { action: string }) => Promise<string>
}

declare global {
  interface Window {
    grecaptcha?: GrecaptchaApi
  }
}

class RecaptchaService {
  private siteKey?: string

  private isLoaded: boolean

  private isLoading: boolean

  constructor() {
    this.siteKey = import.meta.env.VITE_RECAPTCHA_SITE_KEY
    this.isLoaded = false
    this.isLoading = false
  }

  async loadRecaptcha(): Promise<void> {
    if (this.isLoaded) {
      return
    }

    if (this.isLoading) {
      await new Promise<void>((resolve) => {
        const checkLoaded = () => {
          if (this.isLoaded) {
            resolve()
          } else {
            setTimeout(checkLoaded, 100)
          }
        }
        checkLoaded()
      })
      return
    }

    if (!this.siteKey) {
      console.warn('reCAPTCHA site key not configured')
      return
    }

    this.isLoading = true

    await new Promise<void>((resolve, reject) => {
      if (window.grecaptcha?.execute) {
        this.isLoaded = true
        this.isLoading = false
        resolve()
        return
      }

      const script = document.createElement('script')
      script.src = `https://www.google.com/recaptcha/api.js?render=${this.siteKey}`
      script.async = true
      script.defer = true

      script.onload = () => {
        const checkReady = () => {
          if (window.grecaptcha?.execute) {
            this.isLoaded = true
            this.isLoading = false
            resolve()
          } else {
            setTimeout(checkReady, 100)
          }
        }
        checkReady()
      }

      script.onerror = () => {
        this.isLoading = false
        console.error('Failed to load reCAPTCHA script - this may be due to CSP policy or network issues')
        reject(new Error('Failed to load reCAPTCHA'))
      }

      document.head.appendChild(script)
    })
  }

  async getToken(action = 'submit'): Promise<string | null> {
    try {
      if (!this.siteKey) {
        console.warn('reCAPTCHA not configured, skipping verification')
        return null
      }

      await this.loadRecaptcha()

      if (!window.grecaptcha?.execute) {
        console.warn('reCAPTCHA not available, skipping verification')
        return null
      }

      return await window.grecaptcha.execute(this.siteKey, { action })
    } catch (error) {
      console.error('reCAPTCHA token generation failed:', error)
      return null
    }
  }

  async getRoomCreateToken(): Promise<string | null> {
    return this.getToken('room_create')
  }

  async getRoomJoinToken(): Promise<string | null> {
    return this.getToken('room_join')
  }

  async getReceiptUploadToken(): Promise<string | null> {
    return this.getToken('receipt_upload')
  }

  cleanup(): void {
    const scripts = document.querySelectorAll('script[src*="recaptcha"]')
    scripts.forEach((script) => script.remove())

    window.grecaptcha = undefined
    this.isLoaded = false
    this.isLoading = false
  }
}

const recaptchaService = new RecaptchaService()

export default recaptchaService
