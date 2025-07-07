import multer from 'multer'
import path from 'path'
import { v4 as uuidv4 } from 'uuid'

// Configure multer for file uploads
const storage = multer.memoryStorage() // Store files in memory for processing

const fileFilter = (req, file, cb) => {
  // Allowed file types
  const allowedTypes = [
    'image/jpeg',
    'image/png', 
    'image/webp',
    'application/pdf'
  ]

  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true)
  } else {
    cb(new Error('Invalid file type. Only JPEG, PNG, WebP, and PDF files are allowed'), false)
  }
}

const limits = {
  fileSize: parseInt(process.env.MAX_FILE_SIZE) || 10 * 1024 * 1024, // Configurable file size limit
  files: 1 // Only one file at a time
}

// Create multer upload instance
export const upload = multer({
  storage,
  fileFilter,
  limits
})

// Single file upload middleware
export const uploadSingle = upload.single('receipt')

// Error handling for multer
export const handleMulterError = (error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      const maxSizeMB = Math.ceil((parseInt(process.env.MAX_FILE_SIZE) || 10485760) / 1024 / 1024)
      return res.status(413).json({
        error: 'File too large',
        message: `File size must be less than ${maxSizeMB}MB`
      })
    }
    
    if (error.code === 'LIMIT_UNEXPECTED_FILE') {
      return res.status(400).json({
        error: 'Unexpected file',
        message: 'Only one file is allowed'
      })
    }
    
    if (error.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({
        error: 'Too many files',
        message: 'Only one file is allowed'
      })
    }
  }
  
  if (error.message.includes('Invalid file type')) {
    return res.status(400).json({
      error: 'Invalid file type',
      message: error.message
    })
  }
  
  next(error)
}