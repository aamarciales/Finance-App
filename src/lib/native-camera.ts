import { isAndroidMode } from '@/lib/desktop-mode'

function isTauriShell(): boolean {
  return typeof window !== 'undefined' && '__TAURI__' in window
}

/** Android Tauri shell can open the system camera app (not the WebView gallery picker). */
export function canUseNativeCamera(): boolean {
  return isAndroidMode() && isTauriShell()
}

function cameraErrorMessage(error: unknown): string {
  if (typeof error === 'string') return error
  if (error instanceof Error) return error.message
  if (error && typeof error === 'object' && 'message' in error) {
    return String((error as { message: unknown }).message)
  }
  return String(error)
}

export function isCameraCancelled(error: unknown): boolean {
  const msg = cameraErrorMessage(error).toLowerCase()
  return (
    msg.includes('cancel') ||
    msg.includes('abort') ||
    msg.includes('result_canceled')
  )
}

function base64ToJpegFile(base64: string, filename: string): File {
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return new File([bytes], filename, { type: 'image/jpeg' })
}

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * Opens the device camera app via Tauri. Retries once after permission grant
 * (first launch can return before the camera intent opens on some WebViews).
 */
export async function capturePhotoWithNativeCamera(): Promise<File | null> {
  const { takePicture } = await import('tauri-plugin-native-camera-api')

  let lastError: unknown
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const result = await takePicture()
      return base64ToJpegFile(result.imageData, `recibo-${Date.now()}.jpg`)
    } catch (error) {
      if (isCameraCancelled(error)) return null
      lastError = error
      if (attempt === 0) {
        await wait(500)
        continue
      }
      break
    }
  }

  throw lastError
}
