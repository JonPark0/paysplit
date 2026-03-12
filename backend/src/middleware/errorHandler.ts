import type { ErrorRequestHandler, NextFunction, Request, RequestHandler, Response } from 'express'

interface ErrorShape {
  message: string
  status: number
}

interface AppErrorLike extends Error {
  status?: number
  code?: string
}

export const errorHandler: ErrorRequestHandler = (err: AppErrorLike, req: Request, res: Response, _next: NextFunction) => {
  console.error('Error occurred:', {
    message: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
    timestamp: new Date().toISOString()
  })

  const error: ErrorShape = {
    message: 'Internal Server Error',
    status: 500
  }

  if (err.name === 'ValidationError') {
    error.message = err.message
    error.status = 400
  }

  if (err.name === 'JsonWebTokenError') {
    error.message = 'Invalid token'
    error.status = 401
  }

  if (err.name === 'TokenExpiredError') {
    error.message = 'Token expired'
    error.status = 401
  }

  if (err.code === 'LIMIT_FILE_SIZE') {
    error.message = 'File too large'
    error.status = 413
  }

  if (err.code === 'LIMIT_UNEXPECTED_FILE') {
    error.message = 'Unexpected file field'
    error.status = 400
  }

  if (err.code === 'SQLITE_CONSTRAINT' || err.code === '23505') {
    error.message = 'Database constraint violation'
    error.status = 400
  }

  if (typeof err.status === 'number') {
    error.status = err.status
    error.message = err.message
  }

  if (process.env.NODE_ENV === 'production' && error.status === 500) {
    error.message = 'Internal Server Error'
  }

  res.status(error.status).json({
    error: error.message,
    timestamp: new Date().toISOString(),
    path: req.path
  })
}

export const notFoundHandler: RequestHandler = (req: Request, res: Response) => {
  res.status(404).json({
    error: 'Not Found',
    message: `Route ${req.method} ${req.path} not found`,
    timestamp: new Date().toISOString()
  })
}

export const asyncHandler = <T extends RequestHandler>(fn: T): RequestHandler => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next)
  }
}

export class AppError extends Error {
  status: number

  isOperational: boolean

  constructor(message: string, statusCode: number) {
    super(message)
    this.status = statusCode
    this.isOperational = true

    Error.captureStackTrace(this, this.constructor)
  }
}
