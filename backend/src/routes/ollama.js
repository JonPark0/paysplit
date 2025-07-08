import express from 'express'

const router = express.Router()

// OCR API configuration
const OCR_PROVIDER = process.env.OCR_PROVIDER || 'gemini' // 'gemini' or 'ollama'
const OLLAMA_BASE_URL = process.env.OLLAMA_URL || 'http://192.168.50.242:11434'
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'gemma3:latest'
const GEMINI_API_KEY = process.env.GEMINI_API_KEY
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-2.0-flash'

// Process receipt with selected OCR provider
router.post('/process-receipt', async (req, res) => {
  try {
    const { image, prompt } = req.body

    if (!image) {
      return res.status(400).json({ error: 'Image data is required' })
    }

    console.log(`Processing receipt with ${OCR_PROVIDER.toUpperCase()}...`)

    if (OCR_PROVIDER === 'gemini') {
      return await processWithGemini(req, res, image, prompt)
    } else if (OCR_PROVIDER === 'ollama') {
      return await processWithOllama(req, res, image, prompt)
    } else {
      return res.status(400).json({ 
        error: 'Invalid OCR provider',
        details: `OCR_PROVIDER must be 'gemini' or 'ollama', got '${OCR_PROVIDER}'`
      })
    }

  } catch (error) {
    console.error('OCR processing error:', error)
    res.status(500).json({ 
      error: 'Failed to process receipt',
      details: error.message 
    })
  }
})

// Process with Gemini API
async function processWithGemini(req, res, image, prompt) {
  try {
    if (!GEMINI_API_KEY) {
      return res.status(500).json({ 
        error: 'Gemini API key not configured',
        details: 'GEMINI_API_KEY environment variable is required'
      })
    }

    // Get prompt from environment or use default
    const defaultPrompt = `영수증 이미지를 분석하여 다음 JSON 형식으로 응답해주세요:
{
  "items": [
    {"name": "상품명", "price": 가격, "quantity": 수량}
  ],
  "total": 총액,
  "store": "상점명"
}

한국어 텍스트를 정확히 인식하고, 상품명과 가격을 추출해주세요. 가격은 숫자만 반환하세요. JSON 형식으로만 응답해주세요.`

    const ocrPrompt = process.env.GEMINI_OCR_PROMPT || prompt || defaultPrompt

    // Prepare request for Gemini API
    const geminiRequest = {
      contents: [
        {
          parts: [
            {
              text: ocrPrompt
            },
            {
              inline_data: {
                mime_type: "image/jpeg",
                data: image
              }
            }
          ]
        }
      ],
      generationConfig: {
        temperature: 0.1,
        maxOutputTokens: 1000
      }
    }

    // Send request to Gemini API
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-goog-api-key': GEMINI_API_KEY
      },
      body: JSON.stringify(geminiRequest)
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error(`Gemini API error: ${response.status} ${response.statusText}`, errorText)
      return res.status(response.status).json({ 
        error: 'Gemini API error',
        details: `Status: ${response.status}`,
        message: errorText
      })
    }

    const result = await response.json()
    
    // Parse Gemini response
    let parsedResult = {}
    let rawText = ''
    
    try {
      if (result.candidates && result.candidates[0] && result.candidates[0].content) {
        rawText = result.candidates[0].content.parts[0].text
        
        // Try to extract JSON from the response
        const jsonMatch = rawText.match(/\{[\s\S]*\}/)
        if (jsonMatch) {
          parsedResult = JSON.parse(jsonMatch[0])
        } else {
          throw new Error('No JSON found in response')
        }
      } else {
        throw new Error('Invalid response structure from Gemini')
      }
    } catch (parseError) {
      console.error('Failed to parse Gemini response:', parseError)
      console.error('Raw response:', rawText)
      
      // Fallback to raw text response
      parsedResult = {
        text: rawText,
        items: [],
        total: 0,
        error: 'Failed to parse structured response'
      }
    }

    console.log('Gemini processing completed successfully')

    res.json({
      success: true,
      text: parsedResult.text || rawText,
      items: parsedResult.items || [],
      total: parsedResult.total || 0,
      store: parsedResult.store || '',
      metadata: {
        provider: 'gemini',
        model: GEMINI_MODEL,
        processingTime: Date.now()
      }
    })

  } catch (error) {
    console.error('Gemini processing error:', error)
    return res.status(500).json({ 
      error: 'Failed to process receipt with Gemini',
      details: error.message 
    })
  }
}

