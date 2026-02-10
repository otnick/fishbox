'use client'

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { CheckCircle2, Info, AlertTriangle, X } from 'lucide-react'

type ToastType = 'success' | 'error' | 'info'

type Toast = {
  id: string
  message: string
  type: ToastType
}

type ToastContextValue = {
  toast: (message: string, type?: ToastType, durationMs?: number) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

const ICONS: Record<ToastType, typeof Info> = {
  success: CheckCircle2,
  error: AlertTriangle,
  info: Info,
}

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) {
    throw new Error('useToast must be used within ToastProvider')
  }
  return ctx
}

export default function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const remove = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const toast = useCallback(
    (message: string, type: ToastType = 'info', durationMs = 2600) => {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`
      setToasts((prev) => [...prev, { id, message, type }])
      window.setTimeout(() => remove(id), durationMs)
    },
    [remove]
  )

  useEffect(() => {
    const handler = (event: Event) => {
      const detail = (event as CustomEvent).detail as {
        message: string
        type?: ToastType
        durationMs?: number
      }
      if (!detail?.message) return
      toast(detail.message, detail.type || 'info', detail.durationMs)
    }
    window.addEventListener('app:toast', handler as EventListener)
    return () => window.removeEventListener('app:toast', handler as EventListener)
  }, [toast])

  const value = useMemo(() => ({ toast }), [toast])

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="fixed bottom-4 right-4 sm:bottom-4 sm:right-4 left-4 sm:left-auto z-[70] flex flex-col gap-2">
        {toasts.map((t) => {
          const Icon = ICONS[t.type]
          return (
            <div
              key={t.id}
              className={`min-w-[240px] max-w-[340px] rounded-xl px-4 py-3 shadow-xl border backdrop-blur-sm animate-fadeIn ${
                t.type === 'success'
                  ? 'bg-emerald-500/15 border-emerald-400/40 text-emerald-100'
                  : t.type === 'error'
                    ? 'bg-red-500/15 border-red-400/40 text-red-100'
                    : 'bg-ocean/30 border-ocean-light/20 text-white'
              }`}
            >
              <div className="flex items-start gap-2">
                <div
                  className={`mt-0.5 flex h-6 w-6 items-center justify-center rounded-full border ${
                    t.type === 'success'
                      ? 'border-emerald-300/50 bg-emerald-500/15'
                      : t.type === 'error'
                        ? 'border-red-300/50 bg-red-500/15'
                        : 'border-ocean-light/30 bg-ocean-dark/40'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                </div>
                <div className="text-sm flex-1">{t.message}</div>
                <button
                  onClick={() => remove(t.id)}
                  className="text-ocean-light hover:text-white"
                  aria-label="Schließen"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          )
        })}
      </div>
    </ToastContext.Provider>
  )
}
