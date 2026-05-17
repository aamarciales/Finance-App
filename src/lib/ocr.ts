export interface OcrItem {
  description: string
  quantity: number
  price: number
  lineTotal?: number
  category?: string
}

export interface OcrValidation {
  computedSubtotal: number
  subtotalDelta: number
  subtotalDeltaPct: number
  totalCheck: number
  itemCountMatch: boolean
}

export interface OcrResult {
  merchant: string
  date: string
  items: OcrItem[]
  subtotal?: number
  discount?: number
  total: number
  currency?: string
  confidence: number
  realConfidence: 'high' | 'medium' | 'low'
  itemCountReported?: number
  validation?: OcrValidation
  imageUrl?: string
}

export async function processReceiptOCR(imageBlob: Blob): Promise<OcrResult> {
  const ext = imageBlob.type === 'application/pdf' ? 'pdf'
    : imageBlob.type === 'image/png' ? 'png'
    : imageBlob.type === 'image/webp' ? 'webp'
    : 'jpg'
  const formData = new FormData()
  formData.append('file', imageBlob, `receipt.${ext}`)

  const response = await fetch('/api/files/ocr', {
    method: 'POST',
    body: formData,
  })

  if (!response.ok) {
    const err = await response.json().catch(() => ({ error: 'OCR failed' }))
    throw new Error(err.error ?? 'OCR processing failed')
  }

  const result = await response.json() as OcrResult
  return result
}
