import sharp from 'sharp'
import { FileEncryption } from './crypto.js'

const fileEncryption = new FileEncryption()

// Image processing service
export class ImageProcessor {
  constructor() {
    this.maxWidth = 1920
    this.maxHeight = 1920
    this.quality = 85
    this.maxFileSize = 10 * 1024 * 1024 // 10MB
  }

  async processImage(inputBuffer, originalFilename, mimetype) {
    try {
      // Validate file size
      if (inputBuffer.length > this.maxFileSize) {
        throw new Error('File too large')
      }

      let processedBuffer = inputBuffer

      // Process image files (convert to WebP for optimization)
      if (mimetype.startsWith('image/')) {
        processedBuffer = await this.optimizeImage(inputBuffer, mimetype)
      }

      // Encrypt the processed file
      const encryptionResult = await fileEncryption.encryptFile(
        processedBuffer,
        originalFilename
      )

      // Save encrypted file
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

  async optimizeImage(inputBuffer, mimetype) {
    try {
      let sharpInstance = sharp(inputBuffer)

      // Get image metadata
      const metadata = await sharpInstance.metadata()

      // Resize if too large
      if (metadata.width > this.maxWidth || metadata.height > this.maxHeight) {
        sharpInstance = sharpInstance.resize(this.maxWidth, this.maxHeight, {
          fit: 'inside',
          withoutEnlargement: true
        })
      }

      // Convert to WebP for better compression
      const optimizedBuffer = await sharpInstance
        .webp({
          quality: this.quality,
          effort: 4, // Higher effort for better compression
          nearLossless: false
        })
        .toBuffer()

      return optimizedBuffer
    } catch (error) {
      console.error('Image optimization failed:', error)
      // If optimization fails, return original buffer
      return inputBuffer
    }
  }

  async getImageBuffer(encryptedFilename) {
    try {
      // Load encrypted file
      const encryptedData = await fileEncryption.loadEncryptedFile(encryptedFilename)
      
      // Decrypt file
      const decryptedBuffer = await fileEncryption.decryptFile(encryptedData)
      
      return decryptedBuffer
    } catch (error) {
      console.error('Failed to get image buffer:', error)
      throw error
    }
  }

  async deleteImage(encryptedFilename) {
    try {
      await fileEncryption.deleteEncryptedFile(encryptedFilename)
    } catch (error) {
      console.error('Failed to delete image:', error)
      throw error
    }
  }

  // Generate thumbnail for preview
  async generateThumbnail(inputBuffer, width = 300, height = 300) {
    try {
      const thumbnail = await sharp(inputBuffer)
        .resize(width, height, {
          fit: 'cover',
          position: 'center'
        })
        .webp({ quality: 80 })
        .toBuffer()

      return thumbnail
    } catch (error) {
      console.error('Thumbnail generation failed:', error)
      throw error
    }
  }

  // Validate image file
  validateImage(file) {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp']
    const maxSize = 10 * 1024 * 1024 // 10MB

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