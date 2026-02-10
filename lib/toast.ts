export type ToastType = 'success' | 'error' | 'info'

export function emitToast(message: string, type: ToastType = 'info', durationMs?: number) {
  if (typeof window === 'undefined') return
  window.dispatchEvent(
    new CustomEvent('app:toast', {
      detail: { message, type, durationMs },
    })
  )
}
