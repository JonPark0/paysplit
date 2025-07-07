import express from 'express'
import { asyncHandler } from '../middleware/errorHandler.js'
import { validate, receiptSchemas, sanitizeBody } from '../middleware/validation.js'
import { checkRoomAccess } from '../middleware/auth.js'
import { uploadSingle, handleMulterError } from '../utils/multer.js'
import { ActivityLogger } from '../middleware/logger.js'
import Receipt from '../models/Receipt.js'
import ImageProcessor from '../services/imageProcessor.js'
import Room from '../models/Room.js'

const router = express.Router()

export default function(db) {
  const receiptModel = new Receipt(db)
  const roomModel = new Room(db)
  const activityLogger = new ActivityLogger(db)

  // Upload and process receipt
  router.post('/upload/:roomId',
    uploadSingle,
    handleMulterError,
    checkRoomAccess(db),
    asyncHandler(async (req, res) => {
      const { roomId } = req.params
      const { participant } = req

      if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' })
      }

      try {
        // Process and encrypt the uploaded file
        const processedFile = await ImageProcessor.processImage(
          req.file.buffer,
          req.file.originalname,
          req.file.mimetype
        )

        // Update room activity
        await roomModel.updateLastActivity(roomId)

        // Log activity
        await activityLogger.logActivity(
          roomId,
          participant.id,
          'receipt_uploaded',
          {
            filename: processedFile.originalFilename,
            fileSize: processedFile.fileSize
          }
        )

        res.status(201).json({
          message: 'File uploaded successfully',
          file: {
            originalFilename: processedFile.originalFilename,
            encryptedFilename: processedFile.encryptedFilename,
            fileSize: processedFile.fileSize,
            mimetype: processedFile.mimetype
          }
        })
      } catch (error) {
        console.error('File upload processing failed:', error)
        return res.status(500).json({
          error: 'File processing failed',
          message: error.message
        })
      }
    })
  )

  // Create receipt with items (manual entry or after OCR)
  router.post('/:roomId',
    checkRoomAccess(db),
    sanitizeBody,
    validate(receiptSchemas.create),
    asyncHandler(async (req, res) => {
      const { roomId } = req.params
      const { participant } = req
      const { totalAmount, currency, items, encryptedFilename, originalFilename } = req.body

      // Validate that total amount matches sum of items
      const calculatedTotal = items.reduce((sum, item) => 
        sum + (item.price * (item.quantity || 1)), 0
      )

      if (Math.abs(calculatedTotal - totalAmount) > 0.01) {
        return res.status(400).json({
          error: 'Total amount mismatch',
          message: `Calculated total (${calculatedTotal}) does not match provided total (${totalAmount})`
        })
      }

      // Create receipt
      const receipt = await receiptModel.create({
        roomId,
        uploaderId: participant.id,
        originalFilename: originalFilename || null,
        encryptedFilename: encryptedFilename || null,
        totalAmount,
        currency,
        items
      })

      // Update room activity
      await roomModel.updateLastActivity(roomId)

      // Log activity
      await activityLogger.logActivity(
        roomId,
        participant.id,
        'receipt_created',
        {
          receiptId: receipt.id,
          totalAmount,
          itemCount: items.length
        }
      )

      res.status(201).json({ receipt })
    })
  )

  // Get receipts for a room
  router.get('/:roomId',
    checkRoomAccess(db),
    asyncHandler(async (req, res) => {
      const { roomId } = req.params
      const receipts = await receiptModel.findByRoomId(roomId)

      res.json({ receipts })
    })
  )

  // Get specific receipt details
  router.get('/:roomId/:receiptId',
    checkRoomAccess(db),
    asyncHandler(async (req, res) => {
      const { receiptId } = req.params
      const receipt = await receiptModel.findById(receiptId)

      if (!receipt) {
        return res.status(404).json({ error: 'Receipt not found' })
      }

      // Check if receipt belongs to the room
      if (receipt.roomId !== req.params.roomId) {
        return res.status(403).json({ error: 'Access denied' })
      }

      res.json({ receipt })
    })
  )

  // Update receipt items
  router.put('/:roomId/:receiptId',
    checkRoomAccess(db),
    sanitizeBody,
    validate(receiptSchemas.update),
    asyncHandler(async (req, res) => {
      const { roomId, receiptId } = req.params
      const { participant } = req
      const { items, totalAmount } = req.body

      // Get existing receipt
      const receipt = await receiptModel.findById(receiptId)
      if (!receipt) {
        return res.status(404).json({ error: 'Receipt not found' })
      }

      // Check if receipt belongs to the room
      if (receipt.roomId !== roomId) {
        return res.status(403).json({ error: 'Access denied' })
      }

      // Only uploader or admin can edit
      if (receipt.uploaderId !== participant.id && !participant.isAdmin) {
        return res.status(403).json({ error: 'Only uploader or admin can edit receipt' })
      }

      let updatedItems = items
      let updatedTotal = totalAmount

      // If items are provided, validate and update
      if (items) {
        const calculatedTotal = items.reduce((sum, item) => 
          sum + (item.price * (item.quantity || 1)), 0
        )
        
        updatedTotal = calculatedTotal
        updatedItems = await receiptModel.updateItems(receiptId, items)
      }

      // Update room activity
      await roomModel.updateLastActivity(roomId)

      // Log activity
      await activityLogger.logActivity(
        roomId,
        participant.id,
        'receipt_updated',
        {
          receiptId,
          oldTotal: receipt.totalAmount,
          newTotal: updatedTotal
        }
      )

      res.json({
        message: 'Receipt updated successfully',
        receipt: {
          ...receipt,
          totalAmount: updatedTotal,
          items: updatedItems
        }
      })
    })
  )

  // Delete receipt
  router.delete('/:roomId/:receiptId',
    checkRoomAccess(db),
    asyncHandler(async (req, res) => {
      const { roomId, receiptId } = req.params
      const { participant } = req

      // Get existing receipt
      const receipt = await receiptModel.findById(receiptId)
      if (!receipt) {
        return res.status(404).json({ error: 'Receipt not found' })
      }

      // Check if receipt belongs to the room
      if (receipt.roomId !== roomId) {
        return res.status(403).json({ error: 'Access denied' })
      }

      // Only uploader or admin can delete
      if (receipt.uploaderId !== participant.id && !participant.isAdmin) {
        return res.status(403).json({ error: 'Only uploader or admin can delete receipt' })
      }

      // Delete encrypted file if exists
      if (receipt.encryptedFilename) {
        try {
          await ImageProcessor.deleteImage(receipt.encryptedFilename)
        } catch (error) {
          console.error('Failed to delete encrypted file:', error)
          // Continue with database deletion even if file deletion fails
        }
      }

      // Delete receipt from database
      await receiptModel.delete(receiptId)

      // Update room activity
      await roomModel.updateLastActivity(roomId)

      // Log activity
      await activityLogger.logActivity(
        roomId,
        participant.id,
        'receipt_deleted',
        {
          receiptId,
          filename: receipt.originalFilename
        }
      )

      res.json({ message: 'Receipt deleted successfully' })
    })
  )

  // Get receipt image
  router.get('/:roomId/:receiptId/image',
    checkRoomAccess(db),
    asyncHandler(async (req, res) => {
      const { receiptId } = req.params

      // Get receipt
      const receipt = await receiptModel.findById(receiptId)
      if (!receipt || !receipt.encryptedFilename) {
        return res.status(404).json({ error: 'Receipt image not found' })
      }

      try {
        // Get decrypted image buffer
        const imageBuffer = await ImageProcessor.getImageBuffer(receipt.encryptedFilename)
        
        // Set appropriate headers
        res.set({
          'Content-Type': 'image/webp',
          'Content-Length': imageBuffer.length,
          'Cache-Control': 'private, max-age=3600' // Cache for 1 hour
        })

        res.send(imageBuffer)
      } catch (error) {
        console.error('Failed to serve receipt image:', error)
        return res.status(500).json({ error: 'Failed to load image' })
      }
    })
  )

  // Get receipt thumbnail
  router.get('/:roomId/:receiptId/thumbnail',
    checkRoomAccess(db),
    asyncHandler(async (req, res) => {
      const { receiptId } = req.params
      const { width = 300, height = 300 } = req.query

      // Get receipt
      const receipt = await receiptModel.findById(receiptId)
      if (!receipt || !receipt.encryptedFilename) {
        return res.status(404).json({ error: 'Receipt image not found' })
      }

      try {
        // Get decrypted image buffer
        const imageBuffer = await ImageProcessor.getImageBuffer(receipt.encryptedFilename)
        
        // Generate thumbnail
        const thumbnail = await ImageProcessor.generateThumbnail(
          imageBuffer,
          parseInt(width),
          parseInt(height)
        )
        
        // Set appropriate headers
        res.set({
          'Content-Type': 'image/webp',
          'Content-Length': thumbnail.length,
          'Cache-Control': 'private, max-age=86400' // Cache for 24 hours
        })

        res.send(thumbnail)
      } catch (error) {
        console.error('Failed to generate thumbnail:', error)
        return res.status(500).json({ error: 'Failed to generate thumbnail' })
      }
    })
  )

  // Get receipt splits
  router.get('/:roomId/:receiptId/splits',
    checkRoomAccess(db),
    asyncHandler(async (req, res) => {
      const { receiptId } = req.params
      const splits = await receiptModel.getReceiptSplits(receiptId)

      res.json({ splits })
    })
  )

  return router
}