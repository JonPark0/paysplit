import { v4 as uuidv4 } from 'uuid'
import bcrypt from 'bcryptjs'
import type Database from '../utils/database.js'

interface CreateParticipantInput {
  roomId: string
  name: string
  password: string
  isAdmin?: boolean
}

interface ParticipantRow {
  id: string
  room_id: string
  name: string
  is_admin: boolean | number
  joined_at: string
}

class Participant {
  private db: Database

  constructor(db: Database) {
    this.db = db
  }

  async create(data: CreateParticipantInput): Promise<any> {
    const {
      roomId,
      name,
      password,
      isAdmin = false
    } = data

    const id = uuidv4()
    const passwordHash = await bcrypt.hash(password, 12)

    await this.db.run(`
      INSERT INTO participants (id, room_id, name, password_hash, is_admin)
      VALUES (?, ?, ?, ?, ?)
    `, [id, roomId, name, passwordHash, isAdmin])

    return {
      id,
      roomId,
      name,
      isAdmin,
      joinedAt: new Date().toISOString()
    }
  }

  private mapParticipant(participant: ParticipantRow): any {
    return {
      id: participant.id,
      roomId: participant.room_id,
      name: participant.name,
      isAdmin: Boolean(participant.is_admin),
      joinedAt: participant.joined_at
    }
  }

  async findById(id: string): Promise<any | null> {
    const participant = await this.db.get<ParticipantRow>('SELECT * FROM participants WHERE id = ?', [id])
    return participant ? this.mapParticipant(participant) : null
  }

  async findByRoomId(roomId: string): Promise<any[]> {
    const participants = await this.db.all<ParticipantRow>('SELECT * FROM participants WHERE room_id = ? ORDER BY joined_at', [roomId])
    return participants.map((participant) => this.mapParticipant(participant))
  }

  async findByRoomAndName(roomId: string, name: string): Promise<any | null> {
    const participant = await this.db.get<ParticipantRow>('SELECT * FROM participants WHERE room_id = ? AND name = ?', [roomId, name])
    return participant ? this.mapParticipant(participant) : null
  }

  async verifyPassword(id: string, password: string): Promise<boolean> {
    const participant = await this.db.get<{ password_hash: string }>('SELECT password_hash FROM participants WHERE id = ?', [id])
    if (!participant) {
      return false
    }

    return bcrypt.compare(password, participant.password_hash)
  }

  async updatePassword(id: string, newPassword: string): Promise<void> {
    const passwordHash = await bcrypt.hash(newPassword, 12)
    await this.db.run('UPDATE participants SET password_hash = ? WHERE id = ?', [passwordHash, id])
  }

  async delete(id: string): Promise<void> {
    await this.db.run('DELETE FROM participants WHERE id = ?', [id])
  }

  async getParticipantBalance(participantId: string): Promise<{ paid: number; owed: number; balance: number }> {
    const paid = await this.db.get<{ total: number | null }>(`
      SELECT SUM(total_amount) as total
      FROM receipts
      WHERE uploader_id = ?
    `, [participantId])

    const owed = await this.db.get<{ total: number | null }>(`
      SELECT SUM(amount) as total
      FROM splits
      WHERE participant_id = ?
    `, [participantId])

    const paidAmount = paid?.total || 0
    const owedAmount = owed?.total || 0

    return {
      paid: paidAmount,
      owed: owedAmount,
      balance: paidAmount - owedAmount
    }
  }

  async getParticipantSplits(participantId: string): Promise<any[]> {
    return this.db.all<any>(`
      SELECT
        s.*,
        ri.name as item_name,
        ri.price as item_price,
        r.original_filename as receipt_filename
      FROM splits s
      JOIN receipt_items ri ON s.item_id = ri.id
      JOIN receipts r ON ri.receipt_id = r.id
      WHERE s.participant_id = ?
      ORDER BY s.created_at DESC
    `, [participantId])
  }
}

export default Participant
