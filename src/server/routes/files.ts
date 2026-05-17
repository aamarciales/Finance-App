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

const OCR_PROMPT = `Eres un extractor de datos de recibos y facturas colombianas. Tu trabajo es leer la imagen y devolver JSON estructurado con CADA línea de producto del recibo.

RESPONDE ÚNICAMENTE CON JSON (sin markdown, sin backticks, sin explicación):

{
  "merchant": "nombre del comercio o null",
  "date": "YYYY-MM-DD o null",
  "items": [
    {"description": "nombre del producto", "quantity": 1, "price": 0, "lineTotal": 0}
  ],
  "subtotal": 0,
  "discount": 0,
  "total": 0,
  "currency": "COP",
  "itemCountReported": 0
}

REGLAS DE EXTRACCIÓN

1. ITEMS: extrae TODOS los items del recibo, sin saltarte ninguno. Si el recibo dice "31 items" o "NUM ART ENTREGADOS: 36" o "Nro Items: 7", debes extraer exactamente ese número de líneas.

2. quantity = cantidad del item (columna CAN, CANT, Cant., o similar). Si no aparece, asume 1.

3. lineTotal = monto total de esa línea (lo que el recibo pagó por esa línea). Es la cifra más a la derecha de cada item.

4. price = lineTotal / quantity. Calcúlalo tú, no lo leas. Si quantity=2 y lineTotal=6980, entonces price=3490.

5. description = nombre del producto tal como aparece, sin abreviar más de lo necesario. Si está truncado en el recibo ("TORTILLA BURR"), déjalo así.

6. subtotal = suma de los lineTotal antes de descuentos. Si el recibo no muestra subtotal explícito, calcúlalo.

7. discount = total de descuentos aplicados (positivo). Si el recibo tiene "Descuento A: 15% = -660" y "Descuento B: 20% = -1020", entonces discount = 1680. Si no hay descuentos, 0.

8. total = monto final pagado (TOTAL del recibo, después de descuentos). Debe cumplir: total = subtotal - discount.

9. itemCountReported = el número de items que el recibo mismo declara. Búscalo en lugares como "NUM ART ENTREGADOS", "Nro Items", "Cant Art", o la última línea numerada (ej "31 1 UN..." indica 31 items). Si no aparece, pon el número de items que extrajiste.

FORMATO NUMÉRICO COLOMBIANO (CRÍTICO)

En Colombia el punto es separador de MILES, no decimal. La coma es decimal.

- "$7.550" significa 7550 (siete mil quinientos cincuenta)
- "$214.440" significa 214440
- "$1.150" significa 1150
- "$12.490" significa 12490
- "1,150.00" significa 1150 con dos decimales (formato USA, raro en recibos COP)

Todos los montos en el JSON deben ser ENTEROS en la moneda original. NO conviertas a dólares. NO uses decimales en pesos colombianos.

MONEDA

- Si ves "$" o "COP" o nombres de comercios colombianos (D1, Mas x Menos, Éxito, Carulla, Olímpica, etc): currency = "COP"
- Si ves "USD" o "US$" explícitamente: currency = "USD"
- Si ves "EUR" o "€" explícitamente: currency = "EUR"
- Por defecto: "COP"

VALIDACIÓN ANTES DE RESPONDER

Antes de responder, verifica internamente:
1. ¿Tu sum(items[].lineTotal) es igual a subtotal? Si no, releé los items.
2. ¿subtotal - discount es igual a total? Si no, releé los montos.
3. ¿items.length coincide con itemCountReported? Si no, falta algún item — releé el recibo completo.

Si después de re-leer no logras hacer cuadrar las cifras, devuelve los items que sí leíste con confianza y deja el total tal como aparece en el recibo. NO inventes items para cuadrar.

CASOS ESPECIALES

- Si el recibo está borroso o tiene partes ilegibles, extrae lo que sí puedas leer y deja null o 0 en lo que no.
- Si es un recibo manuscrito (no impreso), haz tu mejor intento pero no inventes datos.
- Si es una factura de servicio (Claro, EPM, agua, luz, gas), normalmente solo hay 1 item. Déjalo como un item único con description = nombre del servicio.
- No incluyas líneas que no son productos (encabezados, totales, IVA, métodos de pago) en el array items.`

type RealConfidence = 'high' | 'medium' | 'low'

function computeRealConfidence(
  subtotalDeltaPct: number,
  totalCheck: number,
  total: number,
  itemCountMatch: boolean
): RealConfidence {
  const totalIsConsistent = total === 0 || totalCheck / Math.max(total, 1) < 0.01
  if (subtotalDeltaPct < 0.01 && totalIsConsistent && itemCountMatch) return 'high'
  if (subtotalDeltaPct < 0.05 && totalIsConsistent) return 'medium'
  return 'low'
}

function validateOcrResult(result: any) {
  const items: any[] = result.items ?? []
  const subtotal = result.subtotal ?? result.total ?? 0
  const discount = result.discount ?? 0
  const total = result.total ?? 0
  const itemCountReported = result.itemCountReported ?? items.length

  const computedSubtotal = items.reduce((s: number, i: any) => s + (i.lineTotal ?? 0), 0)
  const subtotalDelta = Math.abs(computedSubtotal - subtotal)
  const subtotalDeltaPct = subtotal > 0 ? subtotalDelta / subtotal : (computedSubtotal > 0 ? 1 : 0)
  const totalCheck = Math.abs((subtotal - discount) - total)
  const itemCountMatch = !result.itemCountReported ? true : items.length === itemCountReported

  // All items have zero lineTotal → low confidence
  const allZero = items.length > 0 && items.every((i: any) => !(i.lineTotal > 0))

  const realConfidence: RealConfidence = allZero
    ? 'low'
    : computeRealConfidence(subtotalDeltaPct, totalCheck, total, itemCountMatch)

  result.realConfidence = realConfidence
  result.subtotal ??= computedSubtotal
  result.discount ??= 0
  result.itemCountReported = itemCountReported
  result.validation = { computedSubtotal, subtotalDelta, subtotalDeltaPct, totalCheck, itemCountMatch }
}

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
        model: 'gpt-4.1-mini',
        max_tokens: 4096,
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
          generationConfig: { temperature: 0.1, maxOutputTokens: 4096 },
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
        max_tokens: 4096,
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

  // Post-OCR validation
  validateOcrResult(ocrResult)

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
