'use client'

import Image from 'next/image'
import { RefreshCw, Edit3, XCircle, AlertTriangle } from 'lucide-react'

interface NoDetectionModalProps {
  photoPreview: string
  onRetry: () => void
  onManualOverride: () => void
  onReject: () => void
}

export default function NoDetectionModal({
  photoPreview,
  onRetry,
  onManualOverride,
  onReject
}: NoDetectionModalProps) {
  return (
    <div className="fixed inset-0 bg-black/90 z-[9999] flex items-center justify-center p-4">
      <div className="bg-ocean/30 backdrop-blur-sm rounded-xl max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <AlertTriangle className="w-8 h-8 text-red-400" />
          <div>
            <h2 className="text-2xl font-bold text-white">
              Kein Fisch erkannt
            </h2>
            <p className="text-ocean-light text-sm">
              Die KI konnte keinen Fisch im Bild erkennen
            </p>
          </div>
        </div>

        {/* Photo Preview */}
        <div className="relative w-full aspect-video rounded-lg overflow-hidden mb-6 bg-ocean-dark">
          <Image
            src={photoPreview}
            alt="Catch"
            fill
            className="object-cover"
          />
        </div>

        {/* Info Box */}
        <div className="bg-red-900/20 border border-red-600/30 rounded-lg p-4 mb-6">
          <h4 className="text-white font-semibold mb-2">Mögliche Gründe:</h4>
          <ul className="text-ocean-light text-sm space-y-1">
            <li>• Foto zu unscharf oder zu dunkel</li>
            <li>• Fisch ist nicht vollständig sichtbar</li>
            <li>• Fischart nicht in der Datenbank</li>
            <li>• Hintergrund zu unruhig</li>
          </ul>
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-3">
          <div className="grid grid-cols-3 gap-3">
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
          
          {/* Tip */}
          <div className="bg-ocean/20 rounded-lg p-3 text-center">
            <p className="text-ocean-light text-xs">
              💡 <strong>Tipp:</strong> Für beste Ergebnisse fotografiere den Fisch von der Seite mit gutem Licht
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
