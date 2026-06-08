import { useEffect } from 'react'
import { isDesktopMode } from '@/lib/desktop-mode'
import {
  isInteractiveDragTarget,
  isTauriRuntime,
  isWindowDragZone,
  startWindowDrag,
} from '@/lib/tauri-window'

/** Overlay title-bar drag targets for the trakll Mac shell. */
export function DesktopWindowChrome() {
  useEffect(() => {
    if (!isDesktopMode() || !isTauriRuntime()) return

    const onMouseDown = (event: MouseEvent) => {
      if (event.button !== 0) return
      if (isInteractiveDragTarget(event.target)) return
      if (!isWindowDragZone(event)) return
      void startWindowDrag()
    }

    document.addEventListener('mousedown', onMouseDown, true)
    return () => document.removeEventListener('mousedown', onMouseDown, true)
  }, [])

  if (!isDesktopMode()) return null

  return (
    <div
      data-tauri-drag-region
      className="desktop-drag-strip"
      onMouseDown={(event) => {
        if (event.button === 0) void startWindowDrag()
      }}
      aria-hidden
    />
  )
}
