import { useState, useRef, type DragEvent } from 'react'
import { Upload, FileSpreadsheet, X } from 'lucide-react'

interface CsvDropzoneProps {
  onFileAccepted: (text: string, filename: string) => void
  fileName: string | null
  onClear: () => void
}

export function CsvDropzone({ onFileAccepted, fileName, onClear }: CsvDropzoneProps) {
  const [dragging, setDragging] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  function handleFile(file: File) {
    const reader = new FileReader()
    reader.onload = () => {
      const text = reader.result as string
      onFileAccepted(text, file.name)
    }
    reader.readAsText(file, 'utf-8')
  }

  function handleDrop(e: DragEvent) {
    e.preventDefault()
    setDragging(false)
    const file = e.dataTransfer.files[0]
    if (file && file.name.endsWith('.csv')) handleFile(file)
  }

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) handleFile(file)
    if (inputRef.current) inputRef.current.value = ''
  }

  if (fileName) {
    return (
      <div className="flex items-center gap-3 rounded-md border border-border bg-surface-2 px-4 py-3">
        <FileSpreadsheet className="h-5 w-5 text-text-muted" />
        <span className="text-[13px] font-medium">{fileName}</span>
        <button
          type="button"
          onClick={onClear}
          className="ml-auto rounded-md p-1 hover:bg-surface"
        >
          <X className="h-4 w-4 text-text-muted" />
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
        className={`flex h-36 cursor-pointer flex-col items-center justify-center gap-3 rounded-[10px] border-2 border-dashed transition-colors ${
          dragging ? 'border-brand bg-brand/5' : 'border-border hover:border-brand/50 hover:bg-surface-2/30'
        }`}
      >
        {dragging ? (
          <Upload className="h-7 w-7 text-brand" />
        ) : (
          <FileSpreadsheet className="h-7 w-7 text-text-faint" />
        )}
        <div className="text-center">
          <p className="text-[13px] text-text-muted">
            Arrastra un CSV aquí o <span className="text-brand">haz clic para seleccionar</span>
          </p>
          <p className="mt-1 text-[11px] text-text-faint">Bancolombia, Davivienda, Wise, Binance P2P</p>
        </div>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept=".csv,text/csv"
        className="hidden"
        onChange={handleInputChange}
      />
    </div>
  )
}
