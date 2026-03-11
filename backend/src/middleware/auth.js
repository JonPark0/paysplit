import jwt from 'jsonwebtoken'
import { AppError } from './errorHandler.js'

const getJwtSecret = () => {
  const secret = process.env.JWT_SECRET
  if (!secret) {
    throw new AppError('JWT secret is not configured', 500)
  }
  return secret
}

// JWT authentication middleware
export const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization']
  const token = authHeader && authHeader.split(' ')[1] // Bearer TOKEN

  if (!token) {
    return next(new AppError('Access token required', 401))
  }

  jwt.verify(token, getJwtSecret(), (err, user) => {
    if (err) {
      return next(new AppError('Invalid or expired token', 403))
    }
    
    req.user = user
    next()
  })
}

// Room access middleware - checks if user has access to the room via session token
export const checkRoomAccess = (db) => {
  return async (req, res, next) => {
    try {
      const { roomId } = req.params
      const sessionToken = req.headers['x-session-token'] || req.cookies?.sessionToken

      if (!sessionToken) {
        return next(new AppError('Session token required', 401))
      }

      // Verify session token signature first
      try {
        const decoded = jwt.verify(sessionToken, getJwtSecret())
        if (decoded?.type !== 'session') {
          return next(new AppError('Invalid session token type', 401))
        }
      } catch (error) {
        return next(new AppError('Invalid or expired session token', 401))
      }

      // Verify that session exists, belongs to room, and is not expired
      const session = await db.get(`
        SELECT
          s.id,
          s.room_id,
          s.participant_id,
          s.expires_at,
          p.name as participant_name,
          p.is_admin
        FROM sessions s
        JOIN participants p ON s.participant_id = p.id
        WHERE s.token = ? AND s.room_id = ? AND s.expires_at > ?
      `, [sessionToken, roomId, new Date().toISOString()])

      if (!session) {
        return next(new AppError('Invalid or expired session', 401))
      }

      req.session = {
        id: session.id,
        roomId: session.room_id,
        participantId: session.participant_id,
        participantName: session.participant_name,
        isAdmin: Boolean(session.is_admin),
        expiresAt: session.expires_at
      }

      req.participant = {
        id: session.participant_id,
        roomId: session.room_id,
        name: session.participant_name,
        isAdmin: Boolean(session.is_admin)
      }

      next()
    } catch (error) {
      next(error)
    }
  }
}

// Admin access middleware - checks if user is admin of the room
export const checkAdminAccess = (req, res, next) => {
  if (!req.participant || !req.participant.isAdmin) {
    return next(new AppError('Admin access required', 403))
  }
  next()
}

// Session validation for room entry
export const validateRoomSession = (db) => {
  return async (req, res, next) => {
    try {
      const { roomId } = req.params
      const sessionToken = req.cookies?.sessionToken || req.headers['x-session-token']

      if (!sessionToken) {
        return next(new AppError('Session required', 401))
      }

      // Check if session exists and is valid
      const session = await db.get(`
        SELECT 
          s.*,
          p.name as participant_name,
          p.is_admin
        FROM sessions s
        JOIN participants p ON s.participant_id = p.id
        WHERE s.token = ? AND s.room_id = ? AND s.expires_at > ?
      `, [sessionToken, roomId, new Date().toISOString()])

      if (!session) {
        return next(new AppError('Invalid or expired session', 401))
      }

      req.session = {
        id: session.id,
        roomId: session.room_id,
        participantId: session.participant_id,
        participantName: session.participant_name,
        isAdmin: Boolean(session.is_admin),
        expiresAt: session.expires_at
      }

      next()
    } catch (error) {
      next(error)
    }
  }
}

// Generate JWT token
export const generateToken = (payload, expiresIn = '24h') => {
  return jwt.sign(payload, getJwtSecret(), { expiresIn })
}

// Generate session token
export const generateSessionToken = () => {
  return jwt.sign(
    { type: 'session', timestamp: Date.now() },
    getJwtSecret(),
    { expiresIn: '7d' }
  )
}
