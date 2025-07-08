// reCAPTCHA V3 service for frontend integration

class RecaptchaService {
  constructor() {
    this.siteKey = import.meta.env.VITE_RECAPTCHA_SITE_KEY
    this.isLoaded = false
    this.isLoading = false
  }

  /**
   * Load reCAPTCHA V3 script dynamically
   */
  async loadRecaptcha() {
    if (this.isLoaded) {
      return Promise.resolve()
    }

    if (this.isLoading) {
      // Wait for existing load to complete
      return new Promise((resolve) => {
        const checkLoaded = () => {
          if (this.isLoaded) {
            resolve()
          } else {
            setTimeout(checkLoaded, 100)
          }
        }
        checkLoaded()
      })
    }

    if (!this.siteKey) {
      console.warn('reCAPTCHA site key not configured')
      return Promise.resolve()
    }

    this.isLoading = true

    return new Promise((resolve, reject) => {
      // Check if reCAPTCHA is already loaded
      if (window.grecaptcha && window.grecaptcha.execute) {
        this.isLoaded = true
        this.isLoading = false
        resolve()
        return
      }

      // Create script element
      const script = document.createElement('script')
      script.src = `https://www.google.com/recaptcha/api.js?render=${this.siteKey}`
      script.async = true
      script.defer = true

      script.onload = () => {
        // Wait for grecaptcha to be ready
        const checkReady = () => {
          if (window.grecaptcha && window.grecaptcha.execute) {
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
        console.error('Failed to load reCAPTCHA script')
        reject(new Error('Failed to load reCAPTCHA'))
      }

      document.head.appendChild(script)
    })
  }

  /**
   * Execute reCAPTCHA and get token
   * @param {string} action - The action being performed (e.g., 'room_create', 'room_join', 'receipt_upload')
   * @returns {Promise<string|null>} Token or null if reCAPTCHA is not available
   */
  async getToken(action = 'submit') {
    try {
      // Skip in development if not configured
      if (!this.siteKey) {
        console.warn('reCAPTCHA not configured, skipping verification')
        return null
      }

      await this.loadRecaptcha()

      if (!window.grecaptcha || !window.grecaptcha.execute) {
        console.warn('reCAPTCHA not available, skipping verification')
        return null
      }

      const token = await window.grecaptcha.execute(this.siteKey, {
        action: action
      })

      return token
    } catch (error) {
      console.error('reCAPTCHA token generation failed:', error)
      return null
    }
  }

  /**
   * Get token for room creation
   */
  async getRoomCreateToken() {
    return this.getToken('room_create')
  }

  /**
   * Get token for room join
   */
  async getRoomJoinToken() {
    return this.getToken('room_join')
  }

  /**
   * Get token for receipt upload
   */
  async getReceiptUploadToken() {
    return this.getToken('receipt_upload')
  }

  /**
   * Cleanup - remove reCAPTCHA script if needed
   */
  cleanup() {
    const scripts = document.querySelectorAll('script[src*="recaptcha"]')
    scripts.forEach(script => script.remove())
    
    // Remove grecaptcha from window
    if (window.grecaptcha) {
      delete window.grecaptcha
    }

    this.isLoaded = false
    this.isLoading = false
  }
}

// Create singleton instance
const recaptchaService = new RecaptchaService()

export default recaptchaService