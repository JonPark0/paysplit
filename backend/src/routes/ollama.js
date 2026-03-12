import express from 'express'
import { checkRoomAccess } from '../middleware/auth.js'
import { verifyRecaptchaReceiptUpload } from '../middleware/recaptcha.js'

const fetchWithTimeout = async (url, options = {}, timeoutMs = 15000) => {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs)

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal
    })
    return response
  } finally {
    clearTimeout(timeoutId)
  }
}

const estimateBase64Bytes = (base64) => {
  const padding = (base64.match(/=+$/) || [''])[0].length
  return Math.floor((base64.length * 3) / 4) - padding
}

const getOcrConfig = () => ({
  provider: process.env.OCR_PROVIDER || 'gemini',
  ollamaBaseUrl: process.env.OLLAMA_URL || 'http://127.0.0.1:11434',
  ollamaModel: process.env.OLLAMA_MODEL || 'gemma3:latest',
  geminiApiKey: process.env.GEMINI_API_KEY,
  geminiModel: process.env.GEMINI_MODEL || 'gemini-2.0-flash',
  mindlogicApiKey: process.env.MINDLOGIC_API_KEY,
  mindlogicModel: process.env.MINDLOGIC_MODEL || 'claude-sonnet-4-6',
  mindlogicApiFormat: process.env.MINDLOGIC_API_FORMAT || 'openai',
  mindlogicGatewayBaseUrl: process.env.MINDLOGIC_BASE_URL || 'https://factchat-cloud.mindlogic.ai/v1/gateway',
  mindlogicClaudeBaseUrl: process.env.MINDLOGIC_CLAUDE_BASE_URL || 'https://factchat-cloud.mindlogic.ai/v1/gateway/claude',
  mindlogicAnthropicVersion: process.env.MINDLOGIC_ANTHROPIC_VERSION || '2023-06-01',
  mindlogicAnthropicBeta: process.env.MINDLOGIC_ANTHROPIC_BETA,
  timeoutMs: Number(process.env.OCR_REQUEST_TIMEOUT_MS || 20000),
  maxImageBytes: Number(process.env.OCR_MAX_IMAGE_BYTES || 8 * 1024 * 1024)
})

const DEFAULT_PROMPT = `영수증 이미지를 분석하여 다음 JSON 형식으로 응답해주세요:
{
  "items": [
    {"name": "상품명", "price": 가격, "quantity": 수량}
  ],
  "total": 총액,
  "store": "상점명"
}

한국어 텍스트를 정확히 인식하고, 상품명과 가격을 추출해주세요. 가격은 숫자만 반환하세요. JSON 형식으로만 응답해주세요.`

const parseStructuredOcrText = (rawText) => {
  if (!rawText || typeof rawText !== 'string') {
    return {
      parsedResult: {
        text: '',
        items: [],
        total: 0,
        store: ''
      },
      rawText: ''
    }
  }

  try {
    const jsonMatch = rawText.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      throw new Error('No JSON payload found')
    }

    const parsedResult = JSON.parse(jsonMatch[0])
    return { parsedResult, rawText }
  } catch (error) {
    console.error('Failed to parse OCR structured response:', error)
    return {
      parsedResult: {
        text: rawText,
        items: [],
        total: 0,
        store: '',
        error: 'Failed to parse structured response'
      },
      rawText
    }
  }
}

