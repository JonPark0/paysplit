import sharp from 'sharp'
import { FileEncryption } from './crypto.js'

const fileEncryption = new FileEncryption()

interface ProcessImageResult {
  originalFilename: string
  encryptedFilename: string
  fileSize: number
  mimetype: string
}

interface UploadFileLike {
  mimetype: string
  size: number
}

export class ImageProcessor {
  private maxWidth: number

  private maxHeight: number

  private quality: number

  private maxFileSize: number

  constructor() {
    this.maxWidth = 1920
    this.maxHeight = 1920
    this.quality = 85
    this.maxFileSize = 10 * 1024 * 1024
  }

  async processImage(inputBuffer: Buffer, originalFilename: string, mimetype: string): Promise<ProcessImageResult> {
    try {
      if (inputBuffer.length > this.maxFileSize) {
        throw new Error('File too large')
      }

      let processedBuffer = inputBuffer
      if (mimetype.startsWith('image/')) {
        processedBuffer = await this.optimizeImage(inputBuffer)
      }

      const encryptionResult = await fileEncryption.encryptFile(
        processedBuffer,
        originalFilename
      )

      await fileEncryption.saveEncryptedFile(
        encryptionResult.encryptedData,
        encryptionResult.encryptedFilename
      )

      return {
        originalFilename,
        encryptedFilename: encryptionResult.encryptedFilename,
        fileSize: processedBuffer.length,
        mimetype: mimetype.startsWith('image/') ? 'image/webp' : mimetype
      }
    } catch (error) {
      console.error('Image processing failed:', error)
      throw error
    }
  }

  async optimizeImage(inputBuffer: Buffer): Promise<Buffer> {
    try {
      let sharpInstance = sharp(inputBuffer)
      const metadata = await sharpInstance.metadata()

      if (
        (metadata.width ?? 0) > this.maxWidth
        || (metadata.height ?? 0) > this.maxHeight
      ) {
        sharpInstance = sharpInstance.resize(this.maxWidth, this.maxHeight, {
          fit: 'inside',
          withoutEnlargement: true
        })
      }

      return await sharpInstance
        .webp({
          quality: this.quality,
          effort: 4,
          nearLossless: false
        })
        .toBuffer()
    } catch (error) {
      console.error('Image optimization failed:', error)
      return inputBuffer
    }
  }

  async getImageBuffer(encryptedFilename: string): Promise<Buffer> {
    try {
      const encryptedData = await fileEncryption.loadEncryptedFile(encryptedFilename)
      return await fileEncryption.decryptFile(encryptedData)
    } catch (error) {
      console.error('Failed to get image buffer:', error)
      throw error
    }
  }

  async deleteImage(encryptedFilename: string): Promise<void> {
    try {
      await fileEncryption.deleteEncryptedFile(encryptedFilename)
    } catch (error) {
      console.error('Failed to delete image:', error)
      throw error
    }
  }

  async generateThumbnail(inputBuffer: Buffer, width = 300, height = 300): Promise<Buffer> {
    try {
      return await sharp(inputBuffer)
        .resize(width, height, {
          fit: 'cover',
          position: 'center'
        })
        .webp({ quality: 80 })
        .toBuffer()
    } catch (error) {
      console.error('Thumbnail generation failed:', error)
      throw error
    }
  }

  validateImage(file: UploadFileLike): boolean {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp']
    const maxSize = 10 * 1024 * 1024

    if (!allowedTypes.includes(file.mimetype)) {
      throw new Error('Invalid file type. Only JPEG, PNG, and WebP are allowed')
    }

    if (file.size > maxSize) {
      throw new Error('File too large. Maximum size is 10MB')
    }

    return true
  }
}

export default new ImageProcessor()
