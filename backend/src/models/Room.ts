import { v4 as uuidv4 } from 'uuid'
import bcrypt from 'bcryptjs'
import type Database from '../utils/database.js'

interface CreateRoomInput {
  name?: string
  adminName: string
  password: string
  language?: string
}

interface RoomRow {
  id: string
  name: string | null
  admin_name: string
  entry_code: string
  language: string
  created_at: string
  last_activity: string
  settlement_status: string
  expires_at: string | null
}

interface CountRow {
  count: number
}

class Room {
  private db: Database

  constructor(db: Database) {
    this.db = db
  }

  async create(data: CreateRoomInput): Promise<any> {
    const {
      name,
      adminName,
      password,
      language = 'ko'
    } = data

    const id = uuidv4()
    const entryCode = this.generateEntryCode()
    const passwordHash = await bcrypt.hash(password, 12)

    await this.db.run(`
      INSERT INTO rooms (id, name, admin_name, password_hash, entry_code, language)
      VALUES (?, ?, ?, ?, ?, ?)
    `, [id, name ?? null, adminName, passwordHash, entryCode, language])

    return {
      id,
      name,
      adminName,
      entryCode,
      language,
      createdAt: new Date().toISOString(),
      settlementStatus: 'active'
    }
  }

  private mapRoom(room: RoomRow): any {
    return {
      id: room.id,
      name: room.name,
      adminName: room.admin_name,
      entryCode: room.entry_code,
      language: room.language,
      createdAt: room.created_at,
      lastActivity: room.last_activity,
      settlementStatus: room.settlement_status,
      expiresAt: room.expires_at
    }
  }

  async findById(id: string): Promise<any | null> {
    const room = await this.db.get<RoomRow>('SELECT * FROM rooms WHERE id = ?', [id])
    return room ? this.mapRoom(room) : null
  }

  async findByEntryCode(entryCode: string): Promise<any | null> {
    const room = await this.db.get<RoomRow>('SELECT * FROM rooms WHERE entry_code = ?', [entryCode])
    return room ? this.mapRoom(room) : null
  }

  async updateLastActivity(id: string): Promise<void> {
    await this.db.run('UPDATE rooms SET last_activity = CURRENT_TIMESTAMP WHERE id = ?', [id])
  }

  async updateSettlementStatus(id: string, status: string): Promise<void> {
    await this.db.run('UPDATE rooms SET settlement_status = ? WHERE id = ?', [status, id])
  }

  async verifyPassword(id: string, password: string): Promise<boolean> {
    const room = await this.db.get<{ password_hash: string }>('SELECT password_hash FROM rooms WHERE id = ?', [id])
    if (!room) {
      return false
    }
    return bcrypt.compare(password, room.password_hash)
  }

  async delete(id: string): Promise<void> {
    await this.db.run('DELETE FROM rooms WHERE id = ?', [id])
  }

  async findExpiredRooms(): Promise<Array<{ id: string; name: string | null }>> {
    const oneMonthAgo = new Date()
    oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1)

    return this.db.all<{ id: string; name: string | null }>(`
      SELECT id, name FROM rooms
      WHERE settlement_status = 'completed'
      AND last_activity < ?
    `, [oneMonthAgo.toISOString()])
  }

  generateEntryCode(): string {
    return Math.floor(100000 + Math.random() * 900000).toString()
  }

  async getRoomStats(id: string): Promise<{ participantCount: number; receiptCount: number; totalAmount: number }> {
    const participants = await this.db.all<CountRow>('SELECT COUNT(*) as count FROM participants WHERE room_id = ?', [id])
    const receipts = await this.db.all<CountRow>('SELECT COUNT(*) as count FROM receipts WHERE room_id = ?', [id])
    const totalAmount = await this.db.get<{ total: number | null }>('SELECT SUM(total_amount) as total FROM receipts WHERE room_id = ?', [id])

    return {
      participantCount: participants[0]?.count || 0,
      receiptCount: receipts[0]?.count || 0,
      totalAmount: totalAmount?.total || 0
    }
  }
}

export default Room