export default function ollamaRoutes(db) {
  const router = express.Router()

  router.post(
    '/process-receipt/:roomId',
    checkRoomAccess(db),
    verifyRecaptchaReceiptUpload,
    async (req, res) => {
      const startedAt = Date.now()

      try {
        const { image, prompt } = req.body

        if (!image || typeof image !== 'string') {
          return res.status(400).json({ error: 'Image data is required' })
        }

        const imageBytes = estimateBase64Bytes(image)
        const config = getOcrConfig()

        if (imageBytes > config.maxImageBytes) {
          return res.status(413).json({
            error: 'Image too large',
            message: `Image must be smaller than ${Math.floor(config.maxImageBytes / 1024 / 1024)}MB`
          })
        }

        console.log(`Processing receipt with ${config.provider.toUpperCase()}...`)

        if (config.provider === 'gemini') {
          return await processWithGemini(res, image, prompt, config, startedAt)
        }

        if (config.provider === 'ollama') {
          return await processWithOllama(res, image, prompt, config, startedAt)
        }

        if (config.provider === 'mindlogic') {
          return await processWithMindlogic(res, image, prompt, config, startedAt)
        }

        return res.status(400).json({
          error: 'Invalid OCR provider configuration'
        })
      } catch (error) {
        console.error('OCR processing error:', error)
        return res.status(500).json({ error: 'Failed to process receipt' })
      }
    }
  )

  router.get('/health', async (req, res) => {
    try {
      const config = getOcrConfig()
      const healthStatus = {
        provider: config.provider,
        status: 'healthy',
        timestamp: new Date().toISOString()
      }

      if (config.provider === 'gemini') {
        if (!config.geminiApiKey) {
          throw new Error('Gemini API key not configured')
        }

        const testResponse = await fetchWithTimeout(
          `https://generativelanguage.googleapis.com/v1beta/models/${config.geminiModel}:generateContent`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-goog-api-key': config.geminiApiKey
            },
            body: JSON.stringify({
              contents: [{
                parts: [{ text: 'Hello' }]
              }]
            })
          },
          config.timeoutMs
        )

        if (!testResponse.ok) {
          throw new Error(`Gemini API test failed: ${testResponse.status}`)
        }

        healthStatus.model = config.geminiModel
        healthStatus.endpoint = 'https://generativelanguage.googleapis.com'
      } else if (config.provider === 'ollama') {
        const response = await fetchWithTimeout(
          `${config.ollamaBaseUrl}/api/tags`,
          {},
          config.timeoutMs
        )

        if (!response.ok) {
          throw new Error(`OLLAMA health check failed: ${response.status}`)
        }

        const models = await response.json()
        const availableModels = models.models?.map((model) => model.name) || []

        healthStatus.endpoint = config.ollamaBaseUrl
        healthStatus.model = config.ollamaModel
        healthStatus.modelAvailable = availableModels.some((name) => name.includes(config.ollamaModel))
        healthStatus.availableModels = availableModels
      } else if (config.provider === 'mindlogic') {
        if (!config.mindlogicApiKey) {
          throw new Error('Mindlogic API key not configured')
        }

        const response = await fetchWithTimeout(
          `${config.mindlogicGatewayBaseUrl}/models/`,
          {
            headers: {
              Authorization: `Bearer ${config.mindlogicApiKey}`
            }
          },
          config.timeoutMs
        )

        if (!response.ok) {
          throw new Error(`Mindlogic API health check failed: ${response.status}`)
        }

        const models = await response.json()
        const modelIds = models.data?.map((model) => model.id) || []

        healthStatus.endpoint = config.mindlogicApiFormat === 'anthropic'
          ? config.mindlogicClaudeBaseUrl
          : config.mindlogicGatewayBaseUrl
        healthStatus.model = config.mindlogicModel
        healthStatus.apiFormat = config.mindlogicApiFormat
        healthStatus.modelAvailable = modelIds.includes(config.mindlogicModel)
      }

      return res.json(healthStatus)
    } catch (error) {
      console.error('OCR provider health check failed:', error)
      return res.status(503).json({
        status: 'unhealthy',
        timestamp: new Date().toISOString()
      })
    }
  })

  return router
}

