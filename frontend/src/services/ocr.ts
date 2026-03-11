import { useRoomStore } from '../stores/roomStore'
import recaptchaService from './recaptcha'

type ProgressHandler = (progress: number) => void

interface OCRItem {
  id?: string
  name: string
  price: number
  quantity: number
  category?: string
}

interface OCRResult {
  rawText: string
  confidence: number
  items: OCRItem[]
  total: number
  metadata: {
    words: number
    lines: number
    processingTime: number
    method: string
  }
}

class OCRService {
  private ollamaEndpoint: string

  private isInitialized: boolean

  constructor() {
    this.ollamaEndpoint = '/api/ollama'
    this.isInitialized = false
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) {
      return
    }

    this.isInitialized = true
    console.log('OCR Service initialized with OLLAMA + Tesseract fallback')
  }

  async processImage(imageFile: File, roomId: string, onProgress?: ProgressHandler): Promise<OCRResult> {
    try {
      if (!this.isInitialized) {
        await this.initialize()
      }

      if (!roomId) {
        throw new Error('Room ID is required for OCR processing')
      }

      console.log('Starting OCR processing with OLLAMA...')
      onProgress?.(10)

      try {
        const ollamaResult = await this.processWithOllama(imageFile, roomId, onProgress)
        if (ollamaResult.items.length > 0) {
          return ollamaResult
        }
      } catch (error) {
        console.warn('OLLAMA processing failed, falling back to Tesseract:', error)
      }

      return this.processWithTesseract(imageFile, onProgress)
    } catch (error) {
      console.error('All OCR methods failed:', error)
      const message = error instanceof Error ? error.message : String(error)
      throw new Error(`OCR processing failed: ${message}`)
    }
  }

  async processWithOllama(imageFile: File, roomId: string, onProgress?: ProgressHandler): Promise<OCRResult> {
    onProgress?.(30)

    const { sessionToken } = useRoomStore.getState()
    if (!sessionToken) {
      throw new Error('Session token is missing')
    }

    const recaptchaToken = await recaptchaService.getReceiptUploadToken()
    const base64Image = await this.fileToBase64(imageFile)

    onProgress?.(50)

    const response = await fetch(`${this.ollamaEndpoint}/process-receipt/${roomId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Session-Token': sessionToken
      },
      body: JSON.stringify({
        image: base64Image,
        recaptchaToken,
        prompt: `영수증 이미지를 분석하여 다음 JSON 형식으로 응답해주세요:
{
  "items": [
    {"name": "상품명", "price": 가격, "quantity": 수량}
  ],
  "total": 총액,
  "store": "상점명"
}

한국어 텍스트를 정확히 인식하고, 상품명과 가격을 추출해주세요. 가격은 숫자만 반환하세요.`
      })
    })

    onProgress?.(80)

    if (!response.ok) {
      throw new Error(`OLLAMA API error: ${response.status}`)
    }

    const result = await response.json()

    onProgress?.(100)

    return {
      rawText: result.text || '',
      confidence: 90,
      items: result.items || [],
      total: result.total || 0,
      metadata: {
        words: result.items?.length || 0,
        lines: result.items?.length || 0,
        processingTime: Date.now(),
        method: 'ollama_gemma3'
      }
    }
  }

  async processWithTesseract(imageFile: File, onProgress?: ProgressHandler): Promise<OCRResult> {
    const Tesseract = await import('tesseract.js') as any

    onProgress?.(60)
    const worker = await Tesseract.default.createWorker()

    onProgress?.(80)
    const { data } = await worker.recognize(imageFile)
    await worker.terminate()

    onProgress?.(100)

    const parsedData = this.parseReceiptText(data.text)

    return {
      rawText: data.text,
      confidence: data.confidence || 50,
      items: parsedData.items,
      total: parsedData.total,
      metadata: {
        words: data.words?.length || 0,
        lines: data.lines?.length || 0,
        processingTime: Date.now(),
        method: 'tesseract_fallback'
      }
    }
  }

  async fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')
      const img = new Image()

      img.onload = () => {
        if (!ctx) {
          reject(new Error('Canvas context is not available'))
          return
        }

        const maxWidth = 1200
        const maxHeight = 1600
        let { width, height } = img

        if (width > maxWidth || height > maxHeight) {
          const ratio = Math.min(maxWidth / width, maxHeight / height)
          width *= ratio
          height *= ratio
        }

        canvas.width = width
        canvas.height = height

        ctx.drawImage(img, 0, 0, width, height)
        const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.8)
        const base64 = compressedDataUrl.split(',')[1]
        resolve(base64)
      }

      img.onerror = () => reject(new Error('Failed to load image file'))

      const reader = new FileReader()
      reader.onload = (event) => {
        const dataUrl = event.target?.result
        if (typeof dataUrl !== 'string') {
          reject(new Error('Invalid image data'))
          return
        }

        img.src = dataUrl
      }
      reader.onerror = () => reject(new Error('Failed to read image file'))
      reader.readAsDataURL(file)
    })
  }

  parseReceiptText(text: string): { items: OCRItem[]; total: number } {
    const lines = text.split('\n').filter((line) => line.trim())
    const items: OCRItem[] = []
    let total = 0

    const itemPatterns = [
      /^(.+?)\s+([0-9,]+)$/,
      /^(.+?)\s*x\s*(\d+)\s+([0-9,]+)$/,
      /^(\d+)\s*x\s*(.+?)\s+([0-9,]+)$/
    ]

    const totalPatterns = [
      /총[계액합]?\s*:?\s*([0-9,]+)/i,
      /total\s*:?\s*([0-9,]+)/i,
      /합계\s*:?\s*([0-9,]+)/i,
      /amount\s*:?\s*([0-9,]+)/i
    ]

    for (const line of lines) {
      const cleanLine = line.trim()

      for (const pattern of totalPatterns) {
        const match = cleanLine.match(pattern)
        if (match) {
          total = this.parseAmount(match[1])
          continue
        }
      }

      for (const pattern of itemPatterns) {
        const match = cleanLine.match(pattern)
        if (!match) {
          continue
        }

        let name = ''
        let quantity = 1
        let price = 0

        if (pattern.source.includes('x\\s*(\\d+)')) {
          if (/^\d+$/.test(match[1])) {
            quantity = Number.parseInt(match[1], 10)
            name = match[2].trim()
            price = this.parseAmount(match[3])
          } else {
            name = match[1].trim()
            quantity = Number.parseInt(match[2], 10)
            price = this.parseAmount(match[3])
          }
        } else {
          name = match[1].trim()
          quantity = 1
          price = this.parseAmount(match[2])
        }

        if (name && price > 0) {
          items.push({
            name: this.cleanItemName(name),
            price: price / (quantity || 1),
            quantity: quantity || 1,
            category: this.categorizeItem(name)
          })
        }
        break
      }
    }

    if (total === 0 && items.length > 0) {
      total = items.reduce((sum, item) => sum + (item.price * item.quantity), 0)
    }

    return { items, total }
  }

  parseAmount(amountStr: string): number {
    const cleaned = amountStr.replace(/[,\s]/g, '')
    const amount = Number.parseInt(cleaned, 10)
    return Number.isNaN(amount) ? 0 : amount
  }

  cleanItemName(name: string): string {
    return name
      .replace(/^[-*•]\s*/, '')
      .replace(/\s*\([^)]*\)$/, '')
      .replace(/\s+/g, ' ')
      .trim()
  }

  categorizeItem(name: string): string {
    const lowerName = name.toLowerCase()

    const categories: Record<string, string[]> = {
      food: ['pizza', 'burger', 'pasta', 'rice', 'chicken', 'beef', 'pork', 'fish', 'salad', '피자', '버거', '파스타', '밥', '치킨', '고기', '생선', '샐러드'],
      drink: ['coffee', 'tea', 'juice', 'beer', 'wine', 'soda', 'water', '커피', '차', '주스', '맥주', '와인', '콜라', '물'],
      dessert: ['cake', 'ice cream', 'cookie', 'chocolate', '케이크', '아이스크림', '쿠키', '초콜릿'],
      service: ['tip', 'service', 'delivery', '팁', '서비스', '배달']
    }

    for (const [category, keywords] of Object.entries(categories)) {
      if (keywords.some((keyword) => lowerName.includes(keyword))) {
        return category
      }
    }

    return 'other'
  }

  async terminate(): Promise<void> {
    console.log('OCR Service terminated')
  }

  validateResult(result: OCRResult): { isValid: boolean; issues: string[]; score: number } {
    const issues: string[] = []

    if (result.confidence < 60) {
      issues.push('Low confidence score')
    }

    if (result.items.length === 0) {
      issues.push('No items detected')
    }

    if (result.total === 0) {
      issues.push('No total amount found')
    }

    const calculatedTotal = result.items.reduce((sum, item) => sum + (item.price * item.quantity), 0)

    if (Math.abs(calculatedTotal - result.total) > result.total * 0.1) {
      issues.push('Total amount mismatch')
    }

    return {
      isValid: issues.length === 0,
      issues,
      score: Math.max(0, 100 - (issues.length * 20) - (100 - result.confidence))
    }
  }
}

export default new OCRService()
