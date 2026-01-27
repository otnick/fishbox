'use client'

import { useCatchStore } from '@/lib/store'
import { format } from 'date-fns'
import { de } from 'date-fns/locale'

export default function CatchList() {
  const catches = useCatchStore((state) => state.catches)
  const deleteCatch = useCatchStore((state) => state.deleteCatch)

  if (catches.length === 0) {
    return (
      <div className="bg-ocean/30 backdrop-blur-sm rounded-lg p-12 text-center">
        <div className="text-6xl mb-4">🎣</div>
        <h3 className="text-2xl font-bold text-white mb-2">
          Noch keine Fänge
        </h3>
        <p className="text-ocean-light">
          Füge deinen ersten Fang hinzu und sieh ihn in 3D!
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold text-white mb-4">
        Meine Fänge ({catches.length})
      </h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {catches.map((catchData) => (
          <div
            key={catchData.id}
            className="bg-ocean/30 backdrop-blur-sm rounded-lg p-6 hover:bg-ocean/40 transition-colors"
          >
            {/* Header */}
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-xl font-bold text-white">
                  {catchData.species}
                </h3>
                <p className="text-ocean-light text-sm">
                  {format(new Date(catchData.date), 'dd. MMMM yyyy', { locale: de })}
                </p>
              </div>
              <button
                onClick={() => deleteCatch(catchData.id)}
                className="text-red-400 hover:text-red-300 transition-colors"
                title="Löschen"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z"
                    clipRule="evenodd"
                  />
                </svg>
              </button>
            </div>

            {/* Stats */}
            <div className="space-y-2 mb-4">
              <div className="flex justify-between text-sm">
                <span className="text-ocean-light">Länge:</span>
                <span className="text-white font-semibold">{catchData.length} cm</span>
              </div>
              
              {catchData.weight && (
                <div className="flex justify-between text-sm">
                  <span className="text-ocean-light">Gewicht:</span>
                  <span className="text-white font-semibold">
                    {catchData.weight > 1000
                      ? `${(catchData.weight / 1000).toFixed(2)} kg`
                      : `${catchData.weight} g`}
                  </span>
                </div>
              )}
              
              {catchData.location && (
                <div className="flex justify-between text-sm">
                  <span className="text-ocean-light">Ort:</span>
                  <span className="text-white font-semibold truncate ml-2">
                    {catchData.location}
                  </span>
                </div>
              )}
              
              {catchData.bait && (
                <div className="flex justify-between text-sm">
                  <span className="text-ocean-light">Köder:</span>
                  <span className="text-white font-semibold truncate ml-2">
                    {catchData.bait}
                  </span>
                </div>
              )}
            </div>

            {/* Notes */}
            {catchData.notes && (
              <div className="pt-4 border-t border-ocean-light/20">
                <p className="text-ocean-light text-sm italic">
                  &quot;{catchData.notes}&quot;
                </p>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
