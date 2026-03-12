import type { NextFunction, Request, Response } from 'express'
import multer, { type FileFilterCallback } from 'multer'

const storage = multer.memoryStorage()

const allowedTypes = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/pdf'
]

const fileFilter = (_req: Request, file: Express.Multer.File, cb: FileFilterCallback): void => {
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true)
  } else {
    cb(new Error('Invalid file type. Only JPEG, PNG, WebP, and PDF files are allowed'))
  }
}

const limits: multer.Options['limits'] = {
  fileSize: Number(process.env.MAX_FILE_SIZE || 10 * 1024 * 1024),
  files: 1
}

export const upload = multer({
  storage,
  fileFilter,
  limits
})

export const uploadSingle = upload.single('receipt')

export const handleMulterError = (error: unknown, _req: Request, res: Response, next: NextFunction): void => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      const maxSizeMB = Math.ceil((Number(process.env.MAX_FILE_SIZE || 10485760)) / 1024 / 1024)
      res.status(413).json({
        error: 'File too large',
        message: `File size must be less than ${maxSizeMB}MB`
      })
      return
    }

    if (error.code === 'LIMIT_UNEXPECTED_FILE' || error.code === 'LIMIT_FILE_COUNT') {
      res.status(400).json({
        error: error.code === 'LIMIT_FILE_COUNT' ? 'Too many files' : 'Unexpected file',
        message: 'Only one file is allowed'
      })
      return
    }
  }

  if (error instanceof Error && error.message.includes('Invalid file type')) {
    res.status(400).json({
      error: 'Invalid file type',
      message: error.message
    })
    return
  }

  next(error)
}
