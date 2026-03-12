import crypto from 'crypto'
import fs from 'fs/promises'
import path from 'path'

interface EncryptionResult {
  encryptedData: Buffer
  encryptedFilename: string
  originalFilename: string
}

export class FileEncryption {
  private algorithm: string

  private ivLength: number

  private versionPrefix: Buffer

  private tagLength: number

  private key: Buffer | null

  constructor() {
    this.algorithm = 'aes-256-gcm'
    this.ivLength = 12
    this.versionPrefix = Buffer.from('PS2')
    this.tagLength = 16
    this.key = null
  }

  private getKey(): Buffer {
    if (!this.key) {
      this.key = this.generateKey()
    }

    return this.key
  }

  private generateKey(): Buffer {
    const keyString = process.env.ENCRYPTION_KEY
    if (!keyString || keyString.length < 32) {
      throw new Error('ENCRYPTION_KEY must be set and at least 32 characters long')
    }

    return crypto.createHash('sha256').update(keyString).digest()
  }

  async encryptFile(inputBuffer: Buffer, originalFilename: string): Promise<EncryptionResult> {
    try {
      const iv = crypto.randomBytes(this.ivLength)
      const cipher = crypto.createCipheriv(this.algorithm, this.getKey(), iv) as crypto.CipherGCM

      const encrypted = Buffer.concat([
        cipher.update(inputBuffer),
        cipher.final()
      ])

      const authTag = cipher.getAuthTag()
      const result = Buffer.concat([this.versionPrefix, iv, authTag, encrypted])

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

  async decryptFile(encryptedBuffer: Buffer): Promise<Buffer> {
    try {
      const hasV2Prefix = encryptedBuffer.subarray(0, this.versionPrefix.length).equals(this.versionPrefix)

      if (hasV2Prefix) {
        const payload = encryptedBuffer.subarray(this.versionPrefix.length)
        const iv = payload.slice(0, this.ivLength)
        const authTag = payload.slice(this.ivLength, this.ivLength + this.tagLength)
        const encrypted = payload.slice(this.ivLength + this.tagLength)

        const decipher = crypto.createDecipheriv(this.algorithm, this.getKey(), iv) as crypto.DecipherGCM
        decipher.setAuthTag(authTag)

        return Buffer.concat([
          decipher.update(encrypted),
          decipher.final()
        ])
      }

      const legacyIvLength = 16
      const authTag = encryptedBuffer.slice(legacyIvLength, legacyIvLength + this.tagLength)
      const encrypted = encryptedBuffer.slice(legacyIvLength + this.tagLength)

      const legacyCrypto = crypto as unknown as {
        createDecipher?: (algorithm: string, password: crypto.BinaryLike) => unknown
      }

      if (!legacyCrypto.createDecipher) {
        throw new Error('Legacy decryption is not supported in this runtime')
      }

      const decipher = legacyCrypto.createDecipher(this.algorithm, this.getKey()) as crypto.DecipherGCM
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

  async saveEncryptedFile(encryptedData: Buffer, filename: string): Promise<string> {
    try {
      const uploadPath = process.env.UPLOAD_PATH || './uploads'
      const filePath = path.join(uploadPath, filename)

      await fs.mkdir(uploadPath, { recursive: true })
      await fs.writeFile(filePath, encryptedData)

      return filePath
    } catch (error) {
      console.error('Failed to save encrypted file:', error)
      throw new Error('Failed to save encrypted file')
    }
  }

  async loadEncryptedFile(filename: string): Promise<Buffer> {
    try {
      const uploadPath = process.env.UPLOAD_PATH || './uploads'
      const filePath = path.join(uploadPath, filename)
      return await fs.readFile(filePath)
    } catch (error) {
      console.error('Failed to load encrypted file:', error)
      throw new Error('Failed to load encrypted file')
    }
  }

  async deleteEncryptedFile(filename: string): Promise<void> {
    try {
      const uploadPath = process.env.UPLOAD_PATH || './uploads'
      const filePath = path.join(uploadPath, filename)
      await fs.unlink(filePath)
    } catch (error) {
      console.error('Failed to delete encrypted file:', error)
    }
  }
}

export default new FileEncryption()
