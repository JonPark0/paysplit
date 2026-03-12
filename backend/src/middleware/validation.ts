import type { NextFunction, Request, Response } from 'express'
import Joi, { type ObjectSchema } from 'joi'
import { AppError } from './errorHandler.js'

type RequestProperty = 'body' | 'query' | 'params'

export const validate = (schema: ObjectSchema, property: RequestProperty = 'body') => {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const { error } = schema.validate(req[property])

    if (error) {
      const message = error.details.map((detail) => detail.message).join(', ')
      next(new AppError(message, 400))
      return
    }

    next()
  }
}

export const roomSchemas = {
  create: Joi.object({
    name: Joi.string().max(100).optional().allow(''),
    adminName: Joi.string().min(1).max(50).required(),
    password: Joi.string().min(4).max(100).required(),
    language: Joi.string().valid('ko', 'en').default('ko'),
    recaptchaToken: Joi.string().allow(null).optional()
  }),

  join: Joi.object({
    entryCode: Joi.string().pattern(/^\d{6}$/).required(),
    participantName: Joi.string().min(1).max(50).required(),
    password: Joi.string().min(4).max(100).required(),
    recaptchaToken: Joi.string().allow(null).optional()
  }),

  updateStatus: Joi.object({
    status: Joi.string().valid('active', 'settling', 'completed').required()
  })
}

export const receiptSchemas = {
  create: Joi.object({
    totalAmount: Joi.number().positive().required(),
    currency: Joi.string().default('KRW'),
    payerId: Joi.string().optional(),
    encryptedFilename: Joi.string().optional(),
    originalFilename: Joi.string().optional(),
    recaptchaToken: Joi.string().allow(null).optional(),
    items: Joi.array().items(
      Joi.object({
        name: Joi.string().min(1).max(100).required(),
        price: Joi.number().positive().required(),
        quantity: Joi.number().integer().positive().default(1),
        category: Joi.string().max(50).optional()
      })
    ).min(1).required()
  }),

  update: Joi.object({
    totalAmount: Joi.number().positive().optional(),
    items: Joi.array().items(
      Joi.object({
        name: Joi.string().min(1).max(100).required(),
        price: Joi.number().positive().required(),
        quantity: Joi.number().integer().positive().default(1),
        category: Joi.string().max(50).optional()
      })
    ).min(1).optional()
  })
}

export const splitSchemas = {
  create: Joi.object({
    itemId: Joi.string().uuid().required(),
    participantId: Joi.string().uuid().required(),
    amount: Joi.number().positive().required()
  }),

  bulk: Joi.object({
    splits: Joi.array().items(
      Joi.object({
        itemId: Joi.string().uuid().required(),
        participantId: Joi.string().uuid().required(),
        amount: Joi.number().positive().required()
      })
    ).min(1).required()
  }),

  update: Joi.object({
    amount: Joi.number().positive().required()
  })
}

export const settlementSchemas = {
  create: Joi.object({
    fromParticipantId: Joi.string().uuid().required(),
    toParticipantId: Joi.string().uuid().required(),
    amount: Joi.number().positive().required()
  }),

  updateStatus: Joi.object({
    status: Joi.string().valid('pending', 'completed').required()
  })
}

export const validateFile = (req: Request, _res: Response, next: NextFunction): void => {
  const file = req.file
  if (!file) {
    next(new AppError('File is required', 400))
    return
  }

  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
  if (!allowedTypes.includes(file.mimetype)) {
    next(new AppError('Invalid file type. Only JPEG, PNG, WebP, and PDF are allowed', 400))
    return
  }

  const maxSize = 10 * 1024 * 1024
  if (file.size > maxSize) {
    next(new AppError('File too large. Maximum size is 10MB', 413))
    return
  }

  next()
}

export const sanitizeInput = (data: unknown): unknown => {
  if (typeof data === 'string') {
    return data.trim()
  }

  if (Array.isArray(data)) {
    return data.map(sanitizeInput)
  }

  if (typeof data === 'object' && data !== null) {
    const sanitized: Record<string, unknown> = {}
    for (const [key, value] of Object.entries(data as Record<string, unknown>)) {
      sanitized[key] = sanitizeInput(value)
    }
    return sanitized
  }

  return data
}

export const sanitizeBody = (req: Request, _res: Response, next: NextFunction): void => {
  if (req.body) {
    req.body = sanitizeInput(req.body)
  }
  next()
}
