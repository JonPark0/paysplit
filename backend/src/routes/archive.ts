import express, { type Request } from 'express'
import type Database from '../utils/database.js'
import { asyncHandler } from '../middleware/errorHandler.js'
import { checkRoomAccess } from '../middleware/auth.js'
import { ActivityLogger } from '../middleware/logger.js'
import Room from '../models/Room.js'
import Receipt from '../models/Receipt.js'
import Settlement from '../models/Settlement.js'
import Participant from '../models/Participant.js'

type ArchiveRequest = Request & {
  participant?: {
    id: string
    name: string
    isAdmin?: boolean
  }
}

const toParam = (value: string | string[] | undefined): string => {
  if (Array.isArray(value)) {
    return value[0] || ''
  }
  return value || ''
}

const getParticipant = (req: ArchiveRequest): { id: string; name: string; isAdmin?: boolean } => {
  if (!req.participant) {
    throw new Error('Participant context is missing')
  }
  return req.participant
}

const router = express.Router()

export default function archiveRoutes(db: Database) {
  const roomModel = new Room(db)
  const receiptModel = new Receipt(db)
  const settlementModel = new Settlement(db)
  const participantModel = new Participant(db)
  const activityLogger = new ActivityLogger(db)

  router.get('/:roomId/complete',
    checkRoomAccess(db),
    asyncHandler(async (req: ArchiveRequest, res) => {
      const roomId = toParam(req.params.roomId)
      const participant = getParticipant(req)

      const room = await roomModel.findById(roomId) as any
      if (!room) {
        res.status(404).json({ error: 'Room not found' })
        return
      }

      const participants = await participantModel.findByRoomId(roomId) as any[]
      const receipts = await receiptModel.findByRoomId(roomId) as any[]
      const settlements = await settlementModel.getSettlementsByRoom(roomId) as any[]
      const activities = await activityLogger.getRoomActivities(roomId, 100)
      const finalSettlement = await settlementModel.calculateOptimalSettlement(roomId) as any

      const participantBalances: Array<{ participant: any; balance: any }> = []
      for (const p of participants) {
        const balance = await participantModel.getParticipantBalance(p.id)
        participantBalances.push({ participant: p, balance })
      }

      await roomModel.updateLastActivity(roomId)
      await activityLogger.logActivity(roomId, participant.id, 'archive_accessed')

      const archiveData = {
        room: {
          id: room.id,
          name: room.name,
          entryCode: room.entryCode,
          language: room.language,
          adminName: room.adminName,
          createdAt: room.createdAt,
          lastActivity: room.lastActivity,
          settlementStatus: room.settlementStatus
        },
        participants,
        receipts,
        settlements,
        finalSettlement: {
          balances: finalSettlement.balances,
          transactions: finalSettlement.settlements,
          totalAmount: finalSettlement.totalAmount
        },
        participantBalances,
        activities,
        summary: {
          participantCount: participants.length,
          receiptCount: receipts.length,
          totalAmount: receipts.reduce((sum, r) => sum + r.totalAmount, 0),
          settlementCount: settlements.length,
          completedSettlements: settlements.filter((s) => s.status === 'completed').length
        },
        exportedAt: new Date().toISOString(),
        exportedBy: participant.name
      }

      res.json({ archive: archiveData })
    })
  )

  router.get('/:roomId/receipts',
    checkRoomAccess(db),
    asyncHandler(async (req: ArchiveRequest, res) => {
      const roomId = toParam(req.params.roomId)
      const receipts = await receiptModel.findByRoomId(roomId) as any[]

      res.json({
        receipts,
        summary: {
          count: receipts.length,
          totalAmount: receipts.reduce((sum, r) => sum + r.totalAmount, 0)
        }
      })
    })
  )

  router.get('/:roomId/settlements',
    checkRoomAccess(db),
    asyncHandler(async (req: ArchiveRequest, res) => {
      const roomId = toParam(req.params.roomId)
      const settlements = await settlementModel.getSettlementsByRoom(roomId) as any[]

      res.json({
        settlements,
        summary: {
          count: settlements.length,
          totalAmount: settlements.reduce((sum, s) => sum + s.amount, 0),
          completedCount: settlements.filter((s) => s.status === 'completed').length
        }
      })
    })
  )

  router.get('/:roomId/participants',
    checkRoomAccess(db),
    asyncHandler(async (req: ArchiveRequest, res) => {
      const roomId = toParam(req.params.roomId)
      const participants = await participantModel.findByRoomId(roomId) as any[]

      const participantBalances: Array<{ participant: any; balance: any }> = []
      for (const p of participants) {
        const balance = await participantModel.getParticipantBalance(p.id)
        participantBalances.push({ participant: p, balance })
      }

      res.json({
        participants: participantBalances,
        summary: {
          count: participants.length,
          adminCount: participants.filter((p) => p.isAdmin).length
        }
      })
    })
  )

  router.get('/:roomId/activities',
    checkRoomAccess(db),
    asyncHandler(async (req: ArchiveRequest, res) => {
      const roomId = toParam(req.params.roomId)
      const limitValue = Array.isArray(req.query.limit) ? req.query.limit[0] : req.query.limit
      const limit = Number.parseInt(String(limitValue || '100'), 10)

      const activities = await activityLogger.getRoomActivities(roomId, Number.isNaN(limit) ? 100 : limit)

      res.json({
        activities,
        summary: {
          count: activities.length
        }
      })
    })
  )

  router.get('/:roomId/stats',
    checkRoomAccess(db),
    asyncHandler(async (req: ArchiveRequest, res) => {
      const roomId = toParam(req.params.roomId)

      const roomStats = await roomModel.getRoomStats(roomId)
      const receiptStats = await receiptModel.getRoomReceiptStats(roomId)
      const settlement = await settlementModel.calculateOptimalSettlement(roomId) as any
      const participants = await participantModel.findByRoomId(roomId) as any[]

      const totalItems = await db.get<{ count: number }>(`
        SELECT COUNT(*) as count
        FROM receipt_items ri
        JOIN receipts r ON ri.receipt_id = r.id
        WHERE r.room_id = ?
      `, [roomId])

      const splitItems = await db.get<{ count: number }>(`
        SELECT COUNT(DISTINCT item_id) as count
        FROM splits s
        JOIN receipt_items ri ON s.item_id = ri.id
        JOIN receipts r ON ri.receipt_id = r.id
        WHERE r.room_id = ?
      `, [roomId])

      const totalItemCount = totalItems?.count || 0
      const splitItemCount = splitItems?.count || 0
      const splitCoverage = totalItemCount > 0 ? (splitItemCount / totalItemCount) * 100 : 0

      const stats = {
        room: roomStats,
        receipts: receiptStats,
        participants: {
          total: participants.length,
          admins: participants.filter((p) => p.isAdmin).length
        },
        settlement: {
          totalTransactions: settlement.settlements.length,
          totalAmount: settlement.totalAmount,
          balancedParticipants: settlement.balances.filter((b: any) => Math.abs(b.balance) < 0.01).length
        },
        progress: {
          splitCoverage: Math.round(splitCoverage * 100) / 100,
          itemsTotal: totalItemCount,
          itemsSplit: splitItemCount
        }
      }

      res.json({ stats })
    })
  )

  router.get('/:roomId/export/:format',
    checkRoomAccess(db),
    asyncHandler(async (req: ArchiveRequest, res) => {
      const roomId = toParam(req.params.roomId)
      const format = toParam(req.params.format)
      const participant = getParticipant(req)

      if (!['json', 'csv'].includes(format)) {
        res.status(400).json({ error: 'Unsupported format. Use json or csv' })
        return
      }

      const room = await roomModel.findById(roomId)
      const participants = await participantModel.findByRoomId(roomId)
      const receipts = await receiptModel.findByRoomId(roomId)
      const settlements = await settlementModel.getSettlementsByRoom(roomId) as any[]
      const finalSettlement = await settlementModel.calculateOptimalSettlement(roomId)

      if (format === 'json') {
        const exportData = {
          room,
          participants,
          receipts,
          settlements,
          finalSettlement,
          exportedAt: new Date().toISOString(),
          exportedBy: participant.name
        }

        res.setHeader('Content-Type', 'application/json')
        res.setHeader('Content-Disposition', `attachment; filename="paysplit_${roomId}_${Date.now()}.json"`)
        res.json(exportData)
      } else {
        let csv = 'From,To,Amount,Status,Created,Completed\n'
        for (const settlement of settlements) {
          csv += `"${settlement.from_participant_name}","${settlement.to_participant_name}",${settlement.amount},"${settlement.status}","${settlement.created_at}","${settlement.completed_at || ''}"\n`
        }

        res.setHeader('Content-Type', 'text/csv')
        res.setHeader('Content-Disposition', `attachment; filename="paysplit_settlements_${roomId}_${Date.now()}.csv"`)
        res.send(csv)
      }

      await activityLogger.logActivity(roomId, participant.id, 'data_exported', { format })
    })
  )

  return router
}
