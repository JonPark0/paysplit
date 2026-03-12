import type { NextFunction, Request, Response } from 'express'
import jwt, { type JwtPayload, type SignOptions } from 'jsonwebtoken'
import type Database from '../utils/database.js'
import { AppError } from './errorHandler.js'

interface SessionPayload extends JwtPayload {
  type?: string
}

interface RoomSessionRow {
  id: string
  room_id: string
  participant_id: string
  expires_at: string
  participant_name: string
  is_admin: boolean | number
}

type MaybeStringArray = string | string[] | undefined

interface AuthRequest extends Request {
  user?: string | JwtPayload
  participant?: {
    id: string
    roomId: string
    name: string
    isAdmin: boolean
  }
  session?: {
    id: string
    roomId: string
    participantId: string
    participantName: string
    isAdmin: boolean
    expiresAt: string
  }
}

const getJwtSecret = (): string => {
  const secret = process.env.JWT_SECRET
  if (!secret) {
    throw new AppError('JWT secret is not configured', 500)
  }
  return secret
}

const getSingleHeaderValue = (value: MaybeStringArray): string | undefined => {
  if (Array.isArray(value)) {
    return value[0]
  }

  return value
}

const getParamValue = (value: string | string[] | undefined): string | undefined => {
  if (Array.isArray(value)) {
    return value[0]
  }

  return value
}

export const authenticateToken = (req: AuthRequest, _res: Response, next: NextFunction): void => {
  const authHeader = getSingleHeaderValue(req.headers.authorization)
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : undefined

  if (!token) {
    next(new AppError('Access token required', 401))
    return
  }

  jwt.verify(token, getJwtSecret(), (err, user) => {
    if (err) {
      next(new AppError('Invalid or expired token', 403))
      return
    }

    req.user = user as string | JwtPayload
    next()
  })
}

export const checkRoomAccess = (db: Database) => {
  return async (req: AuthRequest, _res: Response, next: NextFunction): Promise<void> => {
    try {
      const roomId = getParamValue((req.params as Record<string, string | string[] | undefined>).roomId)
      const cookieToken = getSingleHeaderValue((req.cookies as Record<string, MaybeStringArray> | undefined)?.sessionToken)
      const sessionToken = getSingleHeaderValue(req.headers['x-session-token']) || cookieToken

      if (!roomId) {
        next(new AppError('Room ID is required', 400))
        return
      }

      if (!sessionToken) {
        next(new AppError('Session token required', 401))
        return
      }

      try {
        const decoded = jwt.verify(sessionToken, getJwtSecret()) as SessionPayload | string
        if (typeof decoded === 'string' || decoded.type !== 'session') {
          next(new AppError('Invalid session token type', 401))
          return
        }
      } catch {
        next(new AppError('Invalid or expired session token', 401))
        return
      }

      const session = await db.get<RoomSessionRow>(`
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
        next(new AppError('Invalid or expired session', 401))
        return
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

export const checkAdminAccess = (req: AuthRequest, _res: Response, next: NextFunction): void => {
  if (!req.participant || !req.participant.isAdmin) {
    next(new AppError('Admin access required', 403))
    return
  }
  next()
}

export const validateRoomSession = (db: Database) => {
  return async (req: AuthRequest, _res: Response, next: NextFunction): Promise<void> => {
    try {
      const roomId = getParamValue((req.params as Record<string, string | string[] | undefined>).roomId)
      const cookieToken = getSingleHeaderValue((req.cookies as Record<string, MaybeStringArray> | undefined)?.sessionToken)
      const sessionToken = cookieToken || getSingleHeaderValue(req.headers['x-session-token'])

      if (!roomId) {
        next(new AppError('Room ID is required', 400))
        return
      }

      if (!sessionToken) {
        next(new AppError('Session required', 401))
        return
      }

      const session = await db.get<RoomSessionRow>(`
        SELECT
          s.*,
          p.name as participant_name,
          p.is_admin
        FROM sessions s
        JOIN participants p ON s.participant_id = p.id
        WHERE s.token = ? AND s.room_id = ? AND s.expires_at > ?
      `, [sessionToken, roomId, new Date().toISOString()])

      if (!session) {
        next(new AppError('Invalid or expired session', 401))
        return
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

export const generateToken = (payload: string | object | Buffer, expiresIn: SignOptions['expiresIn'] = '24h'): string => {
  return jwt.sign(payload, getJwtSecret(), { expiresIn } as SignOptions)
}

export const generateSessionToken = (): string => {
  return jwt.sign(
    { type: 'session', timestamp: Date.now() },
    getJwtSecret(),
    { expiresIn: '7d' }
  )
}
