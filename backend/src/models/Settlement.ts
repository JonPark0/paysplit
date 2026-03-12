import { v4 as uuidv4 } from 'uuid'
import type Database from '../utils/database.js'

interface SplitCreateInput {
  itemId: string
  participantId: string
  amount: number
}

interface SettlementCreateInput {
  roomId: string
  fromParticipantId: string
  toParticipantId: string
  amount: number
}

interface ParticipantRow {
  id: string
  name: string
}

interface BalanceNode {
  id: string
  name: string
  balance: number
}

interface BalanceEntry extends BalanceNode {
  paid: number
  owed: number
}

interface SettlementTransaction {
  from: { id: string; name: string }
  to: { id: string; name: string }
  amount: number
}

class Settlement {
  private db: Database

  constructor(db: Database) {
    this.db = db
  }

  async createSplit(data: SplitCreateInput): Promise<any> {
    const { itemId, participantId, amount } = data
    const id = uuidv4()

    await this.db.run(`
      INSERT INTO splits (id, item_id, participant_id, amount)
      VALUES (?, ?, ?, ?)
    `, [id, itemId, participantId, amount])

    return {
      id,
      itemId,
      participantId,
      amount,
      createdAt: new Date().toISOString()
    }
  }

  async updateSplit(splitId: string, amount: number): Promise<void> {
    await this.db.run('UPDATE splits SET amount = ? WHERE id = ?', [amount, splitId])
  }

  async deleteSplit(splitId: string): Promise<void> {
    await this.db.run('DELETE FROM splits WHERE id = ?', [splitId])
  }

  async getSplitsByItem(itemId: string): Promise<any[]> {
    return this.db.all<any>(`
      SELECT
        s.*,
        p.name as participant_name
      FROM splits s
      JOIN participants p ON s.participant_id = p.id
      WHERE s.item_id = ?
      ORDER BY p.name
    `, [itemId])
  }

