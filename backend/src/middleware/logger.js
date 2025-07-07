// Request logging middleware

export const requestLogger = (req, res, next) => {
  const start = Date.now()

  // Log request
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`, {
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    contentLength: req.get('Content-Length')
  })

  // Log response when it finishes
  res.on('finish', () => {
    const duration = Date.now() - start
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url} - ${res.statusCode} (${duration}ms)`)
  })

  next()
}

// Activity logger for business logic
export class ActivityLogger {
  constructor(db) {
    this.db = db
  }

  async logActivity(roomId, participantId, action, details = null) {
    try {
      await this.db.run(`
        INSERT INTO activity_logs (id, room_id, participant_id, action, details)
        VALUES (?, ?, ?, ?, ?)
      `, [
        require('crypto').randomUUID(),
        roomId,
        participantId,
        action,
        JSON.stringify(details)
      ])
    } catch (error) {
      console.error('Failed to log activity:', error)
      // Don't throw error to avoid breaking main functionality
    }
  }

  async getRoomActivities(roomId, limit = 50) {
    try {
      const activities = await this.db.all(`
        SELECT 
          al.*,
          p.name as participant_name
        FROM activity_logs al
        LEFT JOIN participants p ON al.participant_id = p.id
        WHERE al.room_id = ?
        ORDER BY al.created_at DESC
        LIMIT ?
      `, [roomId, limit])

      return activities.map(activity => ({
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