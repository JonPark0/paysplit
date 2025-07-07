// Error handling middleware

export const errorHandler = (err, req, res, next) => {
  console.error('Error occurred:', {
    message: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
    timestamp: new Date().toISOString()
  })

  // Default error
  let error = {
    message: 'Internal Server Error',
    status: 500
  }

  // Validation errors
  if (err.name === 'ValidationError') {
    error.message = err.message
    error.status = 400
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    error.message = 'Invalid token'
    error.status = 401
  }

  if (err.name === 'TokenExpiredError') {
    error.message = 'Token expired'
    error.status = 401
  }

  // Multer errors (file upload)
  if (err.code === 'LIMIT_FILE_SIZE') {
    error.message = 'File too large'
    error.status = 413
  }

  if (err.code === 'LIMIT_UNEXPECTED_FILE') {
    error.message = 'Unexpected file field'
    error.status = 400
  }

  // Database errors
  if (err.code === 'SQLITE_CONSTRAINT') {
    error.message = 'Database constraint violation'
    error.status = 400
  }

  // Custom errors
  if (err.status) {
    error.status = err.status
    error.message = err.message
  }

  // Don't leak error details in production
  if (process.env.NODE_ENV === 'production' && error.status === 500) {
    error.message = 'Internal Server Error'
  }

  res.status(error.status).json({
    error: error.message,
    timestamp: new Date().toISOString(),
    path: req.path
  })
}

export const notFoundHandler = (req, res) => {
  res.status(404).json({
    error: 'Not Found',
    message: `Route ${req.method} ${req.path} not found`,
    timestamp: new Date().toISOString()
  })
}

// Async error wrapper
export const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next)
}

// Custom error class
export class AppError extends Error {
  constructor(message, statusCode) {
    super(message)
    this.status = statusCode
    this.isOperational = true

    Error.captureStackTrace(this, this.constructor)
  }
}