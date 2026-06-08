import { useRef, useState } from 'react'
import { toast } from 'sonner'
import { processReceiptOCR, type OcrResult } from '@/lib/ocr'

export function useOcrFlow() {
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [processing, setProcessing] = useState(false)
  const [ocrResult, setOcrResult] = useState<OcrResult | null>(null)
  const fileRef = useRef<File | null>(null)

  function handleFileAccepted(file: File) {
    fileRef.current = file
    setImageFile(file)
    setImagePreview(URL.createObjectURL(file))
    setOcrResult(null)
  }

  function clearImage() {
    if (imagePreview) URL.revokeObjectURL(imagePreview)
    fileRef.current = null
    setImageFile(null)
    setImagePreview(null)
    setOcrResult(null)
  }

  async function processOCR() {
    const file = fileRef.current
    console.log('[useOcrFlow] processOCR called, file:', file ? `${file.name} (${file.size} bytes)` : 'null')
    if (!file) {
      console.warn('[useOcrFlow] No file in ref, aborting')
      return
    }
    setProcessing(true)
    try {
      console.log('[useOcrFlow] Calling processReceiptOCR...')
      const result = await processReceiptOCR(file)
      console.log('[useOcrFlow] OCR success:', result.merchant, result.items.length, 'items, total:', result.total)
      setOcrResult(result)
    } catch (e) {
      console.error('[useOcrFlow] OCR error:', e)
      toast.error(e instanceof Error ? e.message : 'Could not process image')
    } finally {
      setProcessing(false)
    }
  }

  function reset() {
    clearImage()
    setProcessing(false)
  }

  return {
    imageFile,
    imagePreview,
    processing,
    ocrResult,
    handleFileAccepted,
    clearImage,
    processOCR,
    reset,
  }
}
