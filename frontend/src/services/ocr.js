import Tesseract from 'tesseract.js'

// OCR Service using Tesseract.js
class OCRService {
  constructor() {
    this.worker = null
    this.isInitialized = false
  }

  async initialize() {
    if (this.isInitialized) return

    try {
      this.worker = await Tesseract.createWorker({
        logger: (m) => {
          if (m.status === 'recognizing text') {
            console.log(`OCR Progress: ${Math.round(m.progress * 100)}%`)
          }
        }
      })

      await this.worker.loadLanguage('eng+kor')
      await this.worker.initialize('eng+kor')
      
      await this.worker.setParameters({
        tessedit_char_whitelist: '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz가-힣.,()- \n',
        tessedit_pageseg_mode: Tesseract.PSM.AUTO,
      })

      this.isInitialized = true
      console.log('OCR Service initialized')
    } catch (error) {
      console.error('Failed to initialize OCR:', error)
      throw error
    }
  }

  async processImage(imageFile, onProgress) {
    try {
      if (!this.isInitialized) {
        await this.initialize()
      }

      console.log('Starting OCR processing...')
      
      const { data } = await this.worker.recognize(imageFile, {
        logger: (m) => {
          if (m.status === 'recognizing text' && onProgress) {
            onProgress(Math.round(m.progress * 100))
          }
        }
      })

      console.log('OCR completed:', data.text)
      
      // Parse the OCR result
      const parsedData = this.parseReceiptText(data.text)
      
      return {
        rawText: data.text,
        confidence: data.confidence,
        items: parsedData.items,
        total: parsedData.total,
        metadata: {
          words: data.words?.length || 0,
          lines: data.lines?.length || 0,
          processingTime: Date.now()
        }
      }
    } catch (error) {
      console.error('OCR processing failed:', error)
      throw new Error('OCR processing failed: ' + error.message)
    }
  }

  parseReceiptText(text) {
    const lines = text.split('\n').filter(line => line.trim())
    const items = []
    let total = 0
    
    // Common patterns for receipt items
    const itemPatterns = [
      // Pattern: Name Price (e.g., "Pizza 15000")
      /^(.+?)\s+([0-9,]+)$/,
      // Pattern: Name x Qty Price (e.g., "Pizza x2 30000")
      /^(.+?)\s*x\s*(\d+)\s+([0-9,]+)$/,
      // Pattern: Qty x Name Price (e.g., "2 x Pizza 30000")
      /^(\d+)\s*x\s*(.+?)\s+([0-9,]+)$/
    ]

    // Patterns for total amount
    const totalPatterns = [
      /총[계액합]?\s*:?\s*([0-9,]+)/i,
      /total\s*:?\s*([0-9,]+)/i,
      /합계\s*:?\s*([0-9,]+)/i,
      /amount\s*:?\s*([0-9,]+)/i
    ]

    for (const line of lines) {
      const cleanLine = line.trim()
      
      // Try to find total amount
      for (const pattern of totalPatterns) {
        const match = cleanLine.match(pattern)
        if (match) {
          total = this.parseAmount(match[1])
          continue
        }
      }

      // Try to parse as item
      for (const pattern of itemPatterns) {
        const match = cleanLine.match(pattern)
        if (match) {
          let name, quantity, price

          if (pattern.source.includes('x\\s*(\\d+)')) {
            // Pattern with quantity
            if (match[1].match(/^\d+$/)) {
              // Qty x Name Price
              quantity = parseInt(match[1])
              name = match[2].trim()
              price = this.parseAmount(match[3])
            } else {
              // Name x Qty Price
              name = match[1].trim()
              quantity = parseInt(match[2])
              price = this.parseAmount(match[3])
            }
          } else {
            // Simple Name Price pattern
            name = match[1].trim()
            quantity = 1
            price = this.parseAmount(match[2])
          }

          if (name && price > 0) {
            items.push({
              name: this.cleanItemName(name),
              price: price / (quantity || 1), // Unit price
              quantity: quantity || 1,
              category: this.categorizeItem(name)
            })
          }
          break
        }
      }
    }

    // If no total found, calculate from items
    if (total === 0 && items.length > 0) {
      total = items.reduce((sum, item) => sum + (item.price * item.quantity), 0)
    }

    return { items, total }
  }

  parseAmount(amountStr) {
    // Remove commas and parse as number
    const cleaned = amountStr.replace(/[,\s]/g, '')
    const amount = parseInt(cleaned)
    return isNaN(amount) ? 0 : amount
  }

  cleanItemName(name) {
    // Remove common prefixes/suffixes and clean up
    return name
      .replace(/^[-*•]\s*/, '') // Remove bullet points
      .replace(/\s*\([^)]*\)$/, '') // Remove parentheses at end
      .replace(/\s+/g, ' ') // Normalize whitespace
      .trim()
  }

  categorizeItem(name) {
    const lowerName = name.toLowerCase()
    
    const categories = {
      food: ['pizza', 'burger', 'pasta', 'rice', 'chicken', 'beef', 'pork', 'fish', 'salad', '피자', '버거', '파스타', '밥', '치킨', '고기', '생선', '샐러드'],
      drink: ['coffee', 'tea', 'juice', 'beer', 'wine', 'soda', 'water', '커피', '차', '주스', '맥주', '와인', '콜라', '물'],
      dessert: ['cake', 'ice cream', 'cookie', 'chocolate', '케이크', '아이스크림', '쿠키', '초콜릿'],
      service: ['tip', 'service', 'delivery', '팁', '서비스', '배달']
    }

    for (const [category, keywords] of Object.entries(categories)) {
      if (keywords.some(keyword => lowerName.includes(keyword))) {
        return category
      }
    }

    return 'other'
  }

  async terminate() {
    if (this.worker) {
      await this.worker.terminate()
      this.worker = null
      this.isInitialized = false
      console.log('OCR Service terminated')
    }
  }

  // Validate OCR result quality
  validateResult(result) {
    const issues = []
    
    if (result.confidence < 60) {
      issues.push('Low confidence score')
    }
    
    if (result.items.length === 0) {
      issues.push('No items detected')
    }
    
    if (result.total === 0) {
      issues.push('No total amount found')
    }

    // Check if total matches sum of items
    const calculatedTotal = result.items.reduce((sum, item) => 
      sum + (item.price * item.quantity), 0
    )
    
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