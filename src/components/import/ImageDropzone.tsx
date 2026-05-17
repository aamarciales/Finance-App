import { useState, useRef, type DragEvent } from 'react'
import { Upload, X, ImageIcon, Camera } from 'lucide-react'

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
  const inputRef = useRef<HTMLInputElement>(null)
  const cameraRef = useRef<HTMLInputElement>(null)

  function validate(file: File): string | null {
    if (!ACCEPTED.includes(file.type)) return 'Formato no soportado. Usa JPG, PNG, WEBP o PDF.'
    if (file.size > MAX_SIZE) return 'El archivo excede 5 MB.'
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
            Arrastra una imagen aquí o <span className="text-brand">haz clic para seleccionar</span>
          </p>
          <p className="mt-1 text-[11px] text-text-faint">JPG, PNG, WEBP o PDF · Máximo 5 MB</p>
        </div>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,application/pdf"
        className="hidden"
        onChange={handleInputChange}
      />
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
      <button
        type="button"
        onClick={() => cameraRef.current?.click()}
        className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-border py-3 text-[13px] text-text-muted transition-colors hover:border-brand/50 hover:text-brand"
      >
        <Camera className="h-4 w-4" />
        Tomar foto
      </button>
      {error && <p className="mt-2 text-[12px] text-danger-strong">{error}</p>}
    </div>
  )
}
