import { v4 as uuidv4 } from 'uuid'
import type Database from '../utils/database.js'

interface ReceiptItemInput {
  name: string
  price: number
  quantity?: number
  category?: string
}

interface CreateReceiptInput {
  roomId: string
  uploaderId: string
  payerId?: string
  originalFilename?: string
  encryptedFilename?: string
  totalAmount: number
  currency?: string
  items?: ReceiptItemInput[]
}

interface ReceiptRow {
  id: string
  room_id: string
  uploader_id: string
  payer_id: string | null
  uploader_name?: string
  payer_name?: string | null
  original_filename: string | null
  encrypted_filename: string | null
  total_amount: number
  currency: string
  created_at: string
}

interface ReceiptItemRow {
  id: string
  receipt_id: string
  name: string
  price: number
  quantity: number
  category: string | null
}

class Receipt {
  private db: Database

  constructor(db: Database) {
    this.db = db
  }

  async create(data: CreateReceiptInput): Promise<any> {
    const {
      roomId,
      uploaderId,
      payerId,
      originalFilename,
      encryptedFilename,
      totalAmount,
      currency = 'KRW',
      items = []
    } = data

    const receiptId = uuidv4()
    const actualPayerId = payerId || uploaderId

    await this.db.run(`
      INSERT INTO receipts (id, room_id, uploader_id, payer_id, original_filename, encrypted_filename, total_amount, currency)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `, [receiptId, roomId, uploaderId, actualPayerId, originalFilename ?? null, encryptedFilename ?? null, totalAmount, currency])

    const createdItems: any[] = []
    for (const item of items) {
      const itemId = uuidv4()
      await this.db.run(`
        INSERT INTO receipt_items (id, receipt_id, name, price, quantity, category)
        VALUES (?, ?, ?, ?, ?, ?)
      `, [itemId, receiptId, item.name, item.price, item.quantity || 1, item.category ?? null])

      createdItems.push({
        id: itemId,
        receiptId,
        name: item.name,
        price: item.price,
        quantity: item.quantity || 1,
        category: item.category || null
      })
    }

    return {
      id: receiptId,
      roomId,
      uploaderId,
      payerId: actualPayerId,
      originalFilename,
      encryptedFilename,
      totalAmount,
      currency,
      items: createdItems,
      createdAt: new Date().toISOString()
    }
  }

  private mapItem(item: ReceiptItemRow): any {
    return {
      id: item.id,
      receiptId: item.receipt_id,
      name: item.name,
      price: item.price,
      quantity: item.quantity,
      category: item.category
    }
  }

  async findById(id: string): Promise<any | null> {
    const receipt = await this.db.get<ReceiptRow>('SELECT * FROM receipts WHERE id = ?', [id])
    if (!receipt) {
      return null
    }

    const items = await this.db.all<ReceiptItemRow>('SELECT * FROM receipt_items WHERE receipt_id = ? ORDER BY name', [id])

    return {
      id: receipt.id,
      roomId: receipt.room_id,
      uploaderId: receipt.uploader_id,
      payerId: receipt.payer_id,
      originalFilename: receipt.original_filename,
      encryptedFilename: receipt.encrypted_filename,
      totalAmount: receipt.total_amount,
      currency: receipt.currency,
      createdAt: receipt.created_at,
      items: items.map((item) => this.mapItem(item))
    }
  }

  async findByRoomId(roomId: string): Promise<any[]> {
    const receipts = await this.db.all<ReceiptRow>(`
      SELECT
        r.*,
        up.name as uploader_name,
        pp.name as payer_name
      FROM receipts r
      JOIN participants up ON r.uploader_id = up.id
      LEFT JOIN participants pp ON r.payer_id = pp.id
      WHERE r.room_id = ?
      ORDER BY r.created_at DESC
    `, [roomId])

    const result: any[] = []
    for (const receipt of receipts) {
      const items = await this.db.all<ReceiptItemRow>('SELECT * FROM receipt_items WHERE receipt_id = ? ORDER BY name', [receipt.id])
      result.push({
        id: receipt.id,
        roomId: receipt.room_id,
        uploaderId: receipt.uploader_id,
        uploaderName: receipt.uploader_name,
        payerId: receipt.payer_id,
        payerName: receipt.payer_name,
        originalFilename: receipt.original_filename,
        encryptedFilename: receipt.encrypted_filename,
        totalAmount: receipt.total_amount,
        currency: receipt.currency,
        createdAt: receipt.created_at,
        items: items.map((item) => this.mapItem(item))
      })
    }

    return result
  }

  async updateItems(receiptId: string, items: ReceiptItemInput[]): Promise<any[]> {
    await this.db.run('DELETE FROM receipt_items WHERE receipt_id = ?', [receiptId])

    const createdItems: any[] = []
    for (const item of items) {
      const itemId = uuidv4()
      await this.db.run(`
        INSERT INTO receipt_items (id, receipt_id, name, price, quantity, category)
        VALUES (?, ?, ?, ?, ?, ?)
      `, [itemId, receiptId, item.name, item.price, item.quantity || 1, item.category ?? null])

      createdItems.push({
        id: itemId,
        receiptId,
        name: item.name,
        price: item.price,
        quantity: item.quantity || 1,
        category: item.category || null
      })
    }

    const totalAmount = items.reduce((sum, item) => sum + (item.price * (item.quantity || 1)), 0)
    await this.db.run('UPDATE receipts SET total_amount = ? WHERE id = ?', [totalAmount, receiptId])

    return createdItems
  }

  async delete(id: string): Promise<void> {
    await this.db.run('DELETE FROM receipts WHERE id = ?', [id])
  }

  async getReceiptSplits(receiptId: string): Promise<any[]> {
    return this.db.all<any>(`
      SELECT
        s.*,
        ri.name as item_name,
        ri.price as item_price,
        p.name as participant_name
      FROM splits s
      JOIN receipt_items ri ON s.item_id = ri.id
      JOIN participants p ON s.participant_id = p.id
      WHERE ri.receipt_id = ?
      ORDER BY ri.name, p.name
    `, [receiptId])
  }

  async getRoomReceiptStats(roomId: string): Promise<Record<string, number>> {
    const stats = await this.db.get<{ receipt_count: number; total_amount: number; uploaders_count: number }>(`
      SELECT
        COUNT(*) as receipt_count,
        SUM(total_amount) as total_amount,
        COUNT(DISTINCT uploader_id) as uploaders_count
      FROM receipts
      WHERE room_id = ?
    `, [roomId])

    const itemStats = await this.db.get<{ item_count: number; avg_item_price: number }>(`
      SELECT
        COUNT(*) as item_count,
        AVG(price) as avg_item_price
      FROM receipt_items ri
      JOIN receipts r ON ri.receipt_id = r.id
      WHERE r.room_id = ?
    `, [roomId])

    return {
      receiptCount: stats?.receipt_count || 0,
      totalAmount: stats?.total_amount || 0,
      uploadersCount: stats?.uploaders_count || 0,
      itemCount: itemStats?.item_count || 0,
      avgItemPrice: itemStats?.avg_item_price || 0
    }
  }
}

export default Receipt