// Process with OLLAMA API (keeping existing functionality)
async function processWithOllama(req, res, image, prompt) {
  try {
    // Get prompt from environment or use default
    const defaultPrompt = `영수증 이미지를 분석하여 다음 JSON 형식으로 응답해주세요:
{
  "items": [
    {"name": "상품명", "price": 가격, "quantity": 수량}
  ],
  "total": 총액,
  "store": "상점명"
}

한국어 텍스트를 정확히 인식하고, 상품명과 가격을 추출해주세요. 가격은 숫자만 반환하세요.`

    const ocrPrompt = process.env.OLLAMA_OCR_PROMPT || prompt || defaultPrompt

    // Prepare the request for OLLAMA
    const ollamaRequest = {
      model: OLLAMA_MODEL,
      prompt: ocrPrompt,
      images: [image],
      stream: false,
      format: 'json'
    }

    // Send request to OLLAMA
    const response = await fetch(`${OLLAMA_BASE_URL}/api/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(ollamaRequest)
    })

    if (!response.ok) {
      console.error(`OLLAMA API error: ${response.status} ${response.statusText}`)
      return res.status(response.status).json({ 
        error: 'OLLAMA API error',
        details: `Status: ${response.status}`
      })
    }

    const result = await response.json()
    
    // Parse the OLLAMA response
    let parsedResult = {}
    try {
      // OLLAMA returns the result in the 'response' field
      if (result.response) {
        parsedResult = JSON.parse(result.response)
      } else {
        throw new Error('No response from OLLAMA')
      }
    } catch (parseError) {
      console.error('Failed to parse OLLAMA response:', parseError)
      // Fallback to raw text response
      parsedResult = {
        text: result.response || '',
        items: [],
        total: 0,
        error: 'Failed to parse structured response'
      }
    }

    console.log('OLLAMA processing completed successfully')

    res.json({
      success: true,
      text: parsedResult.text || result.response || '',
      items: parsedResult.items || [],
      total: parsedResult.total || 0,
      store: parsedResult.store || '',
      metadata: {
        provider: 'ollama',
        model: OLLAMA_MODEL,
        processingTime: Date.now()
      }
    })

  } catch (error) {
    console.error('OLLAMA processing error:', error)
    return res.status(500).json({ 
      error: 'Failed to process receipt with OLLAMA',
      details: error.message 
    })
  }
}

// Health check for OCR service
router.get('/health', async (req, res) => {
  try {
    const healthStatus = {
      provider: OCR_PROVIDER,
      status: 'healthy',
      timestamp: new Date().toISOString()
    }

    if (OCR_PROVIDER === 'gemini') {
      if (!GEMINI_API_KEY) {
        throw new Error('Gemini API key not configured')
      }
      
      // Test Gemini API with a simple request
      const testResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-goog-api-key': GEMINI_API_KEY
        },
        body: JSON.stringify({
          contents: [{
            parts: [{ text: "Hello" }]
          }]
        })
      })

      if (!testResponse.ok) {
        throw new Error(`Gemini API test failed: ${testResponse.status}`)
      }

      healthStatus.model = GEMINI_MODEL
      healthStatus.endpoint = 'https://generativelanguage.googleapis.com'
      healthStatus.apiKeyConfigured = !!GEMINI_API_KEY

    } else if (OCR_PROVIDER === 'ollama') {
      const response = await fetch(`${OLLAMA_BASE_URL}/api/tags`)
      
      if (!response.ok) {
        throw new Error(`OLLAMA health check failed: ${response.status}`)
      }

      const models = await response.json()
      const hasModel = models.models?.some(model => 
        model.name.includes('gemma') || model.name.includes(OLLAMA_MODEL)
      )

      healthStatus.endpoint = OLLAMA_BASE_URL
      healthStatus.model = OLLAMA_MODEL
      healthStatus.modelAvailable = hasModel
      healthStatus.availableModels = models.models?.map(m => m.name) || []
    }

    res.json(healthStatus)

  } catch (error) {
    console.error(`${OCR_PROVIDER.toUpperCase()} health check failed:`, error)
    res.status(503).json({
      provider: OCR_PROVIDER,
      status: 'unhealthy',
      error: error.message,
      timestamp: new Date().toISOString()
    })
  }
})

export default router