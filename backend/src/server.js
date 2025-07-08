import express from 'express'
import helmet from 'helmet'
import cors from 'cors'
import compression from 'compression'
import morgan from 'morgan'
import rateLimit from 'express-rate-limit'
import dotenv from 'dotenv'
import cron from 'node-cron'

// Import utilities and services
import Database from './utils/database.js'
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js'
import { requestLogger } from './middleware/logger.js'
import { cleanupExpiredRooms } from './services/cleanup.js'

// Import routes
import roomRoutes from './routes/rooms.js'
import receiptRoutes from './routes/receipts.js'
import settlementRoutes from './routes/settlements.js'
import archiveRoutes from './routes/archive.js'
import ollamaRoutes from './routes/ollama.js'

// Load environment variables
dotenv.config()

const app = express()
const PORT = process.env.PORT || 3002

// Initialize database
const db = new Database(process.env.DATABASE_PATH || './database/paysplit.db')

// Security middleware (disable CSP for backend API only)
app.use(helmet({
  contentSecurityPolicy: false, // CSP handled by frontend nginx
  crossOriginEmbedderPolicy: false
}))

// CORS configuration
app.use(cors({
  origin: process.env.CORS_ORIGIN || ['http://localhost:5173', 'https://beta.nphani.com'],
  credentials: true,
  optionsSuccessStatus: 200
}))

// Compression middleware
app.use(compression())

// Body parsing middleware
const maxFileSize = parseInt(process.env.MAX_FILE_SIZE) || 10485760 // 10MB default
const bodyLimit = Math.ceil(maxFileSize / 1024 / 1024) + 'mb' // Convert to MB with buffer
app.use(express.json({ limit: bodyLimit }))
app.use(express.urlencoded({ extended: true, limit: bodyLimit }))

// Logging middleware
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('combined'))
  app.use(requestLogger)
}

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW) || 15 * 60 * 1000, // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX) || 100, // limit each IP to 100 requests per windowMs
  message: {
    error: 'Too many requests from this IP, please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false,
})
app.use('/api/', limiter)

// Upload rate limiting (stricter)
const uploadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: parseInt(process.env.UPLOAD_RATE_LIMIT_MAX) || 10, // limit each IP to uploads per windowMs
  message: {
    error: 'Too many upload requests from this IP, please try again later.'
  }
})

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
    version: process.env.npm_package_version || '1.0.0'
  })
})

// API routes
app.use('/api/rooms', roomRoutes(db))
app.use('/api/receipts', uploadLimiter, receiptRoutes(db))
app.use('/api/settlements', settlementRoutes(db))
app.use('/api/archive', archiveRoutes(db))
app.use('/api/ollama', ollamaRoutes)

// 404 handler
app.use(notFoundHandler)

// Error handling middleware
app.use(errorHandler)

// Cleanup cron job - runs daily at 2 AM
cron.schedule('0 2 * * *', async () => {
  console.log('Running cleanup job...')
  try {
    await cleanupExpiredRooms(db)
    console.log('Cleanup job completed successfully')
  } catch (error) {
    console.error('Cleanup job failed:', error)
  }
})

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down gracefully')
  await db.close()
  process.exit(0)
})

process.on('SIGINT', async () => {
  console.log('SIGINT received, shutting down gracefully')
  await db.close()
  process.exit(0)
})

// Start server
async function startServer() {
  try {
    // Initialize database
    await db.init()
    console.log('Database initialized successfully')

    // Start HTTP server
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`Server running on port ${PORT}`)
      console.log(`Environment: ${process.env.NODE_ENV || 'development'}`)
      console.log(`Health check: http://localhost:${PORT}/api/health`)
    })
  } catch (error) {
    console.error('Failed to start server:', error)
    process.exit(1)
  }
}

// Start the server
if (process.env.NODE_ENV !== 'test') {
  startServer()
}

export default app