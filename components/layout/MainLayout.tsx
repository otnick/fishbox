'use client'

import { ReactNode, useEffect } from 'react'
import CatchForm from '@/components/CatchForm'
import { useCatchStore } from '@/lib/store'
import Navigation from './Navigation'

interface MainLayoutProps {
  children: ReactNode
}

export default function MainLayout({ children }: MainLayoutProps) {
  const isCatchModalOpen = useCatchStore((state) => state.isCatchModalOpen)
  const closeCatchModal = useCatchStore((state) => state.closeCatchModal)

  useEffect(() => {
    if (!isCatchModalOpen) return
    const originalOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = originalOverflow
    }
  }, [isCatchModalOpen])

  return (
    <div className="min-h-screen bg-gradient-to-b from-ocean-deeper to-ocean-dark">
      <Navigation />

        {/* Main Content */}
        <main className="lg:pl-64 pb-20 lg:pb-4">
          <div className="px-4 sm:px-6 lg:px-8 py-8">{children}</div>
        </main>

        {isCatchModalOpen && (
          <div className="fixed inset-0 z-40 flex items-end sm:items-center justify-center p-2 pt-3 pb-[calc(env(safe-area-inset-bottom)+5.5rem)] sm:p-4">
            <div
              className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-catchOverlayIn"
              onClick={closeCatchModal}
            />
            <div
              data-catch-modal-sheet="true"
              className="relative w-full max-w-none sm:max-w-2xl max-h-[80vh] sm:max-h-[75vh] overflow-x-hidden overflow-y-auto bg-ocean-deeper sm:bg-ocean/30 backdrop-blur-sm rounded-t-3xl sm:rounded-2xl p-6 sm:p-6 shadow-2xl animate-catchModalIn"
            >
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-white">Neuen Fang hinzufügen</h2>
                <button
                  onClick={closeCatchModal}
                  className="text-ocean-light hover:text-white transition-colors text-xl leading-none"
                  aria-label="Schließen"
                >
                  ×
                </button>
              </div>
              <CatchForm onSuccess={closeCatchModal} embeddedFlow />
            </div>
          </div>
        )}
    </div>
  )
}