  async getSplitsByParticipant(participantId: string): Promise<any[]> {
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

  async calculateOptimalSettlement(roomId: string): Promise<any> {
    const participants = await this.db.all<ParticipantRow>('SELECT id, name FROM participants WHERE room_id = ?', [roomId])
    const balances: BalanceEntry[] = []

    for (const participant of participants) {
      const paid = await this.db.get<{ total: number | null }>(`
        SELECT COALESCE(SUM(total_amount), 0) as total
        FROM receipts
        WHERE uploader_id = ?
      `, [participant.id])

      const owed = await this.db.get<{ total: number | null }>(`
        SELECT COALESCE(SUM(amount), 0) as total
        FROM splits
        WHERE participant_id = ?
      `, [participant.id])

      const balance = (paid?.total || 0) - (owed?.total || 0)
      balances.push({
        id: participant.id,
        name: participant.name,
        paid: paid?.total || 0,
        owed: owed?.total || 0,
        balance
      })
    }

    const settlements = this.calculateMinimalTransactions(balances)

    return {
      balances,
      settlements,
      totalAmount: balances.reduce((sum, balance) => sum + balance.paid, 0)
    }
  }

  calculateMinimalTransactions(balances: BalanceNode[]): SettlementTransaction[] {
    const settlements: SettlementTransaction[] = []
    const debtors = balances.filter((balance) => balance.balance < -0.01).map((balance) => ({ ...balance }))
    const creditors = balances.filter((balance) => balance.balance > 0.01).map((balance) => ({ ...balance }))

    while (debtors.length > 0 && creditors.length > 0) {
      const debtor = debtors[0]
      const creditor = creditors[0]

      const amount = Math.min(Math.abs(debtor.balance), creditor.balance)

      if (amount > 0.01) {
        settlements.push({
          from: { id: debtor.id, name: debtor.name },
          to: { id: creditor.id, name: creditor.name },
          amount: Math.round(amount)
        })

        debtor.balance += amount
        creditor.balance -= amount
      }

      if (Math.abs(debtor.balance) < 0.01) {
        debtors.shift()
      }
      if (creditor.balance < 0.01) {
        creditors.shift()
      }
    }

    return settlements
  }

  async createSettlement(data: SettlementCreateInput): Promise<any> {
    const { roomId, fromParticipantId, toParticipantId, amount } = data
    const id = uuidv4()

    await this.db.run(`
      INSERT INTO settlements (id, room_id, from_participant_id, to_participant_id, amount)
      VALUES (?, ?, ?, ?, ?)
    `, [id, roomId, fromParticipantId, toParticipantId, amount])

    return {
      id,
      roomId,
      fromParticipantId,
      toParticipantId,
      amount,
      status: 'pending',
      createdAt: new Date().toISOString()
    }
  }

  async updateSettlementStatus(settlementId: string, status: string, participantId: string): Promise<any> {
    const settlement = await this.db.get<{ to_participant_id: string }>('SELECT to_participant_id FROM settlements WHERE id = ?', [settlementId])

    if (!settlement || settlement.to_participant_id !== participantId) {
      throw new Error('권한이 없습니다')
    }

    const completedAt = status === 'completed' ? new Date().toISOString() : null

    await this.db.run(`
      UPDATE settlements
      SET status = ?, completed_at = ?
      WHERE id = ?
    `, [status, completedAt, settlementId])

    return { status, completedAt }
  }

  async getSettlementsByRoom(roomId: string): Promise<any[]> {
    return this.db.all<any>(`
      SELECT
        s.*,
        fp.name as from_participant_name,
        tp.name as to_participant_name
      FROM settlements s
      JOIN participants fp ON s.from_participant_id = fp.id
      JOIN participants tp ON s.to_participant_id = tp.id
      WHERE s.room_id = ?
      ORDER BY s.created_at DESC
    `, [roomId])
  }

  async deleteSettlement(settlementId: string): Promise<void> {
    await this.db.run('DELETE FROM settlements WHERE id = ?', [settlementId])
  }

  async clearAllSplits(roomId: string): Promise<void> {
    await this.db.run(`
      DELETE FROM splits
      WHERE item_id IN (
        SELECT ri.id
        FROM receipt_items ri
        JOIN receipts r ON ri.receipt_id = r.id
        WHERE r.room_id = ?
      )
    `, [roomId])
  }

  async getParticipantBalances(roomId: string): Promise<Array<{ id: string; name: string; balance: number }>> {
    const participants = await this.db.all<ParticipantRow>('SELECT id, name FROM participants WHERE room_id = ?', [roomId])
    const balances: Array<{ id: string; name: string; balance: number }> = []

    for (const participant of participants) {
      const paid = await this.db.get<{ total: number | null }>(`
        SELECT COALESCE(SUM(total_amount), 0) as total
        FROM receipts
        WHERE uploader_id = ? AND room_id = ?
      `, [participant.id, roomId])

      const owed = await this.db.get<{ total: number | null }>(`
        SELECT COALESCE(SUM(s.amount), 0) as total
        FROM splits s
        JOIN receipt_items ri ON s.item_id = ri.id
        JOIN receipts r ON ri.receipt_id = r.id
        WHERE s.participant_id = ? AND r.room_id = ?
      `, [participant.id, roomId])

      const balance = (paid?.total || 0) - (owed?.total || 0)
      balances.push({
        id: participant.id,
        name: participant.name,
        balance
      })
    }

    return balances
  }

  async getOptimalTransactions(roomId: string): Promise<any[]> {
    const balances = await this.getParticipantBalances(roomId)
    const transactions = this.calculateMinimalTransactions(balances)

    return transactions.map((transaction) => ({
      fromId: transaction.from.id,
      fromName: transaction.from.name,
      toId: transaction.to.id,
      toName: transaction.to.name,
      amount: transaction.amount,
      status: 'pending'
    }))
  }
}

export default Settlement
