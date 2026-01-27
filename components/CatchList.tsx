'use client'

import { useState, lazy, Suspense } from 'react'
import Image from 'next/image'
import { useCatchStore, type Catch } from '@/lib/store'
import { format } from 'date-fns'
import { de } from 'date-fns/locale'
import Comments from './Comments'

// Lazy load Map component (only when needed)
const Map = lazy(() => import('./Map'))

interface CatchListProps {
  catches?: Catch[]
}

export default function CatchList({ catches: propCatches }: CatchListProps = {}) {
  const storeCatches = useCatchStore((state) => state.catches)
  const catches = propCatches || storeCatches
  const deleteCatch = useCatchStore((state) => state.deleteCatch)
  const [lightboxPhoto, setLightboxPhoto] = useState<string | null>(null)
  const [expandedMapId, setExpandedMapId] = useState<string | null>(null)
  const [expandedCommentsId, setExpandedCommentsId] = useState<string | null>(null)

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

  const handleDelete = async (id: string) => {
    if (confirm('Möchtest du diesen Fang wirklich löschen?')) {
      await deleteCatch(id)
    }
  }

  return (
    <>
      <div className="space-y-4">
        <h2 className="text-2xl font-bold text-white mb-4">
          Meine Fänge ({catches.length})
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {catches.map((catchData) => (
            <div
              key={catchData.id}
              className="bg-ocean/30 backdrop-blur-sm rounded-lg overflow-hidden hover:bg-ocean/40 transition-colors"
            >
              {/* Photo */}
              {catchData.photo && (
                <div className="relative h-48 bg-ocean-dark">
                  <Image
                    src={catchData.photo}
                    alt={catchData.species}
                    fill
                    className="object-cover cursor-pointer hover:opacity-90 transition-opacity"
                    onClick={() => setLightboxPhoto(catchData.photo!)}
                  />
                  <div className="absolute top-2 right-2 bg-ocean-dark/80 px-2 py-1 rounded text-xs text-white">
                    📸 Klicken zum Vergrößern
                  </div>
                </div>
              )}

              <div className="p-6">
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
                  <div className="flex items-center gap-2">
                    {/* Public/Private Toggle */}
                    <button
                      onClick={async () => {
                        const newPublicState = !catchData.is_public
                        await useCatchStore.getState().updateCatch(catchData.id, { 
                          is_public: newPublicState 
                        })
                      }}
                      className={`px-3 py-1 rounded-full text-xs font-semibold transition-colors ${
                        catchData.is_public
                          ? 'bg-green-500/20 text-green-400 hover:bg-green-500/30'
                          : 'bg-gray-500/20 text-gray-400 hover:bg-gray-500/30'
                      }`}
                      title={catchData.is_public ? 'Öffentlich - Klicken um privat zu machen' : 'Privat - Klicken um zu teilen'}
                    >
                      {catchData.is_public ? '🌍 Öffentlich' : '🔒 Privat'}
                    </button>
                    <button
                      onClick={() => handleDelete(catchData.id)}
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

                  {/* Weather */}
                  {catchData.weather && (
                    <div className="flex justify-between text-sm">
                      <span className="text-ocean-light">Wetter:</span>
                      <span className="text-white font-semibold">
                        {catchData.weather.icon} {catchData.weather.temperature}°C
                      </span>
                    </div>
                  )}
                </div>

                {/* GPS Map */}
                {catchData.coordinates && (
                  <div className="mb-4">
                    {expandedMapId === catchData.id ? (
                      <Suspense fallback={<div className="text-ocean-light text-sm">Karte lädt...</div>}>
                        <div className="space-y-2">
                          <Map
                            coordinates={catchData.coordinates}
                            location={catchData.location}
                            height="200px"
                          />
                          <button
                            onClick={() => setExpandedMapId(null)}
                            className="text-ocean-light text-sm hover:text-white"
                          >
                            Karte ausblenden
                          </button>
                        </div>
                      </Suspense>
                    ) : (
                      <button
                        onClick={() => setExpandedMapId(catchData.id)}
                        className="w-full px-3 py-2 bg-ocean-dark/50 rounded text-ocean-light hover:bg-ocean-dark hover:text-white transition-colors text-sm"
                      >
                        📍 Karte anzeigen
                      </button>
                    )}
                  </div>
                )}

                {/* Comments Section */}
                <div className="mb-4">
                  {expandedCommentsId === catchData.id ? (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between mb-2">
                        <div className="text-white font-semibold text-sm">
                          💬 Kommentare ({catchData.comments_count || 0})
                        </div>
                        <button
                          onClick={() => setExpandedCommentsId(null)}
                          className="text-ocean-light text-xs hover:text-white"
                        >
                          Ausblenden
                        </button>
                      </div>
                      <Suspense fallback={<div className="text-ocean-light text-sm">Laden...</div>}>
                        <Comments catchId={catchData.id} />
                      </Suspense>
                    </div>
                  ) : (
                    <button
                      onClick={() => setExpandedCommentsId(catchData.id)}
                      className="w-full px-3 py-2 bg-ocean-dark/50 rounded text-ocean-light hover:bg-ocean-dark hover:text-white transition-colors text-sm"
                    >
                      💬 Kommentare anzeigen ({catchData.comments_count || 0})
                    </button>
                  )}
                </div>

                {/* Share Button */}
                {catchData.is_public && (
                  <div className="mb-4">
                    <button
                      onClick={async () => {
                        const shareUrl = `${window.location.origin}/catch/${catchData.id}`
                        if (navigator.share) {
                          try {
                            await navigator.share({
                              title: `${catchData.species} - ${catchData.length} cm`,
                              text: `Schau dir diesen ${catchData.species}-Fang an!`,
                              url: shareUrl,
                            })
                          } catch (err) {
                            // User cancelled
                          }
                        } else {
                          await navigator.clipboard.writeText(shareUrl)
                          alert('Link in Zwischenablage kopiert!')
                        }
                      }}
                      className="w-full px-3 py-2 bg-ocean-dark/50 rounded text-ocean-light hover:bg-ocean-dark hover:text-white transition-colors text-sm"
                    >
                      🔗 Fang teilen
                    </button>
                  </div>
                )}

                {/* Notes */}
                {catchData.notes && (
                  <div className="pt-4 border-t border-ocean-light/20">
                    <p className="text-ocean-light text-sm italic">
                      &quot;{catchData.notes}&quot;
                    </p>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Photo Lightbox */}
      {lightboxPhoto && (
        <div
          className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4"
          onClick={() => setLightboxPhoto(null)}
        >
          <div className="relative w-full max-w-4xl h-[90vh]">
            <Image
              src={lightboxPhoto}
              alt="Vergrößertes Foto"
              fill
              className="object-contain"
            />
            <button
              onClick={() => setLightboxPhoto(null)}
              className="absolute top-4 right-4 bg-white/20 hover:bg-white/30 text-white p-2 rounded-full transition-colors"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-6 w-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}
    </>
  )
}
