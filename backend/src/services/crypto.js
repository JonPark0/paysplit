import crypto from 'crypto'
import fs from 'fs/promises'
import path from 'path'

// File encryption service using AES-256-GCM
export class FileEncryption {
  constructor() {
    this.algorithm = 'aes-256-gcm'
    this.keyLength = 32 // 256 bits
    this.ivLength = 12  // 96 bits (recommended for GCM)
    this.versionPrefix = Buffer.from('PS2')
    this.tagLength = 16 // 128 bits
    this.key = null
  }

  getKey() {
    if (!this.key) {
      this.key = this.generateKey()
    }

    return this.key
  }

  generateKey() {
    const keyString = process.env.ENCRYPTION_KEY
    if (!keyString || keyString.length < 32) {
      throw new Error('ENCRYPTION_KEY must be set and at least 32 characters long')
    }
    return crypto.createHash('sha256').update(keyString).digest()
  }

  async encryptFile(inputBuffer, originalFilename) {
    try {
      // Generate random IV
      const iv = crypto.randomBytes(this.ivLength)
      
      // Create cipher
      const cipher = crypto.createCipheriv(this.algorithm, this.getKey(), iv)
      
      // Encrypt the file
      const encrypted = Buffer.concat([
        cipher.update(inputBuffer),
        cipher.final()
      ])
      
      // Get authentication tag
      const authTag = cipher.getAuthTag()
      
      // Combine IV, authTag, and encrypted data
      const result = Buffer.concat([this.versionPrefix, iv, authTag, encrypted])
      
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
      const hasV2Prefix = encryptedBuffer.subarray(0, this.versionPrefix.length).equals(this.versionPrefix)

      if (hasV2Prefix) {
        const payload = encryptedBuffer.subarray(this.versionPrefix.length)
        const iv = payload.slice(0, this.ivLength)
        const authTag = payload.slice(this.ivLength, this.ivLength + this.tagLength)
        const encrypted = payload.slice(this.ivLength + this.tagLength)

        const decipher = crypto.createDecipheriv(this.algorithm, this.getKey(), iv)
        decipher.setAuthTag(authTag)

        return Buffer.concat([
          decipher.update(encrypted),
          decipher.final()
        ])
      }

      // Backward compatibility for legacy encrypted files
      const legacyIvLength = 16
      const authTag = encryptedBuffer.slice(legacyIvLength, legacyIvLength + this.tagLength)
      const encrypted = encryptedBuffer.slice(legacyIvLength + this.tagLength)

      const decipher = crypto.createDecipher(this.algorithm, this.getKey())
      decipher.setAuthTag(authTag)

      return Buffer.concat([
        decipher.update(encrypted),
        decipher.final()
      ])
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
