import jwt from 'jsonwebtoken'
import { AppError } from './errorHandler.js'

// JWT authentication middleware
export const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization']
  const token = authHeader && authHeader.split(' ')[1] // Bearer TOKEN

  if (!token) {
    return next(new AppError('Access token required', 401))
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) {
      return next(new AppError('Invalid or expired token', 403))
    }
    
    req.user = user
    next()
  })
}

// Room access middleware - checks if user is participant of the room
export const checkRoomAccess = async (db) => {
  return async (req, res, next) => {
    try {
      const { roomId } = req.params
      const { participantId } = req.user

      // Check if participant exists and belongs to the room
      const participant = await db.get(`
        SELECT * FROM participants 
        WHERE id = ? AND room_id = ?
      `, [participantId, roomId])

      if (!participant) {
        return next(new AppError('Access denied to this room', 403))
      }

      req.participant = {
        id: participant.id,
        roomId: participant.room_id,
        name: participant.name,
        isAdmin: Boolean(participant.is_admin)
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
export const validateRoomSession = async (db) => {
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
  return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn })
}

// Generate session token
export const generateSessionToken = () => {
  return jwt.sign(
    { type: 'session', timestamp: Date.now() },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  )
}