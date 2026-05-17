export interface OcrItem {
  description: string
  quantity: number
  price: number
  lineTotal?: number
  category?: string
}

export interface OcrResult {
  merchant: string
  date: string
  items: OcrItem[]
  total: number
  currency?: string
  confidence: number
  imageUrl?: string
}

export async function processReceiptOCR(imageBlob: Blob): Promise<OcrResult> {
  const formData = new FormData()
  formData.append('file', imageBlob, 'receipt.jpg')

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
