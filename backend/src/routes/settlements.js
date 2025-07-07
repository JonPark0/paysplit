import express from 'express'
import { asyncHandler } from '../middleware/errorHandler.js'
import { validate, splitSchemas, settlementSchemas, sanitizeBody } from '../middleware/validation.js'
import { checkRoomAccess } from '../middleware/auth.js'
import { ActivityLogger } from '../middleware/logger.js'
import Settlement from '../models/Settlement.js'
import Room from '../models/Room.js'
import Participant from '../models/Participant.js'

const router = express.Router()

export default function(db) {
  const settlementModel = new Settlement(db)
  const roomModel = new Room(db)
  const activityLogger = new ActivityLogger(db)

  // Create split for an item
  router.post('/:roomId/splits',
    checkRoomAccess(db),
    sanitizeBody,
    validate(splitSchemas.create),
    asyncHandler(async (req, res) => {
      const { roomId } = req.params
      const { participant } = req
      const { itemId, participantId, amount } = req.body

      // Verify the item belongs to the room
      const item = await db.get(`
        SELECT ri.*, r.room_id 
        FROM receipt_items ri
        JOIN receipts r ON ri.receipt_id = r.id
        WHERE ri.id = ?
      `, [itemId])

      if (!item || item.room_id !== roomId) {
        return res.status(404).json({ error: 'Item not found or does not belong to this room' })
      }

      // Verify the participant belongs to the room
      const targetParticipant = await db.get(`
        SELECT * FROM participants WHERE id = ? AND room_id = ?
      `, [participantId, roomId])

      if (!targetParticipant) {
        return res.status(404).json({ error: 'Participant not found in this room' })
      }

      // Create split
      const split = await settlementModel.createSplit({
        itemId,
        participantId,
        amount
      })

      // Update room activity
      await roomModel.updateLastActivity(roomId)

      // Log activity
      await activityLogger.logActivity(
        roomId,
        participant.id,
        'split_created',
        {
          splitId: split.id,
          itemId,
          participantId,
          amount
        }
      )

      res.status(201).json({ split })
    })
  )

  // Create multiple splits (bulk operation)
  router.post('/:roomId/splits/bulk',
    checkRoomAccess(db),
    sanitizeBody,
    validate(splitSchemas.bulk),
    asyncHandler(async (req, res) => {
      const { roomId } = req.params
      const { participant } = req
      const { splits } = req.body

      // Validate all items and participants belong to the room
      for (const split of splits) {
        const item = await db.get(`
          SELECT ri.*, r.room_id 
          FROM receipt_items ri
          JOIN receipts r ON ri.receipt_id = r.id
          WHERE ri.id = ?
        `, [split.itemId])

        if (!item || item.room_id !== roomId) {
          return res.status(400).json({ 
            error: `Item ${split.itemId} not found or does not belong to this room` 
          })
        }

        const targetParticipant = await db.get(`
          SELECT * FROM participants WHERE id = ? AND room_id = ?
        `, [split.participantId, roomId])

        if (!targetParticipant) {
          return res.status(400).json({ 
            error: `Participant ${split.participantId} not found in this room` 
          })
        }
      }

      // Create all splits
      const createdSplits = []
      for (const splitData of splits) {
        const split = await settlementModel.createSplit(splitData)
        createdSplits.push(split)
      }

      // Update room activity
      await roomModel.updateLastActivity(roomId)

      // Log activity
      await activityLogger.logActivity(
        roomId,
        participant.id,
        'bulk_splits_created',
        {
          splitCount: createdSplits.length,
          totalAmount: splits.reduce((sum, s) => sum + s.amount, 0)
        }
      )

      res.status(201).json({ splits: createdSplits })
    })
  )

  // Update split amount
  router.put('/:roomId/splits/:splitId',
    checkRoomAccess(db),
    sanitizeBody,
    validate(splitSchemas.update),
    asyncHandler(async (req, res) => {
      const { roomId, splitId } = req.params
      const { participant } = req
      const { amount } = req.body

      // Verify split exists and belongs to the room
      const split = await db.get(`
        SELECT s.*, ri.receipt_id, r.room_id
        FROM splits s
        JOIN receipt_items ri ON s.item_id = ri.id
        JOIN receipts r ON ri.receipt_id = r.id
        WHERE s.id = ?
      `, [splitId])

      if (!split || split.room_id !== roomId) {
        return res.status(404).json({ error: 'Split not found' })
      }

      // Update split
      await settlementModel.updateSplit(splitId, amount)

      // Update room activity
      await roomModel.updateLastActivity(roomId)

      // Log activity
      await activityLogger.logActivity(
        roomId,
        participant.id,
        'split_updated',
        {
          splitId,
          oldAmount: split.amount,
          newAmount: amount
        }
      )

      res.json({ message: 'Split updated successfully' })
    })
  )

  // Delete split
  router.delete('/:roomId/splits/:splitId',
    checkRoomAccess(db),
    asyncHandler(async (req, res) => {
      const { roomId, splitId } = req.params
      const { participant } = req

      // Verify split exists and belongs to the room
      const split = await db.get(`
        SELECT s.*, ri.receipt_id, r.room_id
        FROM splits s
        JOIN receipt_items ri ON s.item_id = ri.id
        JOIN receipts r ON ri.receipt_id = r.id
        WHERE s.id = ?
      `, [splitId])

      if (!split || split.room_id !== roomId) {
        return res.status(404).json({ error: 'Split not found' })
      }

      // Delete split
      await settlementModel.deleteSplit(splitId)

      // Update room activity
      await roomModel.updateLastActivity(roomId)

      // Log activity
      await activityLogger.logActivity(
        roomId,
        participant.id,
        'split_deleted',
        {
          splitId,
          amount: split.amount
        }
      )

      res.json({ message: 'Split deleted successfully' })
    })
  )

  // Get splits for an item
  router.get('/:roomId/items/:itemId/splits',
    checkRoomAccess(db),
    asyncHandler(async (req, res) => {
      const { roomId, itemId } = req.params

      // Verify item belongs to the room
      const item = await db.get(`
        SELECT ri.*, r.room_id 
        FROM receipt_items ri
        JOIN receipts r ON ri.receipt_id = r.id
        WHERE ri.id = ?
      `, [itemId])

      if (!item || item.room_id !== roomId) {
        return res.status(404).json({ error: 'Item not found' })
      }

      const splits = await settlementModel.getSplitsByItem(itemId)

      res.json({ splits })
    })
  )

  // Calculate optimal settlement for room
  router.get('/:roomId/calculate',
    checkRoomAccess(db),
    asyncHandler(async (req, res) => {
      const { roomId } = req.params

      const settlement = await settlementModel.calculateOptimalSettlement(roomId)

      res.json({
        settlement: {
          balances: settlement.balances,
          transactions: settlement.settlements,
          totalAmount: settlement.totalAmount,
          transactionCount: settlement.settlements.length
        }
      })
    })
  )

  // Create settlement transactions
  router.post('/:roomId/settlements',
    checkRoomAccess(db),
    sanitizeBody,
    validate(settlementSchemas.create),
    asyncHandler(async (req, res) => {
      const { roomId } = req.params
      const { participant } = req
      const { fromParticipantId, toParticipantId, amount } = req.body

      // Verify participants belong to the room
      const fromParticipant = await db.get(`
        SELECT * FROM participants WHERE id = ? AND room_id = ?
      `, [fromParticipantId, roomId])

      const toParticipant = await db.get(`
        SELECT * FROM participants WHERE id = ? AND room_id = ?
      `, [toParticipantId, roomId])

      if (!fromParticipant || !toParticipant) {
        return res.status(400).json({ error: 'Invalid participants' })
      }

      // Create settlement
      const settlement = await settlementModel.createSettlement({
        roomId,
        fromParticipantId,
        toParticipantId,
        amount
      })

      // Update room activity
      await roomModel.updateLastActivity(roomId)

      // Log activity
      await activityLogger.logActivity(
        roomId,
        participant.id,
        'settlement_created',
        {
          settlementId: settlement.id,
          fromParticipant: fromParticipant.name,
          toParticipant: toParticipant.name,
          amount
        }
      )

      res.status(201).json({ settlement })
    })
  )

  // Update settlement status
  router.patch('/:roomId/settlements/:settlementId',
    checkRoomAccess(db),
    sanitizeBody,
    validate(settlementSchemas.updateStatus),
    asyncHandler(async (req, res) => {
      const { roomId, settlementId } = req.params
      const { participant } = req
      const { status } = req.body

      // Get settlement details
      const settlement = await db.get(`
        SELECT * FROM settlements WHERE id = ? AND room_id = ?
      `, [settlementId, roomId])

      if (!settlement) {
        return res.status(404).json({ error: 'Settlement not found' })
      }

      // Only the recipient can mark settlement as completed
      if (status === 'completed' && settlement.to_participant_id !== participant.id) {
        return res.status(403).json({ error: 'Only the recipient can mark settlement as completed' })
      }

      // Update settlement status
      const result = await settlementModel.updateSettlementStatus(
        settlementId,
        status,
        participant.id
      )

      // Update room activity
      await roomModel.updateLastActivity(roomId)

      // Log activity
      await activityLogger.logActivity(
        roomId,
        participant.id,
        'settlement_status_updated',
        {
          settlementId,
          status,
          amount: settlement.amount
        }
      )

      res.json({
        message: 'Settlement status updated successfully',
        status: result.status,
        completedAt: result.completedAt
      })
    })
  )

  // Get settlements for room
  router.get('/:roomId/settlements',
    checkRoomAccess(db),
    asyncHandler(async (req, res) => {
      const { roomId } = req.params
      const settlements = await settlementModel.getSettlementsByRoom(roomId)

      res.json({ settlements })
    })
  )

  // Get comprehensive settlements data (for Settlement component)
  router.get('/:roomId',
    checkRoomAccess(db),
    asyncHandler(async (req, res) => {
      const { roomId } = req.params
      
      // Get all settlement data
      const [settlements, balances, transactions] = await Promise.all([
        settlementModel.getSettlementsByRoom(roomId),
        settlementModel.getParticipantBalances(roomId),
        settlementModel.getOptimalTransactions(roomId)
      ])

      res.json({
        settlements: settlements || [],
        balances: balances || [],
        transactions: transactions || []
      })
    })
  )

  // Recalculate settlements
  router.post('/:roomId/recalculate',
    checkRoomAccess(db),
    asyncHandler(async (req, res) => {
      const { roomId } = req.params
      const { participant } = req

      // Recalculate optimal settlement
      const settlement = await settlementModel.calculateOptimalSettlement(roomId)

      // Update room activity
      await roomModel.updateLastActivity(roomId)

      // Log activity
      await activityLogger.logActivity(
        roomId,
        participant.id,
        'settlement_recalculated',
        {
          transactionCount: settlement.settlements.length,
          totalAmount: settlement.totalAmount
        }
      )

      res.json({
        message: 'Settlement recalculated successfully',
        settlement: {
          balances: settlement.balances,
          transactions: settlement.settlements,
          totalAmount: settlement.totalAmount,
          transactionCount: settlement.settlements.length
        }
      })
    })
  )

  // Delete settlement
  router.delete('/:roomId/settlements/:settlementId',
    checkRoomAccess(db),
    asyncHandler(async (req, res) => {
      const { roomId, settlementId } = req.params
      const { participant } = req

      // Get settlement details
      const settlement = await db.get(`
        SELECT * FROM settlements WHERE id = ? AND room_id = ?
      `, [settlementId, roomId])

      if (!settlement) {
        return res.status(404).json({ error: 'Settlement not found' })
      }

      // Only admin or involved participants can delete
      if (!participant.isAdmin && 
          settlement.from_participant_id !== participant.id && 
          settlement.to_participant_id !== participant.id) {
        return res.status(403).json({ error: 'Access denied' })
      }

      // Delete settlement
      await settlementModel.deleteSettlement(settlementId)

      // Update room activity
      await roomModel.updateLastActivity(roomId)

      // Log activity
      await activityLogger.logActivity(
        roomId,
        participant.id,
        'settlement_deleted',
        {
          settlementId,
          amount: settlement.amount
        }
      )

      res.json({ message: 'Settlement deleted successfully' })
    })
  )

  // Clear all splits for room (admin only)
  router.delete('/:roomId/splits',
    checkRoomAccess(db),
    asyncHandler(async (req, res) => {
      const { roomId } = req.params
      const { participant } = req

      // Only admin can clear all splits
      if (!participant.isAdmin) {
        return res.status(403).json({ error: 'Admin access required' })
      }

      // Clear all splits
      await settlementModel.clearAllSplits(roomId)

      // Update room activity
      await roomModel.updateLastActivity(roomId)

      // Log activity
      await activityLogger.logActivity(
        roomId,
        participant.id,
        'all_splits_cleared'
      )

      res.json({ message: 'All splits cleared successfully' })
    })
  )

  // Get participant balance and splits
  router.get('/:roomId/participants/:participantId/balance',
    checkRoomAccess(db),
    asyncHandler(async (req, res) => {
      const { roomId, participantId } = req.params

      // Verify participant belongs to the room
      const targetParticipant = await db.get(`
        SELECT * FROM participants WHERE id = ? AND room_id = ?
      `, [participantId, roomId])

      if (!targetParticipant) {
        return res.status(404).json({ error: 'Participant not found' })
      }

      // Get balance and splits
      const participantModel = new Participant(db)
      
      const balance = await participantModel.getParticipantBalance(participantId)
      const splits = await participantModel.getParticipantSplits(participantId)

      res.json({
        participant: {
          id: targetParticipant.id,
          name: targetParticipant.name
        },
        balance,
        splits
      })
    })
  )

  return router
}