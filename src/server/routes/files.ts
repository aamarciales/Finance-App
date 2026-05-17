import { Hono } from 'hono'
import { getAuth } from '@hono/clerk-auth'
import { drizzle } from 'drizzle-orm/d1'
import * as schema from '../schema'
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

const OCR_PROMPT = `Analiza este recibo o factura. Extrae la información y responde ÚNICAMENTE con JSON válido (sin markdown, sin backticks):
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
REGLAS IMPORTANTES:
- Los precios deben ser EXACTAMENTE los que aparecen en la factura. NO conviertas monedas. Si dice $7.550, el precio es 7550. Si dice $15.200, es 15200.
- NO dividas ni conviertas los montos a dólares u otra moneda.
- El campo "currency" debe reflejar la moneda del documento (ej: si es Colombia, será COP).
- Si no puedes leer algo, usa valores null. La fecha debe estar en formato YYYY-MM-DD.`

// POST /api/files/ocr — process receipt image
filesRouter.post('/ocr', async (c) => {
  const auth = getAuth(c)
  if (!auth?.userId) return c.json({ error: 'Unauthorized' }, 401)

  const formData = await c.req.formData()
  const file = formData.get('file') as File | null
  if (!file) return c.json({ error: 'No file provided' }, 400)

  if (!file.type.startsWith('image/')) {
    return c.json({ error: 'Only images supported for OCR' }, 400)
  }

  // Read user's OCR provider preference
  const db = drizzle(c.env.DB, { schema })
  const providerRow = await db.query.settings.findFirst({
    where: (s, { eq, and }) => and(eq(s.key, 'ocrProvider'), eq(s.userId, auth.userId)),
  })
  const provider = (typeof providerRow?.value === 'string' ? providerRow.value : providerRow?.value) ?? 'off'

  if (provider === 'off') {
    return c.json({ error: 'OCR está desactivado. Actívalo en Ajustes.' }, 400)
  }

  const arrayBuffer = await file.arrayBuffer()
  const base64 = btoa(
    new Uint8Array(arrayBuffer).reduce((data, byte) => data + String.fromCharCode(byte), '')
  )

  let ocrText: string

  if (provider === 'openai') {
    const keyRow = await db.query.settings.findFirst({
      where: (s, { eq, and }) => and(eq(s.key, 'openaiApiKey'), eq(s.userId, auth.userId)),
    })
    const openaiKey = typeof keyRow?.value === 'string' ? keyRow.value : keyRow?.value as string | undefined
    if (!openaiKey) {
      return c.json({ error: 'Configura tu API Key de OpenAI en Ajustes.' }, 400)
    }

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${openaiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        max_tokens: 1024,
        response_format: { type: 'json_object' },
        messages: [
          {
            role: 'user',
            content: [
              { type: 'image_url', image_url: { url: `data:${file.type};base64,${base64}`, detail: 'high' } },
              { type: 'text', text: OCR_PROMPT },
            ],
          },
        ],
      }),
    })

    if (!response.ok) {
      const err = await response.text()
      console.error('OpenAI API error:', response.status, err)
      try {
        const errJson = JSON.parse(err)
        const msg = errJson?.error?.message ?? ''
        if (msg.includes('API key') || msg.includes('Incorrect API')) return c.json({ error: 'API Key de OpenAI inválida. Verifica en Ajustes.' }, 400)
        if (msg.includes('quota') || msg.includes('billing')) return c.json({ error: 'Cuota de OpenAI agotada o sin facturación activa.' }, 429)
        return c.json({ error: `Error OpenAI: ${msg || response.statusText}` }, 500)
      } catch {
        return c.json({ error: 'Error al procesar con OpenAI. Verifica tu API Key.' }, 500)
      }
    }

    const data = await response.json() as any
    ocrText = data.choices?.[0]?.message?.content ?? ''

    if (!ocrText) {
      return c.json({ error: 'OpenAI no pudo extraer texto de la imagen.' }, 500)
    }
  } else if (provider === 'gemini') {
    // Read Gemini API key from user settings
    const keyRow = await db.query.settings.findFirst({
      where: (s, { eq, and }) => and(eq(s.key, 'geminiApiKey'), eq(s.userId, auth.userId)),
    })
    const geminiKey = typeof keyRow?.value === 'string' ? keyRow.value : keyRow?.value as string | undefined
    if (!geminiKey) {
      return c.json({ error: 'Configura tu API Key de Google Gemini en Ajustes.' }, 400)
    }

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [
              { inline_data: { mime_type: file.type, data: base64 } },
              { text: OCR_PROMPT },
            ],
          }],
          generationConfig: { temperature: 0.1, maxOutputTokens: 1024 },
        }),
      },
    )

    if (!response.ok) {
      const err = await response.text()
      console.error('Gemini API error:', response.status, err)
      try {
        const errJson = JSON.parse(err)
        const msg = errJson?.error?.message ?? ''
        if (msg.includes('API key')) return c.json({ error: 'API Key de Gemini inválida. Verifica en Ajustes.' }, 400)
        if (msg.includes('quota')) return c.json({ error: 'Cuota de Gemini agotada. Intenta más tarde.' }, 429)
        return c.json({ error: `Error Gemini: ${msg || response.statusText}` }, 500)
      } catch {
        return c.json({ error: 'Error al procesar con Gemini. Verifica tu API Key.' }, 500)
      }
    }

    const data = await response.json() as any
    ocrText = data.candidates?.[0]?.content?.parts?.[0]?.text ?? ''

    if (!ocrText) {
      const blockReason = data.candidates?.[0]?.finishReason
      if (blockReason === 'SAFETY') return c.json({ error: 'Gemini bloqueó la imagen por políticas de seguridad.' }, 400)
      return c.json({ error: 'Gemini no pudo extraer texto de la imagen.' }, 500)
    }
  } else {
    // Claude (default)
    const apiKey = c.env.ANTHROPIC_API_KEY
    if (!apiKey) return c.json({ error: 'Claude OCR no configurado en el servidor.' }, 500)

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
              { type: 'image', source: { type: 'base64', media_type: file.type, data: base64 } },
              { type: 'text', text: OCR_PROMPT },
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
    ocrText = data.content?.[0]?.text ?? ''
  }

  // Parse JSON from response
  const jsonMatch = ocrText.match(/\{[\s\S]*\}/)
  if (!jsonMatch) {
    return c.json({ error: 'Could not parse OCR result' }, 500)
  }

  const ocrResult = JSON.parse(jsonMatch[0])

  // Upload the file to R2 for storage
  const bucket = c.env.FILES
  if (bucket) {
    const ext = file.name.split('.').pop() || 'jpg'
    const key = `${auth.userId}/ocr-${Date.now()}-${Math.random().toString(36).slice(2, 6)}.${ext}`
    await bucket.put(key, arrayBuffer, {
      httpMetadata: { contentType: file.type },
      customMetadata: { originalName: file.name, userId: auth.userId },
    })
    ocrResult.imageUrl = `/api/files/${key}`
  }

  return c.json(ocrResult)
})
