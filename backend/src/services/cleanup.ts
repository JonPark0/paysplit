import fs from 'fs/promises'
import path from 'path'
import type Database from '../utils/database.js'
import Room from '../models/Room.js'

interface ReceiptFileRow {
  encrypted_filename: string | null
}

interface DistinctFileRow {
  encrypted_filename: string | null
}

const getUploadPath = (): string => process.env.UPLOAD_PATH || './uploads'

export const cleanupExpiredRooms = async (db: Database): Promise<void> => {
  try {
    const roomModel = new Room(db)
    const expiredRooms = await roomModel.findExpiredRooms()

    if (expiredRooms.length === 0) {
      console.log('No expired rooms found')
      return
    }

    console.log(`Found ${expiredRooms.length} expired rooms to clean up`)

    for (const room of expiredRooms as Array<{ id: string; name: string | null }>) {
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

const cleanupRoomData = async (db: Database, roomId: string): Promise<void> => {
  const receipts = await db.all<ReceiptFileRow>(`
    SELECT encrypted_filename FROM receipts
    WHERE room_id = ? AND encrypted_filename IS NOT NULL
  `, [roomId])

  const uploadPath = getUploadPath()

  for (const receipt of receipts) {
    if (!receipt.encrypted_filename) {
      continue
    }

    try {
      const filePath = path.join(uploadPath, receipt.encrypted_filename)
      await fs.unlink(filePath)
      console.log(`Deleted file: ${receipt.encrypted_filename}`)
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      console.warn(`Could not delete file ${receipt.encrypted_filename}:`, message)
    }
  }

  await db.run('DELETE FROM rooms WHERE id = ?', [roomId])
}

export const cleanupOrphanedFiles = async (db: Database): Promise<void> => {
  try {
    const uploadPath = getUploadPath()
    const files = await fs.readdir(uploadPath)

    const dbFiles = await db.all<DistinctFileRow>(`
      SELECT DISTINCT encrypted_filename
      FROM receipts
      WHERE encrypted_filename IS NOT NULL
    `)

    const dbFilenames = new Set(dbFiles.map((file) => file.encrypted_filename).filter(Boolean) as string[])

    const orphanedFiles = files.filter((file) => file !== '.gitkeep' && !dbFilenames.has(file))

    if (orphanedFiles.length === 0) {
      console.log('No orphaned files found')
      return
    }

    console.log(`Found ${orphanedFiles.length} orphaned files`)

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

export const cleanupExpiredSessions = async (db: Database): Promise<void> => {
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

export const runCompleteCleanup = async (db: Database): Promise<void> => {
  console.log('Starting complete cleanup process...')

  await cleanupExpiredRooms(db)
  await cleanupExpiredSessions(db)
  await cleanupOrphanedFiles(db)

  console.log('Complete cleanup process finished')
}
