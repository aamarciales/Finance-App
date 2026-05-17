import { useState } from 'react'
import { toast } from 'sonner'
import { processReceiptOCR, type OcrResult } from '@/lib/ocr'

export function useOcrFlow() {
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [processing, setProcessing] = useState(false)
  const [ocrResult, setOcrResult] = useState<OcrResult | null>(null)

  function handleFileAccepted(file: File) {
    setImageFile(file)
    setImagePreview(URL.createObjectURL(file))
    setOcrResult(null)
  }

  function clearImage() {
    if (imagePreview) URL.revokeObjectURL(imagePreview)
    setImageFile(null)
    setImagePreview(null)
    setOcrResult(null)
  }

  async function processOCR() {
    if (!imageFile) return
    setProcessing(true)
    try {
      const result = await processReceiptOCR(imageFile)
      setOcrResult(result)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Error al procesar la imagen')
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
