'use client'

import Image from 'next/image'
import { RefreshCw, Edit3, XCircle, AlertTriangle, Lightbulb } from 'lucide-react'

interface NoDetectionModalProps {
  embedded?: boolean
  photoPreview: string
  onRetry: () => void
  onManualOverride: () => void
  onReject: () => void
}

export default function NoDetectionModal({
  embedded = false,
  photoPreview,
  onRetry,
  onManualOverride,
  onReject,
}: NoDetectionModalProps) {
  return (
    <div
      className={
        embedded
          ? 'absolute inset-0 z-30 bg-black/75 backdrop-blur-sm rounded-2xl p-0 overflow-hidden animate-catchSubOverlayIn'
          : 'fixed inset-0 bg-black/92 z-[70] flex items-end sm:items-center justify-center p-2 pt-3 pb-[calc(env(safe-area-inset-bottom)+4.75rem)] sm:p-4'
      }
    >
      <div
        className={
          embedded
            ? 'bg-ocean/30 backdrop-blur-sm rounded-2xl w-full h-full p-4 sm:p-6 overflow-x-hidden overflow-y-auto overscroll-contain break-words animate-catchSubModalIn touch-auto'
            : 'bg-ocean/30 backdrop-blur-sm rounded-xl max-w-2xl w-full p-4 sm:p-6 max-h-[82dvh] sm:max-h-[90vh] overflow-x-hidden overflow-y-auto break-words'
        }
        data-catch-submodal={embedded ? 'true' : undefined}
      >
        <div className="flex items-center gap-3 mb-6">
          <AlertTriangle className="w-8 h-8 text-red-400" />
          <div>
            <h2 className="text-2xl font-bold text-white">Kein Fisch erkannt</h2>
            <p className="text-ocean-light text-sm">Die KI konnte keinen Fisch im Bild erkennen</p>
          </div>
        </div>

        <div className="relative w-full aspect-video rounded-lg overflow-hidden mb-6 bg-ocean-dark">
          <Image
            src={photoPreview}
            alt="Catch"
            fill
            sizes="(max-width: 768px) 100vw, 768px"
            className="object-cover"
          />
        </div>

        <div className="bg-red-900/20 border border-red-600/30 rounded-lg p-4 mb-6">
          <h4 className="text-white font-semibold mb-2">Mögliche Gründe:</h4>
          <ul className="text-ocean-light text-sm space-y-1">
            <li>- Foto zu unscharf oder zu dunkel</li>
            <li>- Fisch ist nicht vollständig sichtbar</li>
            <li>- Fischart nicht in der Datenbank</li>
            <li>- Hintergrund zu unruhig</li>
          </ul>
        </div>

        <div className="flex flex-col gap-3">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <button
              onClick={onRetry}
              className="bg-blue-900/30 hover:bg-blue-900/50 text-blue-400 font-semibold py-4 px-4 rounded-lg transition-colors flex flex-col items-center justify-center gap-2 group"
            >
              <RefreshCw className="w-8 h-8 group-hover:scale-110 group-hover:rotate-180 transition-all" />
              <span className="text-sm">Retry</span>
              <span className="text-xs text-blue-300/70">Erneut scannen</span>
            </button>
            <button
              onClick={onManualOverride}
              className="bg-yellow-900/30 hover:bg-yellow-900/50 text-yellow-400 font-semibold py-4 px-4 rounded-lg transition-colors flex flex-col items-center justify-center gap-2 group"
            >
              <Edit3 className="w-8 h-8 group-hover:scale-110 transition-transform" />
              <span className="text-sm">Manuell</span>
              <span className="text-xs text-yellow-300/70">Selbst wählen</span>
            </button>
            <button
              onClick={onReject}
              className="bg-red-900/30 hover:bg-red-900/50 text-red-400 font-semibold py-4 px-4 rounded-lg transition-colors flex flex-col items-center justify-center gap-2 group"
            >
              <XCircle className="w-8 h-8 group-hover:scale-110 transition-transform" />
              <span className="text-sm">Abbrechen</span>
              <span className="text-xs text-red-300/70">Verwerfen</span>
            </button>
          </div>

          <div className="bg-ocean/20 rounded-lg p-3 text-center">
            <p className="text-ocean-light text-xs inline-flex items-center gap-1">
              <Lightbulb className="w-4 h-4" />
              <span>
                <strong>Tipp:</strong> Für beste Ergebnisse fotografiere den Fisch von der Seite mit gutem Licht
              </span>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
