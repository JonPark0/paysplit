import express from 'express'
import { v4 as uuidv4 } from 'uuid'
import { asyncHandler } from '../middleware/errorHandler.js'
import { validate, roomSchemas, sanitizeBody } from '../middleware/validation.js'
import { checkRoomAccess, generateSessionToken } from '../middleware/auth.js'
import { ActivityLogger } from '../middleware/logger.js'
import { verifyRecaptchaRoomCreate, verifyRecaptchaRoomJoin } from '../middleware/recaptcha.js'
import QRCode from 'qrcode'
import Room from '../models/Room.js'
import Participant from '../models/Participant.js'

const router = express.Router()

export default function(db) {
  const roomModel = new Room(db)
  const participantModel = new Participant(db)
  const activityLogger = new ActivityLogger(db)

  // Create new room
  router.post('/create', 
    sanitizeBody,
    validate(roomSchemas.create),
    verifyRecaptchaRoomCreate,
    asyncHandler(async (req, res) => {
      const { name, adminName, password, language } = req.body

      // Create room
      const room = await roomModel.create({
        name,
        adminName,
        password,
        language
      })

      // Create admin participant
      const admin = await participantModel.create({
        roomId: room.id,
        name: adminName,
        password,
        isAdmin: true
      })

      // Generate session token
      const sessionToken = generateSessionToken()
      const expiresAt = new Date()
      expiresAt.setDate(expiresAt.getDate() + 7) // 7 days

      // Create session
      await db.run(`
        INSERT INTO sessions (id, room_id, participant_id, token, expires_at)
        VALUES (?, ?, ?, ?, ?)
      `, [
        uuidv4(),
        room.id,
        admin.id,
        sessionToken,
        expiresAt.toISOString()
      ])

      // Log activity
      await activityLogger.logActivity(
        room.id,
        admin.id,
        'room_created',
        { roomName: name }
      )

      res.status(201).json({
        room: {
          id: room.id,
          name: room.name,
          entryCode: room.entryCode,
          language: room.language,
          adminName: room.adminName
        },
        participant: {
          id: admin.id,
          name: admin.name,
          isAdmin: true
        },
        sessionToken
      })
    })
  )

  // Join room
  router.post('/join',
    sanitizeBody,
    validate(roomSchemas.join),
    verifyRecaptchaRoomJoin,
    asyncHandler(async (req, res) => {
      const { entryCode, participantName, password } = req.body

      // Find room by entry code
      const room = await roomModel.findByEntryCode(entryCode)
      if (!room) {
        return res.status(404).json({ error: 'Room not found' })
      }

      // Check if participant name already exists
      const existingParticipant = await participantModel.findByRoomAndName(room.id, participantName)
      if (existingParticipant) {
        // Verify password for existing participant
        const isValidPassword = await participantModel.verifyPassword(existingParticipant.id, password)
        if (!isValidPassword) {
          return res.status(401).json({ error: 'Incorrect password' })
        }

        // Generate new session for existing participant
        const sessionToken = generateSessionToken()
        const expiresAt = new Date()
        expiresAt.setDate(expiresAt.getDate() + 7)

        await db.run(`
          INSERT INTO sessions (id, room_id, participant_id, token, expires_at)
          VALUES (?, ?, ?, ?, ?)
        `, [
          uuidv4(),
          room.id,
          existingParticipant.id,
          sessionToken,
          expiresAt.toISOString()
        ])

        // Update room activity
        await roomModel.updateLastActivity(room.id)

        return res.json({
          room: {
            id: room.id,
            name: room.name,
            language: room.language
          },
          participant: {
            id: existingParticipant.id,
            name: existingParticipant.name,
            isAdmin: existingParticipant.isAdmin
          },
          sessionToken
        })
      }

      // Create new participant
      const participant = await participantModel.create({
        roomId: room.id,
        name: participantName,
        password,
        isAdmin: false
      })

      // Generate session token
      const sessionToken = generateSessionToken()
      const expiresAt = new Date()
      expiresAt.setDate(expiresAt.getDate() + 7)

      await db.run(`
        INSERT INTO sessions (id, room_id, participant_id, token, expires_at)
        VALUES (?, ?, ?, ?, ?)
      `, [
        uuidv4(),
        room.id,
        participant.id,
        sessionToken,
        expiresAt.toISOString()
      ])

      // Update room activity
      await roomModel.updateLastActivity(room.id)

      // Log activity
      await activityLogger.logActivity(
        room.id,
        participant.id,
        'participant_joined',
        { participantName }
      )

      res.status(201).json({
        room: {
          id: room.id,
          name: room.name,
          language: room.language
        },
        participant: {
          id: participant.id,
          name: participant.name,
          isAdmin: false
        },
        sessionToken
      })
    })
  )

  // Get room details
  router.get('/:roomId',
    checkRoomAccess(db),
    asyncHandler(async (req, res) => {
      const { roomId } = req.params
      const room = await roomModel.findById(roomId)
      const participants = await participantModel.findByRoomId(roomId)
      const stats = await roomModel.getRoomStats(roomId)

      res.json({
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
        stats
      })
    })
  )

  // Get room participants
  router.get('/:roomId/participants',
    checkRoomAccess(db),
    asyncHandler(async (req, res) => {
      const { roomId } = req.params
      const participants = await participantModel.findByRoomId(roomId)

      res.json({ participants })
    })
  )

  // Update room settlement status
  router.patch('/:roomId/status',
    checkRoomAccess(db),
    sanitizeBody,
    validate(roomSchemas.updateStatus),
    asyncHandler(async (req, res) => {
      const { roomId } = req.params
      const { status } = req.body
      const { participant } = req

      // Only admin can change status
      if (!participant.isAdmin) {
        return res.status(403).json({ error: 'Admin access required' })
      }

      await roomModel.updateSettlementStatus(roomId, status)
      await roomModel.updateLastActivity(roomId)

      // Log activity
      await activityLogger.logActivity(
        roomId,
        participant.id,
        'status_changed',
        { oldStatus: req.room?.settlementStatus, newStatus: status }
      )

      res.json({ status })
    })
  )

  // Get room info (public, for join page)
  router.get('/:roomId/info',
    asyncHandler(async (req, res) => {
      const { roomId } = req.params
      
      const room = await roomModel.findById(roomId)
      if (!room) {
        return res.status(404).json({ error: 'Room not found' })
      }

      // Get participant count
      const participantCount = await db.get(`
        SELECT COUNT(*) as count FROM participants WHERE room_id = ?
      `, [roomId])

      // Get total amount from receipts
      const totalAmount = await db.get(`
        SELECT COALESCE(SUM(total_amount), 0) as total FROM receipts WHERE room_id = ?
      `, [roomId])

      res.json({
        room: {
          id: room.id,
          name: room.name,
          language: room.language,
          entryCode: room.entryCode,
          participantCount: participantCount?.count || 0,
          totalAmount: totalAmount?.total || 0
        }
      })
    })
  )

  // Generate QR code for room
  router.get('/:roomId/qr',
    checkRoomAccess(db),
    asyncHandler(async (req, res) => {
      const { roomId } = req.params
      const room = await roomModel.findById(roomId)
      
      const roomUrl = `${process.env.CORS_ORIGIN}/join/${roomId}`
      
      try {
        const qrCodeDataUrl = await QRCode.toDataURL(roomUrl, {
          errorCorrectionLevel: 'M',
          type: 'image/png',
          quality: 0.92,
          margin: 1,
          color: {
            dark: '#2563EB',
            light: '#FFFFFF'
          },
          width: 256
        })

        res.json({
          qrCode: qrCodeDataUrl,
          url: roomUrl,
          entryCode: room.entryCode
        })
      } catch (error) {
        return res.status(500).json({ error: 'Failed to generate QR code' })
      }
    })
  )

  // Get room activity logs
  router.get('/:roomId/activities',
    checkRoomAccess(db),
    asyncHandler(async (req, res) => {
      const { roomId } = req.params
      const { limit = 50 } = req.query

      const activities = await activityLogger.getRoomActivities(roomId, parseInt(limit))

      res.json({ logs: activities })
    })
  )

  // Download room archive
  router.get('/:roomId/archive',
    checkRoomAccess(db),
    asyncHandler(async (req, res) => {
      const { roomId } = req.params
      const { format = 'json' } = req.query

      // Get comprehensive room data
      const [room, participants, receipts, settlements, activities] = await Promise.all([
        roomModel.findById(roomId),
        db.all('SELECT id, name, is_admin, created_at FROM participants WHERE room_id = ?', [roomId]),
        db.all(`
          SELECT r.*, p.name as uploader_name,
                 GROUP_CONCAT(
                   json_object(
                     'id', ri.id,
                     'name', ri.name,
                     'price', ri.price,
                     'quantity', ri.quantity,
                     'category', ri.category
                   )
                 ) as items
          FROM receipts r
          LEFT JOIN participants p ON r.uploader_id = p.id
          LEFT JOIN receipt_items ri ON r.id = ri.receipt_id
          WHERE r.room_id = ?
          GROUP BY r.id
          ORDER BY r.created_at DESC
        `, [roomId]),
        db.all(`
          SELECT s.*, 
                 from_p.name as from_name,
                 to_p.name as to_name
          FROM settlements s
          LEFT JOIN participants from_p ON s.from_participant_id = from_p.id
          LEFT JOIN participants to_p ON s.to_participant_id = to_p.id
          WHERE s.room_id = ?
          ORDER BY s.created_at DESC
        `, [roomId]),
        activityLogger.getRoomActivities(roomId, 1000)
      ])

      const archiveData = {
        room: {
          id: room.id,
          name: room.name,
          entryCode: room.entryCode,
          language: room.language,
          status: room.status,
          createdAt: room.createdAt
        },
        participants,
        receipts: receipts.map(r => ({
          ...r,
          items: r.items ? JSON.parse(`[${r.items}]`) : []
        })),
        settlements,
        activities,
        generatedAt: new Date().toISOString(),
        totalReceiptAmount: receipts.reduce((sum, r) => sum + (r.total_amount || 0), 0)
      }

      if (format === 'summary') {
        // Return only summary data
        const summary = {
          room: archiveData.room,
          summary: {
            totalParticipants: participants.length,
            totalReceipts: receipts.length,
            totalAmount: archiveData.totalReceiptAmount,
            settlementStatus: room.status
          },
          finalBalances: participants.map(p => {
            const paid = receipts
              .filter(r => r.uploader_id === p.id)
              .reduce((sum, r) => sum + r.total_amount, 0)
            const settled = settlements
              .filter(s => s.from_participant_id === p.id && s.status === 'completed')
              .reduce((sum, s) => sum + s.amount, 0)
            return {
              name: p.name,
              paid,
              settled,
              balance: paid - settled
            }
          }),
          generatedAt: archiveData.generatedAt
        }
        res.json({ data: summary })
      } else {
        res.json({ data: archiveData })
      }
    })
  )

  return router
}