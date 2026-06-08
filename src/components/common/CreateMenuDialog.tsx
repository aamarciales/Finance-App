import { useRef, useState } from 'react'
import { Camera, ImagePlus, PenLine } from 'lucide-react'
import { toast } from 'sonner'
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from '@/components/ui/dialog'
import { shouldUseWebCameraFallback } from '@/lib/desktop-mode'
import {
  canUseNativeCamera,
  capturePhotoWithNativeCamera,
} from '@/lib/native-camera'
import { CameraCaptureDialog } from '@/components/common/CameraCaptureDialog'

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
  const [cameraOpen, setCameraOpen] = useState(false)
  const [cameraBusy, setCameraBusy] = useState(false)
  const useWebCameraFallback = shouldUseWebCameraFallback() && !canUseNativeCamera()

  function handleFile(file: File) {
    onImageSelected(file)
    onOpenChange(false)
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

  const cards = [
    {
      icon: Camera,
      title: 'Take photo',
      description: cameraBusy ? 'Opening camera…' : 'Capture the receipt with your camera',
      onClick: () => void openCamera(),
      disabled: cameraBusy,
    },
    {
      icon: ImagePlus,
      title: 'Upload image',
      description: 'Choose an image or PDF',
      onClick: () => fileRef.current?.click(),
      disabled: false,
    },
    {
      icon: PenLine,
      title: 'Manual entry',
      description: 'Fill out the form manually',
      onClick: () => { onManual(); onOpenChange(false) },
      disabled: false,
    },
  ]

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-sm p-0 overflow-hidden">
          <div className="p-6 pb-2">
            <DialogTitle className="font-serif text-lg">New {label}</DialogTitle>
            <p className="text-[13px] text-text-muted mt-1">How would you like to create it?</p>
          </div>
          <div className="px-6 pb-6 space-y-3">
            {cards.map((card) => (
              <button
                key={card.title}
                type="button"
                disabled={card.disabled}
                onClick={card.onClick}
                className="flex w-full items-center gap-4 rounded-lg border border-border px-4 py-3.5 text-left transition-colors hover:bg-surface-2 active:bg-surface-2/60 disabled:opacity-60"
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

          {!useWebCameraFallback ? (
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
          ) : null}
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

      {useWebCameraFallback ? (
        <CameraCaptureDialog
          open={cameraOpen}
          onOpenChange={setCameraOpen}
          onCapture={handleFile}
        />
      ) : null}
    </>
  )
}
