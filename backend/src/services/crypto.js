import crypto from 'crypto'
import fs from 'fs/promises'
import path from 'path'

// File encryption service using AES-256-GCM
export class FileEncryption {
  constructor() {
    this.algorithm = 'aes-256-gcm'
    this.keyLength = 32 // 256 bits
    this.ivLength = 16  // 128 bits
    this.tagLength = 16 // 128 bits
    this.key = this.generateKey()
  }

  generateKey() {
    const keyString = process.env.ENCRYPTION_KEY || 'default-encryption-key-change-in-production'
    return crypto.createHash('sha256').update(keyString).digest()
  }

  async encryptFile(inputBuffer, originalFilename) {
    try {
      // Generate random IV
      const iv = crypto.randomBytes(this.ivLength)
      
      // Create cipher
      const cipher = crypto.createCipher(this.algorithm, this.key, iv)
      
      // Encrypt the file
      const encrypted = Buffer.concat([
        cipher.update(inputBuffer),
        cipher.final()
      ])
      
      // Get authentication tag
      const authTag = cipher.getAuthTag()
      
      // Combine IV, authTag, and encrypted data
      const result = Buffer.concat([iv, authTag, encrypted])
      
      // Generate encrypted filename
      const ext = path.extname(originalFilename)
      const timestamp = Date.now()
      const randomString = crypto.randomBytes(8).toString('hex')
      const encryptedFilename = `${timestamp}_${randomString}${ext}.enc`
      
      return {
        encryptedData: result,
        encryptedFilename,
        originalFilename
      }
    } catch (error) {
      console.error('File encryption failed:', error)
      throw new Error('File encryption failed')
    }
  }

  async decryptFile(encryptedBuffer) {
    try {
      // Extract IV, authTag, and encrypted data
      const iv = encryptedBuffer.slice(0, this.ivLength)
      const authTag = encryptedBuffer.slice(this.ivLength, this.ivLength + this.tagLength)
      const encrypted = encryptedBuffer.slice(this.ivLength + this.tagLength)
      
      // Create decipher
      const decipher = crypto.createDecipher(this.algorithm, this.key, iv)
      decipher.setAuthTag(authTag)
      
      // Decrypt the file
      const decrypted = Buffer.concat([
        decipher.update(encrypted),
        decipher.final()
      ])
      
      return decrypted
    } catch (error) {
      console.error('File decryption failed:', error)
      throw new Error('File decryption failed')
    }
  }

  async saveEncryptedFile(encryptedData, filename) {
    try {
      const uploadPath = process.env.UPLOAD_PATH || './uploads'
      const filePath = path.join(uploadPath, filename)
      
      // Ensure upload directory exists
      await fs.mkdir(uploadPath, { recursive: true })
      
      // Save encrypted file
      await fs.writeFile(filePath, encryptedData)
      
      return filePath
    } catch (error) {
      console.error('Failed to save encrypted file:', error)
      throw new Error('Failed to save encrypted file')
    }
  }

  async loadEncryptedFile(filename) {
    try {
      const uploadPath = process.env.UPLOAD_PATH || './uploads'
      const filePath = path.join(uploadPath, filename)
      
      const encryptedData = await fs.readFile(filePath)
      return encryptedData
    } catch (error) {
      console.error('Failed to load encrypted file:', error)
      throw new Error('Failed to load encrypted file')
    }
  }

  async deleteEncryptedFile(filename) {
    try {
      const uploadPath = process.env.UPLOAD_PATH || './uploads'
      const filePath = path.join(uploadPath, filename)
      
      await fs.unlink(filePath)
    } catch (error) {
      console.error('Failed to delete encrypted file:', error)
      // Don't throw error as file might already be deleted
    }
  }
}

export default new FileEncryption()