import fetch from 'node-fetch'
import { AppError } from './errorHandler.js'

/**
 * reCAPTCHA V3 verification middleware
 * Verifies reCAPTCHA token from client and checks score against threshold
 */
export const verifyRecaptcha = (action = 'submit') => {
  return async (req, res, next) => {
    try {
      const { recaptchaToken } = req.body
      
      // Skip verification in test environment
      if (process.env.NODE_ENV === 'test') {
        return next()
      }
      
      // Check if reCAPTCHA is enabled
      if (!process.env.RECAPTCHA_SECRET_KEY) {
        console.warn('reCAPTCHA not configured, skipping verification')
        return next()
      }
      
      // Validate token presence - allow null/undefined for development or when reCAPTCHA fails to load
      if (!recaptchaToken) {
        console.warn('reCAPTCHA token not provided, allowing request to proceed (development mode or reCAPTCHA load failure)')
        return next()
      }
      
      // Verify token with Google reCAPTCHA API
      const verificationURL = 'https://www.google.com/recaptcha/api/siteverify'
      const verificationData = new URLSearchParams({
        secret: process.env.RECAPTCHA_SECRET_KEY,
        response: recaptchaToken,
        remoteip: req.ip
      })
      
      const response = await fetch(verificationURL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: verificationData
      })
      
      const verificationResult = await response.json()
      
      // Check if verification was successful
      if (!verificationResult.success) {
        console.error('reCAPTCHA verification failed:', verificationResult['error-codes'])
        return next(new AppError('reCAPTCHA verification failed', 400))
      }
      
      // Check action match (optional but recommended for V3)
      if (verificationResult.action && verificationResult.action !== action) {
        console.error(`reCAPTCHA action mismatch: expected ${action}, got ${verificationResult.action}`)
        return next(new AppError('reCAPTCHA action mismatch', 400))
      }
      
      // Check score against threshold
      const threshold = parseFloat(process.env.RECAPTCHA_THRESHOLD) || 0.5
      if (verificationResult.score < threshold) {
        console.warn(`reCAPTCHA score too low: ${verificationResult.score} < ${threshold}`)
        return next(new AppError('reCAPTCHA verification failed: suspicious activity detected', 400))
      }
      
      // Log successful verification (for monitoring)
      console.log(`reCAPTCHA verification successful: score=${verificationResult.score}, action=${verificationResult.action}`)
      
      // Remove token from request body to prevent it from being processed further
      delete req.body.recaptchaToken
      
      next()
    } catch (error) {
      console.error('reCAPTCHA verification error:', error)
      return next(new AppError('reCAPTCHA verification failed', 500))
    }
  }
}

/**
 * Specific middleware for room creation with 'room_create' action
 */
export const verifyRecaptchaRoomCreate = verifyRecaptcha('room_create')

/**
 * Specific middleware for room join with 'room_join' action
 */
export const verifyRecaptchaRoomJoin = verifyRecaptcha('room_join')

/**
 * Specific middleware for receipt upload with 'receipt_upload' action
 */
export const verifyRecaptchaReceiptUpload = verifyRecaptcha('receipt_upload')

export default verifyRecaptcha