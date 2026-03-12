import type { NextFunction, Request, Response } from 'express'
import fetch from 'node-fetch'
import { AppError } from './errorHandler.js'

interface RecaptchaVerificationResponse {
  success: boolean
  score?: number
  action?: string
  ['error-codes']?: string[]
}

export const verifyRecaptcha = (action = 'submit') => {
  return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    try {
      const requestBody = (req.body ?? {}) as { recaptchaToken?: string }
      const { recaptchaToken } = requestBody

      const isProduction = process.env.NODE_ENV === 'production'
      const isRecaptchaRequired = process.env.RECAPTCHA_REQUIRED !== 'false'

      if (process.env.NODE_ENV === 'test') {
        next()
        return
      }

      if (!process.env.RECAPTCHA_SECRET_KEY) {
        if (isProduction && isRecaptchaRequired) {
          next(new AppError('reCAPTCHA is not configured on server', 503))
          return
        }

        console.warn('reCAPTCHA not configured, skipping verification')
        next()
        return
      }

      if (!recaptchaToken) {
        if (isProduction && isRecaptchaRequired) {
          next(new AppError('reCAPTCHA token is required', 400))
          return
        }

        console.warn('reCAPTCHA token not provided, allowing request to proceed in non-production mode')
        next()
        return
      }

      const verificationURL = 'https://www.google.com/recaptcha/api/siteverify'
      const verificationData = new URLSearchParams({
        secret: process.env.RECAPTCHA_SECRET_KEY,
        response: recaptchaToken,
        remoteip: req.ip
      })

      const controller = new AbortController()
      const timeoutMs = Number(process.env.RECAPTCHA_TIMEOUT_MS || 5000)
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs)

      const response = await fetch(verificationURL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: verificationData,
        signal: controller.signal
      }).finally(() => clearTimeout(timeoutId))

      if (!response.ok) {
        console.error('reCAPTCHA verification endpoint error:', response.status)
        next(new AppError('reCAPTCHA verification service unavailable', 503))
        return
      }

      const verificationResult = await response.json() as RecaptchaVerificationResponse

      if (!verificationResult.success) {
        console.error('reCAPTCHA verification failed:', verificationResult['error-codes'])
        next(new AppError('reCAPTCHA verification failed', 400))
        return
      }

      if (verificationResult.action && verificationResult.action !== action) {
        console.error(`reCAPTCHA action mismatch: expected ${action}, got ${verificationResult.action}`)
        next(new AppError('reCAPTCHA action mismatch', 400))
        return
      }

      const threshold = Number.parseFloat(process.env.RECAPTCHA_THRESHOLD || '0.5')
      const score = verificationResult.score ?? 0
      if (score < threshold) {
        console.warn(`reCAPTCHA score too low: ${score} < ${threshold}`)
        next(new AppError('reCAPTCHA verification failed: suspicious activity detected', 400))
        return
      }

      console.log(`reCAPTCHA verification successful: score=${score}, action=${verificationResult.action}`)

      if (req.body && typeof req.body === 'object') {
        delete (req.body as { recaptchaToken?: string }).recaptchaToken
      }

      next()
    } catch (error) {
      console.error('reCAPTCHA verification error:', error)
      next(new AppError('reCAPTCHA verification failed', 500))
    }
  }
}

export const verifyRecaptchaRoomCreate = verifyRecaptcha('room_create')
export const verifyRecaptchaRoomJoin = verifyRecaptcha('room_join')
export const verifyRecaptchaReceiptUpload = verifyRecaptcha('receipt_upload')

export default verifyRecaptcha
