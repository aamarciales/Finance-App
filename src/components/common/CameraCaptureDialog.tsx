import { useEffect, useRef, useState } from 'react'
import { Camera, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from '@/components/ui/dialog'

interface CameraCaptureDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCapture: (file: File) => void
}

/** In-app camera for Android WebView where <input capture> opens the gallery. */
export function CameraCaptureDialog({ open, onOpenChange, onCapture }: CameraCaptureDialogProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    if (!open) return

    let cancelled = false
    setError(null)
    setReady(false)

    async function startCamera() {
      try {
        if (!navigator.mediaDevices?.getUserMedia) {
          throw new Error('Camera unavailable')
        }
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: 'environment' } },
          audio: false,
        })
        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop())
          return
        }
        streamRef.current = stream
        const video = videoRef.current
        if (!video) return
        video.srcObject = stream
        await video.play()
        setReady(true)
      } catch {
        if (!cancelled) {
          setError('Could not open the camera. Check app permissions.')
        }
      }
    }

    void startCamera()

    return () => {
      cancelled = true
      streamRef.current?.getTracks().forEach((track) => track.stop())
      streamRef.current = null
      if (videoRef.current) videoRef.current.srcObject = null
      setReady(false)
    }
  }, [open])

  function handleCapture() {
    const video = videoRef.current
    if (!video || !ready || video.videoWidth === 0) return

    const canvas = document.createElement('canvas')
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.drawImage(video, 0, 0)

    canvas.toBlob(
      (blob) => {
        if (!blob) return
        const file = new File([blob], `recibo-${Date.now()}.jpg`, { type: 'image/jpeg' })
        onCapture(file)
        onOpenChange(false)
      },
      'image/jpeg',
      0.92,
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md gap-0 overflow-hidden p-0">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <DialogTitle className="font-serif text-lg">Take photo</DialogTitle>
          <button
            type="button"
            className="rounded-md p-1 text-text-muted hover:bg-surface-2"
            onClick={() => onOpenChange(false)}
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="relative aspect-[3/4] bg-black">
          {error ? (
            <p className="absolute inset-0 flex items-center justify-center px-4 text-center text-sm text-white">
              {error}
            </p>
          ) : (
            <video
              ref={videoRef}
              playsInline
              muted
              autoPlay
              className="h-full w-full object-cover"
            />
          )}
        </div>
        <div className="p-4">
          <Button type="button" className="w-full" disabled={!ready} onClick={handleCapture}>
            <Camera className="mr-2 h-4 w-4" />
            Capture
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
