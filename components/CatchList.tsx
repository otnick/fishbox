'use client'

import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useCatchStore, type Catch } from '@/lib/store'
import { supabase } from '@/lib/supabase'
import { format } from 'date-fns'
import { de } from 'date-fns/locale'
import { Eye, Trash2, MapPin, Calendar, Ruler } from 'lucide-react'
import dynamic from 'next/dynamic'

const Map = dynamic(() => import('./Map'), { ssr: false })

interface CatchListProps {
  catches?: Catch[]
}

export default function CatchList({ catches: propCatches }: CatchListProps = {}) {
  const storeCatches = useCatchStore((state) => state.catches)
  const catches = propCatches || storeCatches
  const deleteCatch = useCatchStore((state) => state.deleteCatch)
  const [expandedMapId, setExpandedMapId] = useState<string | null>(null)

  if (catches.length === 0) {
    return (
      <div className="bg-ocean/30 backdrop-blur-sm rounded-lg p-12 text-center">
        <div className="text-6xl mb-4">🎣</div>
        <h3 className="text-2xl font-bold text-white mb-2">
          Noch keine Fänge
        </h3>
        <p className="text-ocean-light">
          Füge deinen ersten Fang hinzu!
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
    <div className="space-y-4">
      <h2 className="text-2xl font-bold text-white mb-4">
        Meine Fänge ({catches.length})
      </h2>

      {/* Grid Layout - Like Social Page */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {catches.map((catchItem) => (
          <div
            key={catchItem.id}
            className="bg-ocean/30 backdrop-blur-sm rounded-xl overflow-hidden hover:shadow-xl transition-all duration-300"
          >
            {/* Photo - Like Social Page */}
            <Link href={`/catch/${catchItem.id}`}>
              <div className="relative h-48 bg-ocean-dark cursor-pointer group">
                {catchItem.photo ? (
                  <>
                    <Image
                      src={catchItem.photo}
                      alt={catchItem.species}
                      fill
                      sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                      className="object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    
                    {/* Verification Status Badge - Icon only with tooltip */}
                    {catchItem.verification_status === 'verified' && (
                      <div className="absolute top-2 left-2 bg-green-500/90 backdrop-blur-sm text-white p-2 rounded-full group cursor-help shadow-lg">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        {/* Tooltip */}
                        <div className="absolute left-full ml-2 top-1/2 -translate-y-1/2 bg-black/90 text-white text-xs px-3 py-1.5 rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                          ✅ KI-verifiziert
                        </div>
                      </div>
                    )}
                    {catchItem.verification_status === 'manual' && (
                      <div className="absolute top-2 left-2 bg-yellow-500/90 backdrop-blur-sm text-white p-2 rounded-full group cursor-help shadow-lg">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                        </svg>
                        {/* Tooltip */}
                        <div className="absolute left-full ml-2 top-1/2 -translate-y-1/2 bg-black/90 text-white text-xs px-3 py-1.5 rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                          ✋ Manuell
                        </div>
                      </div>
                    )}
                    
                    {/* Hover Overlay */}
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center">
                      <Eye className="w-12 h-12 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  </>
                ) : (
                  <div className="h-full flex items-center justify-center">
                    <span className="text-6xl opacity-50">🎣</span>
                  </div>
                )}
              </div>
            </Link>

            {/* Content */}
            <div className="p-4">
              <Link href={`/catch/${catchItem.id}`}>
                <h3 className="text-xl font-bold text-white mb-3 hover:text-ocean-light transition-colors cursor-pointer">
                  {catchItem.species}
                </h3>
              </Link>

              {/* Stats Grid */}
              <div className="grid grid-cols-2 gap-3 mb-3">
                <div className="bg-ocean-dark/50 rounded p-2">
                  <div className="text-ocean-light text-xs flex items-center gap-1">
                    <Ruler className="w-3 h-3" />
                    Länge
                  </div>
                  <div className="text-white font-semibold">{catchItem.length} cm</div>
                </div>

                {catchItem.weight && (
                  <div className="bg-ocean-dark/50 rounded p-2">
                    <div className="text-ocean-light text-xs">Gewicht</div>
                    <div className="text-white font-semibold">
                      {catchItem.weight > 1000
                        ? `${(catchItem.weight / 1000).toFixed(2)} kg`
                        : `${catchItem.weight} g`}
                    </div>
                  </div>
                )}
              </div>

              {/* Date */}
              <div className="flex items-center gap-2 text-xs text-ocean-light mb-3">
                <Calendar className="w-3 h-3" />
                <span>
                  {format(new Date(catchItem.date), 'dd.MM.yyyy HH:mm', { locale: de })}
                </span>
              </div>

              {/* Location */}
              {catchItem.location && (
                <div className="flex items-center gap-2 text-xs text-ocean-light mb-3">
                  <MapPin className="w-3 h-3" />
                  <span className="truncate">{catchItem.location}</span>
                </div>
              )}

              {/* Actions - Mobile Optimized */}
              <div className="flex gap-2 pt-3 border-t border-ocean-light/20">
                <Link href={`/catch/${catchItem.id}`} className="flex-1">
                  <button className="w-full px-3 py-2 bg-ocean hover:bg-ocean-light text-white rounded-lg transition-colors text-sm flex items-center justify-center gap-2">
                    <Eye className="w-4 h-4" />
                    <span className="hidden sm:inline">Details</span>
                  </button>
                </Link>

                {/* Public Toggle Button */}
                <button
                  onClick={() => {
                    const newPublicState = !catchItem.is_public
                    supabase
                      .from('catches')
                      .update({ is_public: newPublicState })
                      .eq('id', catchItem.id)
                      .then(() => {
                        // Refresh catches
                        window.location.reload()
                      })
                  }}
                  className={`px-3 py-2 rounded-lg transition-colors group relative ${
                    catchItem.is_public
                      ? 'bg-green-900/30 hover:bg-green-900/50 text-green-400'
                      : 'bg-ocean-dark hover:bg-ocean text-ocean-light'
                  }`}
                  aria-label={catchItem.is_public ? 'Öffentlich' : 'Privat'}
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    {catchItem.is_public ? (
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    ) : (
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                    )}
                  </svg>
                  {/* Tooltip */}
                  <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-black/90 text-white text-xs px-2 py-1 rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                    {catchItem.is_public ? 'Öffentlich' : 'Privat'}
                  </div>
                </button>

                {catchItem.coordinates && (
                  <button
                    onClick={() => setExpandedMapId(
                      expandedMapId === catchItem.id ? null : catchItem.id
                    )}
                    className="px-3 py-2 bg-ocean-dark hover:bg-ocean text-white rounded-lg transition-colors"
                    aria-label="Karte anzeigen"
                  >
                    <MapPin className="w-4 h-4" />
                  </button>
                )}

                <button
                  onClick={() => handleDelete(catchItem.id)}
                  className="px-3 py-2 bg-red-900/30 hover:bg-red-900/50 text-red-400 rounded-lg transition-colors"
                  aria-label="Löschen"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Expanded Map */}
            {expandedMapId === catchItem.id && catchItem.coordinates && (
              <div className="border-t border-ocean-light/20 p-4">
                <div className="h-48 rounded-lg overflow-hidden">
                  <Map
                    coordinates={catchItem.coordinates}
                    location={catchItem.location}
                  />
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}