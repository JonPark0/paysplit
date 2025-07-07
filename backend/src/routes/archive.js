import express from 'express'
import { asyncHandler } from '../middleware/errorHandler.js'
import { checkRoomAccess } from '../middleware/auth.js'
import { ActivityLogger } from '../middleware/logger.js'
import { createRequire } from 'module'

const require = createRequire(import.meta.url)
const Room = require('../models/Room.js')
const Receipt = require('../models/Receipt.js')
const Settlement = require('../models/Settlement.js')
const Participant = require('../models/Participant.js')

const router = express.Router()

export default function(db) {
  const roomModel = new Room(db)
  const receiptModel = new Receipt(db)
  const settlementModel = new Settlement(db)
  const participantModel = new Participant(db)
  const activityLogger = new ActivityLogger(db)

  // Get complete room data for archiving
  router.get('/:roomId/complete',
    checkRoomAccess(db),
    asyncHandler(async (req, res) => {
      const { roomId } = req.params
      const { participant } = req

      // Get room details
      const room = await roomModel.findById(roomId)
      if (!room) {
        return res.status(404).json({ error: 'Room not found' })
      }

      // Get participants
      const participants = await participantModel.findByRoomId(roomId)

      // Get receipts with items
      const receipts = await receiptModel.findByRoomId(roomId)

      // Get settlements
      const settlements = await settlementModel.getSettlementsByRoom(roomId)

      // Get activity logs
      const activities = await activityLogger.getRoomActivities(roomId, 100)

      // Calculate final settlement
      const finalSettlement = await settlementModel.calculateOptimalSettlement(roomId)

      // Get participant balances
      const participantBalances = []
      for (const p of participants) {
        const balance = await participantModel.getParticipantBalance(p.id)
        participantBalances.push({
          participant: p,
          balance
        })
      }

      // Update room activity
      await roomModel.updateLastActivity(roomId)

      // Log activity
      await activityLogger.logActivity(
        roomId,
        participant.id,
        'archive_accessed'
      )

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
          completedSettlements: settlements.filter(s => s.status === 'completed').length
        },
        exportedAt: new Date().toISOString(),
        exportedBy: participant.name
      }

      res.json({ archive: archiveData })
    })
  )

  // Get specific data types for selective export
  router.get('/:roomId/receipts',
    checkRoomAccess(db),
    asyncHandler(async (req, res) => {
      const { roomId } = req.params
      const receipts = await receiptModel.findByRoomId(roomId)

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
    asyncHandler(async (req, res) => {
      const { roomId } = req.params
      const settlements = await settlementModel.getSettlementsByRoom(roomId)

      res.json({
        settlements,
        summary: {
          count: settlements.length,
          totalAmount: settlements.reduce((sum, s) => sum + s.amount, 0),
          completedCount: settlements.filter(s => s.status === 'completed').length
        }
      })
    })
  )

  router.get('/:roomId/participants',
    checkRoomAccess(db),
    asyncHandler(async (req, res) => {
      const { roomId } = req.params
      const participants = await participantModel.findByRoomId(roomId)

      // Get balances for each participant
      const participantBalances = []
      for (const p of participants) {
        const balance = await participantModel.getParticipantBalance(p.id)
        participantBalances.push({
          participant: p,
          balance
        })
      }

      res.json({
        participants: participantBalances,
        summary: {
          count: participants.length,
          adminCount: participants.filter(p => p.isAdmin).length
        }
      })
    })
  )

  router.get('/:roomId/activities',
    checkRoomAccess(db),
    asyncHandler(async (req, res) => {
      const { roomId } = req.params
      const { limit = 100 } = req.query

      const activities = await activityLogger.getRoomActivities(roomId, parseInt(limit))

      res.json({
        activities,
        summary: {
          count: activities.length
        }
      })
    })
  )

  // Get room statistics
  router.get('/:roomId/stats',
    checkRoomAccess(db),
    asyncHandler(async (req, res) => {
      const { roomId } = req.params

      // Get basic room stats
      const roomStats = await roomModel.getRoomStats(roomId)

      // Get receipt stats
      const receiptStats = await receiptModel.getRoomReceiptStats(roomId)

      // Get settlement calculation
      const settlement = await settlementModel.calculateOptimalSettlement(roomId)

      // Get participant count
      const participants = await participantModel.findByRoomId(roomId)

      // Calculate split coverage (percentage of items that have been split)
      const totalItems = await db.get(`
        SELECT COUNT(*) as count
        FROM receipt_items ri
        JOIN receipts r ON ri.receipt_id = r.id
        WHERE r.room_id = ?
      `, [roomId])

      const splitItems = await db.get(`
        SELECT COUNT(DISTINCT item_id) as count
        FROM splits s
        JOIN receipt_items ri ON s.item_id = ri.id
        JOIN receipts r ON ri.receipt_id = r.id
        WHERE r.room_id = ?
      `, [roomId])

      const splitCoverage = totalItems.count > 0 ? 
        (splitItems.count / totalItems.count) * 100 : 0

      const stats = {
        room: roomStats,
        receipts: receiptStats,
        participants: {
          total: participants.length,
          admins: participants.filter(p => p.isAdmin).length
        },
        settlement: {
          totalTransactions: settlement.settlements.length,
          totalAmount: settlement.totalAmount,
          balancedParticipants: settlement.balances.filter(b => Math.abs(b.balance) < 0.01).length
        },
        progress: {
          splitCoverage: Math.round(splitCoverage * 100) / 100,
          itemsTotal: totalItems.count,
          itemsSplit: splitItems.count
        }
      }

      res.json({ stats })
    })
  )

  // Export data in different formats
  router.get('/:roomId/export/:format',
    checkRoomAccess(db),
    asyncHandler(async (req, res) => {
      const { roomId, format } = req.params
      const { participant } = req

      if (!['json', 'csv'].includes(format)) {
        return res.status(400).json({ error: 'Unsupported format. Use json or csv' })
      }

      // Get complete room data
      const room = await roomModel.findById(roomId)
      const participants = await participantModel.findByRoomId(roomId)
      const receipts = await receiptModel.findByRoomId(roomId)
      const settlements = await settlementModel.getSettlementsByRoom(roomId)
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

      } else if (format === 'csv') {
        // Generate CSV format for settlements
        let csv = 'From,To,Amount,Status,Created,Completed\n'
        
        for (const settlement of settlements) {
          csv += `"${settlement.from_participant_name}","${settlement.to_participant_name}",${settlement.amount},"${settlement.status}","${settlement.created_at}","${settlement.completed_at || ''}"\n`
        }

        res.setHeader('Content-Type', 'text/csv')
        res.setHeader('Content-Disposition', `attachment; filename="paysplit_settlements_${roomId}_${Date.now()}.csv"`)
        res.send(csv)
      }

      // Log activity
      await activityLogger.logActivity(
        roomId,
        participant.id,
        'data_exported',
        { format }
      )
    })
  )

  return router
}