import fs from 'fs/promises'
import path from 'path'
import { createRequire } from 'module'

const require = createRequire(import.meta.url)
const Room = require('../models/Room.js')

// Cleanup expired rooms and associated data
export const cleanupExpiredRooms = async (db) => {
  try {
    const roomModel = new Room(db)
    const expiredRooms = await roomModel.findExpiredRooms()
    
    if (expiredRooms.length === 0) {
      console.log('No expired rooms found')
      return
    }

    console.log(`Found ${expiredRooms.length} expired rooms to clean up`)

    for (const room of expiredRooms) {
      try {
        await cleanupRoomData(db, room.id)
        console.log(`Cleaned up room: ${room.name || room.id}`)
      } catch (error) {
        console.error(`Failed to cleanup room ${room.id}:`, error)
      }
    }

    console.log('Cleanup completed successfully')
  } catch (error) {
    console.error('Cleanup process failed:', error)
    throw error
  }
}

// Clean up all data associated with a room
const cleanupRoomData = async (db, roomId) => {
  // Get all encrypted files associated with the room
  const receipts = await db.all(`
    SELECT encrypted_filename FROM receipts 
    WHERE room_id = ? AND encrypted_filename IS NOT NULL
  `, [roomId])

  // Delete encrypted files from filesystem
  const uploadPath = process.env.UPLOAD_PATH || './uploads'
  for (const receipt of receipts) {
    try {
      const filePath = path.join(uploadPath, receipt.encrypted_filename)
      await fs.unlink(filePath)
      console.log(`Deleted file: ${receipt.encrypted_filename}`)
    } catch (error) {
      // File might already be deleted, log but continue
      console.warn(`Could not delete file ${receipt.encrypted_filename}:`, error.message)
    }
  }

  // Delete room from database (CASCADE will handle related records)
  await db.run('DELETE FROM rooms WHERE id = ?', [roomId])
}

// Clean up orphaned files (files without corresponding database records)
export const cleanupOrphanedFiles = async (db) => {
  try {
    const uploadPath = process.env.UPLOAD_PATH || './uploads'
    
    // Get all files from filesystem
    const files = await fs.readdir(uploadPath)
    
    // Get all encrypted filenames from database
    const dbFiles = await db.all(`
      SELECT DISTINCT encrypted_filename 
      FROM receipts 
      WHERE encrypted_filename IS NOT NULL
    `)
    
    const dbFilenames = new Set(dbFiles.map(f => f.encrypted_filename))
    
    // Find orphaned files
    const orphanedFiles = files.filter(file => 
      file !== '.gitkeep' && !dbFilenames.has(file)
    )
    
    if (orphanedFiles.length === 0) {
      console.log('No orphaned files found')
      return
    }

    console.log(`Found ${orphanedFiles.length} orphaned files`)

    // Delete orphaned files
    for (const filename of orphanedFiles) {
      try {
        const filePath = path.join(uploadPath, filename)
        await fs.unlink(filePath)
        console.log(`Deleted orphaned file: ${filename}`)
      } catch (error) {
        console.error(`Failed to delete orphaned file ${filename}:`, error)
      }
    }

    console.log('Orphaned file cleanup completed')
  } catch (error) {
    console.error('Orphaned file cleanup failed:', error)
    throw error
  }
}

// Clean up expired sessions
export const cleanupExpiredSessions = async (db) => {
  try {
    const result = await db.run(`
      DELETE FROM sessions 
      WHERE expires_at < ?
    `, [new Date().toISOString()])

    console.log(`Cleaned up ${result.changes} expired sessions`)
  } catch (error) {
    console.error('Session cleanup failed:', error)
    throw error
  }
}

// Complete cleanup process
export const runCompleteCleanup = async (db) => {
  console.log('Starting complete cleanup process...')
  
  await cleanupExpiredRooms(db)
  await cleanupExpiredSessions(db)
  await cleanupOrphanedFiles(db)
  
  console.log('Complete cleanup process finished')
}