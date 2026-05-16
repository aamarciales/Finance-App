import { Hono } from 'hono'
import { getAuth } from '@hono/clerk-auth'
import type { AppEnv } from '../types'

export const filesRouter = new Hono<AppEnv>()

const ALLOWED_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/heic',
  'image/webp',
  'application/pdf',
])

const MAX_SIZE = 10 * 1024 * 1024 // 10MB

// POST /api/files/upload
filesRouter.post('/upload', async (c) => {
  const auth = getAuth(c)
  if (!auth?.userId) return c.json({ error: 'Unauthorized' }, 401)

  const bucket = c.env.FILES
  if (!bucket) return c.json({ error: 'Storage not configured' }, 500)

  const formData = await c.req.formData()
  const file = formData.get('file') as File | null
  if (!file) return c.json({ error: 'No file provided' }, 400)

  if (!ALLOWED_TYPES.has(file.type)) {
    return c.json({ error: `Unsupported file type: ${file.type}` }, 400)
  }

  if (file.size > MAX_SIZE) {
    return c.json({ error: 'File too large (max 10MB)' }, 400)
  }

  const ext = file.name.split('.').pop() || 'bin'
  const key = `${auth.userId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`

  await bucket.put(key, await file.arrayBuffer(), {
    httpMetadata: { contentType: file.type },
    customMetadata: {
      originalName: file.name,
      userId: auth.userId,
      uploadedAt: new Date().toISOString(),
    },
  })

  const url = `/api/files/${key}`

  return c.json({
    key,
    url,
    name: file.name,
    type: file.type,
    size: file.size,
  })
})

// GET /api/files/:key{.+}
filesRouter.get('/:key{.+}', async (c) => {
  const auth = getAuth(c)
  if (!auth?.userId) return c.json({ error: 'Unauthorized' }, 401)

  const bucket = c.env.FILES
  if (!bucket) return c.json({ error: 'Storage not configured' }, 500)

  const key = c.req.param('key')

  // Only allow access to own files
  if (!key.startsWith(`${auth.userId}/`)) {
    return c.json({ error: 'Forbidden' }, 403)
  }

  const object = await bucket.get(key)
  if (!object) return c.json({ error: 'File not found' }, 404)

  const body = await object.arrayBuffer()
  const headers = new Headers()
  headers.set('Content-Type', object.httpMetadata?.contentType ?? 'application/octet-stream')
  headers.set('Cache-Control', 'public, max-age=31536000')
  headers.set('Content-Disposition', `inline; filename="${object.customMetadata?.originalName ?? key}"`)

  return new Response(body, { headers })
})

// DELETE /api/files/:key{.+}
filesRouter.delete('/:key{.+}', async (c) => {
  const auth = getAuth(c)
  if (!auth?.userId) return c.json({ error: 'Unauthorized' }, 401)

  const bucket = c.env.FILES
  if (!bucket) return c.json({ error: 'Storage not configured' }, 500)

  const key = c.req.param('key')
  if (!key.startsWith(`${auth.userId}/`)) {
    return c.json({ error: 'Forbidden' }, 403)
  }

  await bucket.delete(key)
  return c.json({ success: true })
})

// POST /api/files/ocr — process receipt image with Claude Vision
filesRouter.post('/ocr', async (c) => {
  const auth = getAuth(c)
  if (!auth?.userId) return c.json({ error: 'Unauthorized' }, 401)

  const apiKey = c.env.ANTHROPIC_API_KEY
  if (!apiKey) return c.json({ error: 'OCR not configured' }, 500)

  const formData = await c.req.formData()
  const file = formData.get('file') as File | null
  if (!file) return c.json({ error: 'No file provided' }, 400)

  if (!file.type.startsWith('image/')) {
    return c.json({ error: 'Only images supported for OCR' }, 400)
  }

  const arrayBuffer = await file.arrayBuffer()
  const base64 = btoa(
    new Uint8Array(arrayBuffer).reduce((data, byte) => data + String.fromCharCode(byte), '')
  )

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: {
                type: 'base64',
                media_type: file.type,
                data: base64,
              },
            },
            {
              type: 'text',
              text: `Analiza este recibo o factura. Extrae la información y responde ÚNICAMENTE con JSON válido (sin markdown, sin backticks):
{
  "merchant": "nombre del comercio",
  "date": "YYYY-MM-DD",
  "items": [
    {"description": "nombre del producto", "quantity": 1, "price": 0.00}
  ],
  "total": 0.00,
  "currency": "COP o USD o EUR",
  "confidence": 0.0
}
Si no puedes leer algo, usa valores null. La fecha debe estar en formato YYYY-MM-DD. Los precios deben ser números decimales.`,
            },
          ],
        },
      ],
    }),
  })

  if (!response.ok) {
    const err = await response.text()
    console.error('Claude API error:', err)
    return c.json({ error: 'OCR processing failed' }, 500)
  }

  const data = await response.json() as any
  const text = data.content?.[0]?.text ?? ''

  // Parse JSON from Claude's response (handle possible markdown wrapping)
  const jsonMatch = text.match(/\{[\s\S]*\}/)
  if (!jsonMatch) {
    return c.json({ error: 'Could not parse OCR result' }, 500)
  }

  const ocrResult = JSON.parse(jsonMatch[0])

  // Also upload the file to R2 for storage
  const bucket = c.env.FILES
  if (bucket) {
    const ext = file.name.split('.').pop() || 'jpg'
    const key = `${auth.userId}/ocr-${Date.now()}-${Math.random().toString(36).slice(2, 6)}.${ext}`
    await bucket.put(key, await file.arrayBuffer(), {
      httpMetadata: { contentType: file.type },
      customMetadata: { originalName: file.name, userId: auth.userId },
    })
    ocrResult.imageUrl = `/api/files/${key}`
  }

  return c.json(ocrResult)
})