async function processWithGemini(res, image, prompt, config, startedAt) {
  try {
    if (!config.geminiApiKey) {
      return res.status(500).json({ error: 'Gemini API key not configured' })
    }

    const ocrPrompt = process.env.GEMINI_OCR_PROMPT || prompt || DEFAULT_PROMPT

    const geminiRequest = {
      contents: [
        {
          parts: [
            { text: ocrPrompt },
            {
              inline_data: {
                mime_type: 'image/jpeg',
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

    const response = await fetchWithTimeout(
      `https://generativelanguage.googleapis.com/v1beta/models/${config.geminiModel}:generateContent`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-goog-api-key': config.geminiApiKey
        },
        body: JSON.stringify(geminiRequest)
      },
      config.timeoutMs
    )

    if (!response.ok) {
      console.error(`Gemini API error: ${response.status} ${response.statusText}`)
      return res.status(502).json({ error: 'Gemini OCR request failed' })
    }

    const result = await response.json()

    const rawText = result.candidates?.[0]?.content?.parts?.[0]?.text || ''
    const { parsedResult } = parseStructuredOcrText(rawText)

    return res.json({
      success: true,
      text: parsedResult.text || rawText,
      items: parsedResult.items || [],
      total: parsedResult.total || 0,
      store: parsedResult.store || '',
      metadata: {
        provider: 'gemini',
        model: config.geminiModel,
        processingTimeMs: Date.now() - startedAt
      }
    })
  } catch (error) {
    console.error('Gemini processing error:', error)
    return res.status(502).json({ error: 'Failed to process receipt with Gemini' })
  }
}

async function processWithOllama(res, image, prompt, config, startedAt) {
  try {
    const ocrPrompt = process.env.OLLAMA_OCR_PROMPT || prompt || DEFAULT_PROMPT
    const ollamaRequest = {
      model: config.ollamaModel,
      prompt: ocrPrompt,
      images: [image],
      stream: false,
      format: 'json'
    }

    const response = await fetchWithTimeout(
      `${config.ollamaBaseUrl}/api/generate`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(ollamaRequest)
      },
      config.timeoutMs
    )

    if (!response.ok) {
      console.error(`OLLAMA API error: ${response.status} ${response.statusText}`)
      return res.status(502).json({ error: 'OLLAMA OCR request failed' })
    }

    const result = await response.json()

    const rawText = result.response || ''
    const { parsedResult } = parseStructuredOcrText(rawText)

    return res.json({
      success: true,
      text: parsedResult.text || result.response || '',
      items: parsedResult.items || [],
      total: parsedResult.total || 0,
      store: parsedResult.store || '',
      metadata: {
        provider: 'ollama',
        model: config.ollamaModel,
        processingTimeMs: Date.now() - startedAt
      }
    })
  } catch (error) {
    console.error('OLLAMA processing error:', error)
    return res.status(502).json({ error: 'Failed to process receipt with OLLAMA' })
  }
}

async function processWithMindlogic(res, image, prompt, config, startedAt) {
  if (!config.mindlogicApiKey) {
    return res.status(500).json({ error: 'Mindlogic API key not configured' })
  }

  if (config.mindlogicApiFormat === 'anthropic') {
    return processWithMindlogicAnthropic(res, image, prompt, config, startedAt)
  }

  return processWithMindlogicOpenAI(res, image, prompt, config, startedAt)
}

async function processWithMindlogicOpenAI(res, image, prompt, config, startedAt) {
  try {
    const ocrPrompt = process.env.MINDLOGIC_OCR_PROMPT || prompt || DEFAULT_PROMPT

    const requestBody = {
      model: config.mindlogicModel,
      messages: [{
        role: 'user',
        content: [
          { type: 'text', text: ocrPrompt },
          {
            type: 'image_url',
            image_url: {
              url: `data:image/jpeg;base64,${image}`
            }
          }
        ]
      }],
      temperature: 0.1,
      response_format: {
        type: 'json_object'
      }
    }

    const response = await fetchWithTimeout(
      `${config.mindlogicGatewayBaseUrl}/chat/completions/`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${config.mindlogicApiKey}`
        },
        body: JSON.stringify(requestBody)
      },
      config.timeoutMs
    )

    if (!response.ok) {
      const errorBody = await response.text()
      console.error(`Mindlogic(OpenAI) API error: ${response.status} ${errorBody}`)
      return res.status(502).json({ error: 'Mindlogic OCR request failed' })
    }

    const result = await response.json()
    const rawText = result.choices?.[0]?.message?.content || ''
    const { parsedResult } = parseStructuredOcrText(rawText)

    return res.json({
      success: true,
      text: parsedResult.text || rawText,
      items: parsedResult.items || [],
      total: parsedResult.total || 0,
      store: parsedResult.store || '',
      metadata: {
        provider: 'mindlogic',
        apiFormat: 'openai',
        model: config.mindlogicModel,
        processingTimeMs: Date.now() - startedAt
      }
    })
  } catch (error) {
    console.error('Mindlogic(OpenAI) processing error:', error)
    return res.status(502).json({ error: 'Failed to process receipt with Mindlogic' })
  }
}

async function processWithMindlogicAnthropic(res, image, prompt, config, startedAt) {
  try {
    const ocrPrompt = process.env.MINDLOGIC_OCR_PROMPT || prompt || DEFAULT_PROMPT

    const requestBody = {
      model: config.mindlogicModel,
      max_tokens: 1500,
      temperature: 0.1,
      messages: [{
        role: 'user',
        content: [
          { type: 'text', text: ocrPrompt },
          {
            type: 'image',
            source: {
              type: 'base64',
              media_type: 'image/jpeg',
              data: image
            }
          }
        ]
      }]
    }

    const headers = {
      'Content-Type': 'application/json',
      'x-api-key': config.mindlogicApiKey,
      'anthropic-version': config.mindlogicAnthropicVersion
    }

    if (config.mindlogicAnthropicBeta) {
      headers['anthropic-beta'] = config.mindlogicAnthropicBeta
    }

    const response = await fetchWithTimeout(
      `${config.mindlogicClaudeBaseUrl}/v1/messages/`,
      {
        method: 'POST',
        headers,
        body: JSON.stringify(requestBody)
      },
      config.timeoutMs
    )

    if (!response.ok) {
      const errorBody = await response.text()
      console.error(`Mindlogic(Anthropic) API error: ${response.status} ${errorBody}`)
      return res.status(502).json({ error: 'Mindlogic OCR request failed' })
    }

    const result = await response.json()
    const rawText = (result.content || [])
      .filter((block) => block.type === 'text')
      .map((block) => block.text)
      .join('\n')

    const { parsedResult } = parseStructuredOcrText(rawText)

    return res.json({
      success: true,
      text: parsedResult.text || rawText,
      items: parsedResult.items || [],
      total: parsedResult.total || 0,
      store: parsedResult.store || '',
      metadata: {
        provider: 'mindlogic',
        apiFormat: 'anthropic',
        model: config.mindlogicModel,
        processingTimeMs: Date.now() - startedAt
      }
    })
  } catch (error) {
    console.error('Mindlogic(Anthropic) processing error:', error)
    return res.status(502).json({ error: 'Failed to process receipt with Mindlogic' })
  }
}
