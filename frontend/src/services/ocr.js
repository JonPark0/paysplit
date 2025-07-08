// OCR Service with OLLAMA Gemma3:4b and Tesseract.js fallback
class OCRService {
  constructor() {
    this.ollamaEndpoint = '/api/ollama' // Proxy through backend
    this.isInitialized = false
  }

  async initialize() {
    if (this.isInitialized) return
    this.isInitialized = true
    console.log('OCR Service initialized with OLLAMA + Tesseract fallback')
  }

  async processImage(imageFile, onProgress) {
    try {
      if (!this.isInitialized) {
        await this.initialize()
      }

      console.log('Starting OCR processing with OLLAMA...')
      
      if (onProgress) {
        onProgress(10)
      }

      // Try OLLAMA first for better Korean support
      try {
        const ollamaResult = await this.processWithOllama(imageFile, onProgress)
        if (ollamaResult.items.length > 0) {
          return ollamaResult
        }
      } catch (error) {
        console.warn('OLLAMA processing failed, falling back to Tesseract:', error)
      }

      // Fallback to Tesseract if OLLAMA fails
      return await this.processWithTesseract(imageFile, onProgress)

    } catch (error) {
      console.error('All OCR methods failed:', error)
      throw new Error('OCR processing failed: ' + error.message)
    }
  }

  async processWithOllama(imageFile, onProgress) {
    try {
      if (onProgress) onProgress(30)

      // Convert image to base64
      const base64Image = await this.fileToBase64(imageFile)
      
      if (onProgress) onProgress(50)

      // Send to OLLAMA via backend proxy
      const response = await fetch(this.ollamaEndpoint + '/process-receipt', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          image: base64Image,
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

      if (onProgress) onProgress(80)

      if (!response.ok) {
        throw new Error(`OLLAMA API error: ${response.status}`)
      }

      const result = await response.json()
      
      if (onProgress) onProgress(100)

      return {
        rawText: result.text || '',
        confidence: 90, // OLLAMA typically has good confidence
        items: result.items || [],
        total: result.total || 0,
        metadata: {
          words: result.items?.length || 0,
          lines: result.items?.length || 0,
          processingTime: Date.now(),
          method: 'ollama_gemma3'
        }
      }

    } catch (error) {
      console.error('OLLAMA processing failed:', error)
      throw error
    }
  }

  async processWithTesseract(imageFile, onProgress) {
    // Import Tesseract dynamically to avoid loading if not needed
    const Tesseract = await import('tesseract.js')
    
    try {
      if (onProgress) onProgress(60)

      const worker = await Tesseract.default.createWorker()
      
      if (onProgress) onProgress(80)

      const { data } = await worker.recognize(imageFile)
      await worker.terminate()

      if (onProgress) onProgress(100)

      // Parse the OCR result
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

    } catch (error) {
      console.error('Tesseract processing failed:', error)
      throw error
    }
  }

  async fileToBase64(file) {
    return new Promise((resolve, reject) => {
      // Compress image before converting to base64
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')
      const img = new Image()
      
      img.onload = () => {
        // Calculate dimensions to limit file size
        const maxWidth = 1200
        const maxHeight = 1600
        let { width, height } = img
        
        // Scale down if too large
        if (width > maxWidth || height > maxHeight) {
          const ratio = Math.min(maxWidth / width, maxHeight / height)
          width *= ratio
          height *= ratio
        }
        
        canvas.width = width
        canvas.height = height
        
        // Draw and compress
        ctx.drawImage(img, 0, 0, width, height)
        const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.8) // 80% quality
        const base64 = compressedDataUrl.split(',')[1]
        resolve(base64)
      }
      
      img.onerror = reject
      
      // Read original file
      const reader = new FileReader()
      reader.onload = (e) => {
        img.src = e.target.result
      }
      reader.onerror = reject
      reader.readAsDataURL(file)
    })
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
    // No persistent resources to clean up in this implementation
    console.log('OCR Service terminated')
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