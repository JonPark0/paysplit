import express from 'express'

const router = express.Router()

// OLLAMA API endpoint configuration
const OLLAMA_BASE_URL = process.env.OLLAMA_URL || 'http://192.168.50.242:11434'
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'gemma3:latest'

// Process receipt with OLLAMA vision model
router.post('/process-receipt', async (req, res) => {
  try {
    const { image, prompt } = req.body

    if (!image) {
      return res.status(400).json({ error: 'Image data is required' })
    }

    console.log('Processing receipt with OLLAMA...')

    // Prepare the request for OLLAMA
    const ollamaRequest = {
      model: OLLAMA_MODEL,
      prompt: prompt || `영수증 이미지를 분석하여 JSON 형식으로 상품명과 가격을 추출해주세요.`,
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
        model: OLLAMA_MODEL,
        processingTime: Date.now()
      }
    })

  } catch (error) {
    console.error('OLLAMA processing error:', error)
    res.status(500).json({ 
      error: 'Failed to process receipt with OLLAMA',
      details: error.message 
    })
  }
})

// Health check for OLLAMA service
router.get('/health', async (req, res) => {
  try {
    const response = await fetch(`${OLLAMA_BASE_URL}/api/tags`)
    
    if (!response.ok) {
      throw new Error(`OLLAMA health check failed: ${response.status}`)
    }

    const models = await response.json()
    const hasGemma = models.models?.some(model => 
      model.name.includes('gemma') || model.name.includes(OLLAMA_MODEL)
    )

    res.json({
      status: 'healthy',
      endpoint: OLLAMA_BASE_URL,
      model: OLLAMA_MODEL,
      modelAvailable: hasGemma,
      availableModels: models.models?.map(m => m.name) || []
    })

  } catch (error) {
    console.error('OLLAMA health check failed:', error)
    res.status(503).json({
      status: 'unhealthy',
      error: error.message,
      endpoint: OLLAMA_BASE_URL
    })
  }
})

export default router