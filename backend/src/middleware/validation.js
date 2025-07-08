import Joi from 'joi'
import { AppError } from './errorHandler.js'

// Validation middleware factory
export const validate = (schema, property = 'body') => {
  return (req, res, next) => {
    const { error } = schema.validate(req[property])
    
    if (error) {
      const message = error.details.map(detail => detail.message).join(', ')
      return next(new AppError(message, 400))
    }
    
    next()
  }
}

// Room validation schemas
export const roomSchemas = {
  create: Joi.object({
    name: Joi.string().max(100).optional().allow(''),
    adminName: Joi.string().min(1).max(50).required(),
    password: Joi.string().min(4).max(100).required(),
    language: Joi.string().valid('ko', 'en').default('ko')
  }),

  join: Joi.object({
    entryCode: Joi.string().pattern(/^\d{6}$/).required(),
    participantName: Joi.string().min(1).max(50).required(),
    password: Joi.string().min(4).max(100).required()
  }),

  updateStatus: Joi.object({
    status: Joi.string().valid('active', 'settling', 'completed').required()
  })
}

// Receipt validation schemas
export const receiptSchemas = {
  create: Joi.object({
    totalAmount: Joi.number().positive().required(),
    currency: Joi.string().default('KRW'),
    encryptedFilename: Joi.string().optional(),
    originalFilename: Joi.string().optional(),
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

// Split validation schemas
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

// Settlement validation schemas
export const settlementSchemas = {
  create: Joi.object({
    roomId: Joi.string().uuid().required(),
    fromParticipantId: Joi.string().uuid().required(),
    toParticipantId: Joi.string().uuid().required(),
    amount: Joi.number().positive().required()
  }),

  updateStatus: Joi.object({
    status: Joi.string().valid('pending', 'completed').required()
  })
}

// File upload validation
export const validateFile = (req, res, next) => {
  if (!req.file) {
    return next(new AppError('File is required', 400))
  }

  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
  if (!allowedTypes.includes(req.file.mimetype)) {
    return next(new AppError('Invalid file type. Only JPEG, PNG, WebP, and PDF are allowed', 400))
  }

  const maxSize = 10 * 1024 * 1024 // 10MB
  if (req.file.size > maxSize) {
    return next(new AppError('File too large. Maximum size is 10MB', 413))
  }

  next()
}

// Sanitize input data
export const sanitizeInput = (data) => {
  if (typeof data === 'string') {
    return data.trim()
  }
  
  if (Array.isArray(data)) {
    return data.map(sanitizeInput)
  }
  
  if (typeof data === 'object' && data !== null) {
    const sanitized = {}
    for (const [key, value] of Object.entries(data)) {
      sanitized[key] = sanitizeInput(value)
    }
    return sanitized
  }
  
  return data
}

// Middleware to sanitize request body
export const sanitizeBody = (req, res, next) => {
  if (req.body) {
    req.body = sanitizeInput(req.body)
  }
  next()
}