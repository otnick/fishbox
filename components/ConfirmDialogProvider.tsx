'use client'

import { createContext, useCallback, useContext, useMemo, useState } from 'react'
import { X } from 'lucide-react'

type ConfirmVariant = 'default' | 'danger'

type ConfirmOptions = {
  title: string
  message: string
  confirmLabel?: string
  cancelLabel?: string
  variant?: ConfirmVariant
}

type ConfirmContextValue = {
  confirm: (options: ConfirmOptions) => Promise<boolean>
}

type PendingConfirm = ConfirmOptions & {
  resolve: (value: boolean) => void
}

const ConfirmContext = createContext<ConfirmContextValue | null>(null)

export function useConfirm() {
  const ctx = useContext(ConfirmContext)
  if (!ctx) {
    throw new Error('useConfirm must be used within ConfirmDialogProvider')
  }
  return ctx
}

export default function ConfirmDialogProvider({ children }: { children: React.ReactNode }) {
  const [pending, setPending] = useState<PendingConfirm | null>(null)

  const confirm = useCallback((options: ConfirmOptions) => {
    return new Promise<boolean>((resolve) => {
      setPending({
        confirmLabel: 'Bestätigen',
        cancelLabel: 'Abbrechen',
        variant: 'default',
        ...options,
        resolve,
      })
    })
  }, [])

  const close = useCallback(
    (result: boolean) => {
      if (pending) {
        pending.resolve(result)
        setPending(null)
      }
    },
    [pending]
  )

  const value = useMemo(() => ({ confirm }), [confirm])

  return (
    <ConfirmContext.Provider value={value}>
      {children}
      {pending && (
        <div className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center p-3 sm:p-6">
          <div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() => close(false)}
          />
          <div className="relative w-full max-w-md rounded-3xl sm:rounded-2xl bg-ocean-deeper sm:bg-ocean/30 border border-ocean-light/20 shadow-2xl p-5 sm:p-6 animate-catchModalIn">
            <div className="flex items-start justify-between gap-4 mb-4">
              <div>
                <h3 className="text-lg sm:text-xl font-bold text-white">{pending.title}</h3>
                <p className="text-ocean-light text-sm mt-1">{pending.message}</p>
              </div>
              <button
                onClick={() => close(false)}
                className="text-ocean-light hover:text-white"
                aria-label="Dialog schließen"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex flex-col-reverse sm:flex-row gap-2 sm:gap-3">
              <button
                onClick={() => close(false)}
                className="flex-1 bg-ocean-dark/60 hover:bg-ocean-dark text-white font-semibold py-3 rounded-xl transition-colors"
              >
                {pending.cancelLabel}
              </button>
              <button
                onClick={() => close(true)}
                className={`flex-1 font-semibold py-3 rounded-xl transition-colors ${
                  pending.variant === 'danger'
                    ? 'bg-red-600 hover:bg-red-700 text-white'
                    : 'bg-ocean hover:bg-ocean-light text-white'
                }`}
              >
                {pending.confirmLabel}
              </button>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  )
}
