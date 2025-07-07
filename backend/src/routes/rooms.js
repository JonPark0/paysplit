import express from 'express'
import { v4 as uuidv4 } from 'uuid'
import { asyncHandler } from '../middleware/errorHandler.js'
import { validate, roomSchemas, sanitizeBody } from '../middleware/validation.js'
import { checkRoomAccess, generateSessionToken } from '../middleware/auth.js'
import { ActivityLogger } from '../middleware/logger.js'
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

  // Generate QR code for room
  router.get('/:roomId/qr',
    checkRoomAccess(db),
    asyncHandler(async (req, res) => {
      const { roomId } = req.params
      const room = await roomModel.findById(roomId)
      
      const roomUrl = `${process.env.CORS_ORIGIN}/${room.language}/room/${roomId}`
      
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

      res.json({ activities })
    })
  )

  return router
}