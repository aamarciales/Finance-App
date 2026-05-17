import { useRef } from 'react'
import { Camera, ImagePlus, PenLine } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from '@/components/ui/dialog'

const ACCEPTED = 'image/jpeg,image/png,image/webp,application/pdf'

interface CreateMenuDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onImageSelected: (file: File) => void
  onManual: () => void
  label: string
}

export function CreateMenuDialog({ open, onOpenChange, onImageSelected, onManual, label }: CreateMenuDialogProps) {
  const cameraRef = useRef<HTMLInputElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  function handleFile(file: File) {
    onImageSelected(file)
    onOpenChange(false)
  }

  const cards = [
    {
      icon: Camera,
      title: 'Tomar foto',
      description: 'Captura el recibo con la cámara',
      onClick: () => cameraRef.current?.click(),
    },
    {
      icon: ImagePlus,
      title: 'Subir imagen',
      description: 'Selecciona una imagen o PDF',
      onClick: () => fileRef.current?.click(),
    },
    {
      icon: PenLine,
      title: 'Entrada manual',
      description: 'Llena el formulario manualmente',
      onClick: () => { onManual(); onOpenChange(false) },
    },
  ]

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm p-0 overflow-hidden">
        <div className="p-6 pb-2">
          <DialogTitle className="font-serif text-lg">Nueva {label}</DialogTitle>
          <p className="text-[13px] text-text-muted mt-1">¿Cómo quieres crearla?</p>
        </div>
        <div className="px-6 pb-6 space-y-3">
          {cards.map((card) => (
            <button
              key={card.title}
              type="button"
              onClick={card.onClick}
              className="flex w-full items-center gap-4 rounded-lg border border-border px-4 py-3.5 text-left transition-colors hover:bg-surface-2 active:bg-surface-2/60"
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand/10 text-brand">
                <card.icon className="h-5 w-5" />
              </div>
              <div>
                <p className="text-[14px] font-medium">{card.title}</p>
                <p className="text-[12px] text-text-muted">{card.description}</p>
              </div>
            </button>
          ))}
        </div>

        {/* Hidden inputs */}
        <input
          ref={cameraRef}
          type="file"
          accept="image/jpeg,image/png"
          capture="environment"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0]
            if (f) handleFile(f)
            e.target.value = ''
          }}
        />
        <input
          ref={fileRef}
          type="file"
          accept={ACCEPTED}
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0]
            if (f) handleFile(f)
            e.target.value = ''
          }}
        />
      </DialogContent>
    </Dialog>
  )
}
