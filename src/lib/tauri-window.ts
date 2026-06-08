const INTERACTIVE_DRAG_BLOCK =
  "button, a, input, textarea, select, option, label, [contenteditable='true'], [data-no-drag]"

export function isTauriRuntime(): boolean {
  return typeof window !== 'undefined' && '__TAURI__' in window
}

export async function startWindowDrag(): Promise<void> {
  if (!isTauriRuntime()) return

  try {
    const { getCurrentWindow } = await import('@tauri-apps/api/window')
    await getCurrentWindow().startDragging()
    return
  } catch {
    // Fall through to global Tauri object.
  }

  const tauri = (window as Window & {
    __TAURI__?: { window?: { getCurrentWindow?: () => { startDragging: () => Promise<void> } } }
  }).__TAURI__
  const start = tauri?.window?.getCurrentWindow?.()?.startDragging
  if (start) await start()
}

export function isWindowDragZone(event: MouseEvent): boolean {
  if (event.clientY <= 52) return true
  if (event.clientX <= 218 && event.clientY <= 88) return true
  return false
}

export function isInteractiveDragTarget(target: EventTarget | null): boolean {
  if (!(target instanceof Element)) return false
  return Boolean(target.closest(INTERACTIVE_DRAG_BLOCK))
}
