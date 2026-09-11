import { useRef, type PointerEvent } from 'react'

const isInteractive = (target: EventTarget) =>
  target instanceof Element && !!target.closest('a, button, input, textarea, img, iframe, video')

export function useDoubleTap(onDoubleTap: () => void) {
  const start = useRef<{ x: number; y: number; time: number } | null>(null)
  const lastTap = useRef<{ x: number; y: number; time: number } | null>(null)
  const reset = () => { start.current = null; lastTap.current = null }
  return {
    onPointerDown(event: PointerEvent) {
      if (event.pointerType !== 'touch' || !event.isPrimary || isInteractive(event.target)) {
        reset()
        return
      }
      start.current = { x: event.clientX, y: event.clientY, time: Date.now() }
    },
    onPointerMove(event: PointerEvent) {
      const point = start.current
      if (point && Math.hypot(event.clientX - point.x, event.clientY - point.y) > 15) reset()
    },
    onPointerCancel: reset,
    onPointerUp() {
      const point = start.current
      start.current = null
      if (!point || Date.now() - point.time > 300) return
      const previous = lastTap.current
      if (previous && Date.now() - previous.time < 300 && Math.hypot(point.x - previous.x, point.y - previous.y) < 30) {
        lastTap.current = null
        onDoubleTap()
      } else {
        lastTap.current = { ...point, time: Date.now() }
      }
    },
  }
}
