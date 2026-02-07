'use client'

import { useState } from 'react'
import Image from 'next/image'
import { CheckCircle2, XCircle, AlertCircle, Loader2, RefreshCw } from 'lucide-react'
import type { FishDetectionResult } from '@/lib/utils/fishDetection'

interface AIVerificationModalProps {
  photoPreview: string
  detectionResults: FishDetectionResult[]
  detectionLoading: boolean
  onConfirm: (species: string) => void
  onReject: () => void
  onRetry: () => void
  onManualOverride: () => void
}

export default function AIVerificationModal({
  photoPreview,
  detectionResults,
  detectionLoading,
  onConfirm,
  onReject,
  onRetry,
  onManualOverride
}: AIVerificationModalProps) {
  const [selectedSpecies, setSelectedSpecies] = useState<string | null>(
    detectionResults[0]?.species || null
  )

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return 'text-green-400'
    if (confidence >= 0.6) return 'text-yellow-400'
    return 'text-red-400'
  }

  const getConfidenceLabel = (confidence: number) => {
    if (confidence >= 0.8) return 'Hoch'
    if (confidence >= 0.6) return 'Mittel'
    return 'Niedrig'
  }

  return (
    <div className="fixed inset-0 bg-black/90 z-[9999] flex items-center justify-center p-3 sm:p-4">
      <div className="bg-ocean/30 backdrop-blur-sm rounded-xl max-w-2xl w-full p-4 sm:p-6 max-h-[92vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-start gap-3 mb-5 sm:mb-6">
          <AlertCircle className="w-7 h-7 sm:w-8 sm:h-8 text-ocean-light mt-1" />
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-white">
              AI Fischerkennung
            </h2>
            <p className="text-ocean-light text-sm">
              Bestätige die erkannte Fischart für FishDex-Wertung
            </p>
          </div>
        </div>

        {/* Photo Preview */}
        <div className="relative w-full aspect-[4/3] sm:aspect-video rounded-lg overflow-hidden mb-5 sm:mb-6 bg-ocean-dark">
          <Image
            src={photoPreview}
            alt="Catch"
            fill
            className="object-cover"
          />
        </div>

        {/* Detection Results */}
        {detectionLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-12 h-12 text-ocean-light animate-spin" />
            <span className="ml-3 text-white">Analysiere Bild...</span>
          </div>
        ) : (
          <>
            <div className="space-y-3 mb-5 sm:mb-6">
              <h3 className="text-white font-semibold mb-3">
                Erkannte Arten (Top {detectionResults.length}):
              </h3>
              {detectionResults.map((result, index) => (
                <div
                  key={index}
                  onClick={() => setSelectedSpecies(result.species)}
                  className={`
                    p-3 sm:p-4 rounded-lg cursor-pointer transition-all
                    ${selectedSpecies === result.species
                      ? 'bg-ocean border-2 border-ocean-light'
                      : 'bg-ocean-dark/50 border-2 border-transparent hover:border-ocean-light/30'
                    }
                  `}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <span className="text-white font-semibold text-base sm:text-lg">
                          {result.species}
                        </span>
                        {selectedSpecies === result.species && (
                          <CheckCircle2 className="w-5 h-5 text-green-400" />
                        )}
                      </div>
                      {result.scientific_name && (
                        <p className="text-ocean-light text-sm italic">
                          {result.scientific_name}
                        </p>
                      )}
                    </div>
                    <div className="text-right">
                      <div className={`text-xl sm:text-2xl font-bold ${getConfidenceColor(result.accuracy)}`}>
                        {(result.accuracy * 100).toFixed(0)}%
                      </div>
                      <div className="text-ocean-light text-xs">
                        {getConfidenceLabel(result.accuracy)}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Warning for low confidence */}
            {selectedSpecies && detectionResults[0].accuracy < 0.7 && (
              <div className="bg-yellow-900/20 border border-yellow-600/30 rounded-lg p-4 mb-5 sm:mb-6">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
                  <div className="text-sm">
                    <p className="text-yellow-400 font-semibold mb-1">
                      Niedrige Konfidenz
                    </p>
                    <p className="text-ocean-light">
                      Die KI ist sich nicht sicher. Bitte überprüfe die Erkennung sorgfältig oder fahre manuell fort.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </>
        )}

        {/* Info Box */}
        <div className="bg-blue-900/20 border border-blue-600/30 rounded-lg p-4 mb-5 sm:mb-6">
          <h4 className="text-white font-semibold mb-2 flex items-center gap-2">
            <AlertCircle className="w-4 h-4" />
            Deine Optionen:
          </h4>
          <ul className="text-ocean-light text-sm space-y-1">
            <li>✅ <strong>Bestätigen:</strong> KI-Erkennung wird übernommen → FishDex Unlock</li>
            <li>📝 <strong>Manuell:</strong> Du wählst die Art selbst → Kein FishDex</li>
            <li>❌ <strong>Ablehnen:</strong> Fang wird verworfen (nicht gespeichert)</li>
          </ul>
          <p className="text-ocean-light text-xs mt-3 italic">
            Hinweis: Bei &quot;Bestätigen&quot; wird die Art gesperrt.
          </p>
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-3">
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={() => selectedSpecies && onConfirm(selectedSpecies)}
              disabled={!selectedSpecies || detectionLoading}
              className="flex-1 bg-green-900/30 hover:bg-green-900/50 text-green-400 font-semibold py-4 px-5 rounded-lg transition-colors disabled:opacity-50 flex flex-col items-center justify-center gap-2 group"
            >
              <CheckCircle2 className="w-8 h-8 group-hover:scale-110 transition-transform" />
              <span className="text-sm">Bestätigen</span>
              <span className="text-xs text-green-300/70">FishDex Unlock</span>
            </button>
            <button
              onClick={onManualOverride}
              className="flex-1 bg-yellow-900/30 hover:bg-yellow-900/50 text-yellow-400 font-semibold py-4 px-5 rounded-lg transition-colors flex flex-col items-center justify-center gap-2 group"
            >
              <AlertCircle className="w-8 h-8 group-hover:scale-110 transition-transform" />
              <span className="text-sm">Manuell</span>
              <span className="text-xs text-yellow-300/70">Kein FishDex</span>
            </button>
            <button
              onClick={onReject}
              className="flex-1 bg-red-900/30 hover:bg-red-900/50 text-red-400 font-semibold py-4 px-5 rounded-lg transition-colors flex flex-col items-center justify-center gap-2 group"
            >
              <XCircle className="w-8 h-8 group-hover:scale-110 transition-transform" />
              <span className="text-sm">Ablehnen</span>
              <span className="text-xs text-red-300/70">Verwerfen</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
