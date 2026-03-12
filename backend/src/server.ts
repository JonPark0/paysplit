import 'dotenv/config'
import express from 'express'
import helmet from 'helmet'
import cors from 'cors'
import compression from 'compression'
import morgan from 'morgan'
import cron from 'node-cron'

import Database from './utils/database.js'
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js'
import { requestLogger } from './middleware/logger.js'
import { createRateLimiter } from './middleware/rateLimit.js'
import { cleanupExpiredRooms } from './services/cleanup.js'

import roomRoutes from './routes/rooms.js'
import receiptRoutes from './routes/receipts.js'
import settlementRoutes from './routes/settlements.js'
import archiveRoutes from './routes/archive.js'
import ollamaRoutes from './routes/ollama.js'

const app = express()
const PORT = Number(process.env.PORT || 3002)

const validateEnvironment = (): void => {
  const required = ['JWT_SECRET', 'ENCRYPTION_KEY', 'DATABASE_URL']
  const missing = required.filter((name) => !process.env[name])

  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`)
  }

  if ((process.env.ENCRYPTION_KEY || '').length < 32) {
    throw new Error('ENCRYPTION_KEY must be at least 32 characters long')
  }

  if (process.env.NODE_ENV === 'production' && process.env.RECAPTCHA_REQUIRED !== 'false' && !process.env.RECAPTCHA_SECRET_KEY) {
    throw new Error('RECAPTCHA_SECRET_KEY is required in production')
  }
}

if (process.env.TRUST_PROXY) {
  const parsedTrustProxy = Number(process.env.TRUST_PROXY)
  const trustProxyValue = Number.isNaN(parsedTrustProxy)
    ? process.env.TRUST_PROXY === 'true'
      ? true
      : process.env.TRUST_PROXY
    : parsedTrustProxy

  app.set('trust proxy', trustProxyValue as any)
}

const db = new Database(process.env.DATABASE_URL)

app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false
}))

const corsOrigin = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(',').map((origin) => origin.trim())
  : ['http://localhost:5173', 'https://paysplit.nphani.com']

app.use(cors({
  origin: corsOrigin,
  credentials: true,
  optionsSuccessStatus: 200
}))

app.use(compression())

const maxFileSize = Number(process.env.MAX_FILE_SIZE || 10485760)
const bodyLimit = `${Math.ceil(maxFileSize / 1024 / 1024)}mb`
app.use(express.json({ limit: bodyLimit }))
app.use(express.urlencoded({ extended: true, limit: bodyLimit }))

if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('combined'))
  app.use(requestLogger)
}

app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
    version: process.env.npm_package_version || '1.0.0'
  })
})

const apiRateLimitWindow = Number(process.env.RATE_LIMIT_WINDOW || 15 * 60 * 1000)
const apiRateLimitMax = Number(process.env.RATE_LIMIT_MAX || 120)
const uploadRateLimitMax = Number(process.env.UPLOAD_RATE_LIMIT_MAX || 20)

const apiRateLimiter = createRateLimiter({
  name: 'api',
  windowMs: apiRateLimitWindow,
  max: apiRateLimitMax,
  skip: ((req) => req.path === '/health') as any
})

const uploadRateLimiter = createRateLimiter({
  name: 'upload',
  windowMs: apiRateLimitWindow,
  max: uploadRateLimitMax,
  message: 'Too many upload attempts, please try again later'
})

app.use('/api', apiRateLimiter)
app.use('/api/receipts/upload', uploadRateLimiter)

app.use('/api/rooms', roomRoutes(db))
app.use('/api/receipts', receiptRoutes(db))
app.use('/api/settlements', settlementRoutes(db))
app.use('/api/archive', archiveRoutes(db))
app.use('/api/ollama', ollamaRoutes(db))

app.use(notFoundHandler)
app.use(errorHandler)

cron.schedule('0 2 * * *', async () => {
  console.log('Running cleanup job...')
  try {
    await cleanupExpiredRooms(db)
    console.log('Cleanup job completed successfully')
  } catch (error) {
    console.error('Cleanup job failed:', error)
  }
})

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

async function startServer(): Promise<void> {
  try {
    validateEnvironment()

    await db.init()
    console.log('Database initialized successfully')

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

if (process.env.NODE_ENV !== 'test') {
  startServer()
}

export default app
