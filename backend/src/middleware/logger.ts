import type { NextFunction, Request, RequestHandler, Response } from 'express'
import { randomUUID } from 'crypto'
import type Database from '../utils/database.js'

interface ActivityRow {
  id: string
  room_id: string
  participant_id: string | null
  participant_name: string | null
  action: string
  details: string | null
  created_at: string
}

export const requestLogger: RequestHandler = (req: Request, res: Response, next: NextFunction) => {
  const start = Date.now()

  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`, {
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    contentLength: req.get('Content-Length')
  })

  res.on('finish', () => {
    const duration = Date.now() - start
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url} - ${res.statusCode} (${duration}ms)`)
  })

  next()
}

export class ActivityLogger {
  private db: Database

  constructor(db: Database) {
    this.db = db
  }

  async logActivity(roomId: string, participantId: string | null, action: string, details: unknown = null): Promise<void> {
    try {
      await this.db.run(`
        INSERT INTO activity_logs (id, room_id, participant_id, action, details)
        VALUES (?, ?, ?, ?, ?)
      `, [
        randomUUID(),
        roomId,
        participantId,
        action,
        JSON.stringify(details)
      ])
    } catch (error) {
      console.error('Failed to log activity:', error)
    }
  }

  async getRoomActivities(roomId: string, limit = 50): Promise<Array<Record<string, unknown>>> {
    try {
      const activities = await this.db.all<ActivityRow>(`
        SELECT
          al.*,
          p.name as participant_name
        FROM activity_logs al
        LEFT JOIN participants p ON al.participant_id = p.id
        WHERE al.room_id = ?
        ORDER BY al.created_at DESC
        LIMIT ?
      `, [roomId, limit])

      return activities.map((activity) => ({
        id: activity.id,
        roomId: activity.room_id,
        participantId: activity.participant_id,
        participantName: activity.participant_name,
        action: activity.action,
        details: activity.details ? JSON.parse(activity.details) : null,
        createdAt: activity.created_at
      }))
    } catch (error) {
      console.error('Failed to get room activities:', error)
      return []
    }
  }
}
