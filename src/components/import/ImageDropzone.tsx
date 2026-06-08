import { useState, useRef, type DragEvent } from 'react'
import { Upload, X, ImageIcon, Camera } from 'lucide-react'
import { toast } from 'sonner'
import { shouldUseWebCameraFallback } from '@/lib/desktop-mode'
import {
  canUseNativeCamera,
  capturePhotoWithNativeCamera,
} from '@/lib/native-camera'
import { CameraCaptureDialog } from '@/components/common/CameraCaptureDialog'

const MAX_SIZE = 5 * 1024 * 1024
const ACCEPTED = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf']

interface ImageDropzoneProps {
  onFileAccepted: (file: File) => void
  preview: string | null
  onClear: () => void
}

export function ImageDropzone({ onFileAccepted, preview, onClear }: ImageDropzoneProps) {
  const [dragging, setDragging] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [cameraOpen, setCameraOpen] = useState(false)
  const [cameraBusy, setCameraBusy] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const cameraRef = useRef<HTMLInputElement>(null)
  const useWebCameraFallback = shouldUseWebCameraFallback() && !canUseNativeCamera()

  function validate(file: File): string | null {
    if (!ACCEPTED.includes(file.type)) return 'Unsupported format. Use JPG, PNG, WEBP, or PDF.'
    if (file.size > MAX_SIZE) return 'File exceeds 5 MB.'
    return null
  }

  function handleFile(file: File) {
    const err = validate(file)
    if (err) { setError(err); return }
    setError(null)
    onFileAccepted(file)
  }

  function handleDrop(e: DragEvent) {
    e.preventDefault()
    setDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) handleFile(file)
    if (inputRef.current) inputRef.current.value = ''
  }

  async function openCamera() {
    if (canUseNativeCamera()) {
      setCameraBusy(true)
      try {
        const file = await capturePhotoWithNativeCamera()
        if (file) handleFile(file)
      } catch {
        toast.error('Could not open the camera. Try again.')
      } finally {
        setCameraBusy(false)
      }
      return
    }

    if (useWebCameraFallback) {
      setCameraOpen(true)
      return
    }

    cameraRef.current?.click()
  }

  if (preview) {
    return (
      <div className="relative inline-block">
        <img src={preview} alt="Preview" className="max-h-64 rounded-md border border-border object-contain" />
        <button
          type="button"
          onClick={onClear}
          className="absolute right-2 top-2 rounded-full bg-surface/80 p-1.5 transition-colors hover:bg-surface"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    )
  }

  return (
    <div>
      <div
        onDragOver={e => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        className={`flex h-48 cursor-pointer flex-col items-center justify-center gap-3 rounded-[10px] border-2 border-dashed transition-colors ${
          dragging ? 'border-brand bg-brand/5' : 'border-border hover:border-brand/50 hover:bg-surface-2/30'
        }`}
      >
        {dragging ? (
          <Upload className="h-8 w-8 text-brand" />
        ) : (
          <ImageIcon className="h-8 w-8 text-text-faint" />
        )}
        <div className="text-center">
          <p className="text-[13px] text-text-muted">
            Drag an image here or <span className="text-brand">click to select</span>
          </p>
          <p className="mt-1 text-[11px] text-text-faint">JPG, PNG, WEBP, or PDF · Max 5 MB</p>
        </div>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,application/pdf"
        className="hidden"
        onChange={handleInputChange}
      />
      {!useWebCameraFallback ? (
        <input
          ref={cameraRef}
          type="file"
          accept="image/jpeg,image/png"
          capture="environment"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0]
            if (file) handleFile(file)
            if (cameraRef.current) cameraRef.current.value = ''
          }}
        />
      ) : null}
      <button
        type="button"
        disabled={cameraBusy}
        onClick={() => void openCamera()}
        className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-border py-3 text-[13px] text-text-muted transition-colors hover:border-brand/50 hover:text-brand disabled:opacity-60"
      >
        <Camera className="h-4 w-4" />
        {cameraBusy ? 'Opening camera…' : 'Take photo'}
      </button>
      {error && <p className="mt-2 text-[12px] text-danger-strong">{error}</p>}

      {useWebCameraFallback ? (
        <CameraCaptureDialog
          open={cameraOpen}
          onOpenChange={setCameraOpen}
          onCapture={handleFile}
        />
      ) : null}
    </div>
  )
}
