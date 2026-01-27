'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import { supabase } from '@/lib/supabase'
import { format } from 'date-fns'
import { de } from 'date-fns/locale'
import Link from 'next/link'
import Map from '@/components/Map'

interface SharedCatch {
  id: string
  species: string
  length: number
  weight?: number
  date: string
  location?: string
  bait?: string
  notes?: string
  photo_url?: string
  coordinates?: { lat: number; lng: number }
  weather?: any
  user_email?: string
  likes_count: number
}

export default function SharePage({ params }: { params: { id: string } }) {
  const [catchData, setCatchData] = useState<SharedCatch | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    fetchCatch()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id])

  const fetchCatch = async () => {
    try {
      const { data, error } = await supabase
        .from('catches')
        .select('*')
        .eq('id', params.id)
        .eq('is_public', true)
        .single()

      if (error) throw error

      // Get user email
      const { data: { user } } = await supabase.auth.admin.getUserById(data.user_id)

      setCatchData({
        ...data,
        user_email: user?.email,
      })
    } catch (err) {
      console.error('Error fetching catch:', err)
      setError(true)
    } finally {
      setLoading(false)
    }
  }

  const handleShare = async () => {
    if (!catchData) return

    const shareData = {
      title: `${catchData.species} - ${catchData.length} cm`,
      text: `Schau dir diesen ${catchData.species}-Fang auf FishBox an!`,
      url: window.location.href,
    }

    if (navigator.share) {
      try {
        await navigator.share(shareData)
      } catch (err) {
        // User cancelled
      }
    } else {
      // Fallback: Copy to clipboard
      await navigator.clipboard.writeText(window.location.href)
      alert('Link in Zwischenablage kopiert!')
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-ocean-deeper to-ocean-dark flex items-center justify-center">
        <div className="text-white text-2xl">Laden...</div>
      </div>
    )
  }

  if (error || !catchData) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-ocean-deeper to-ocean-dark flex items-center justify-center p-4">
        <div className="bg-ocean/30 backdrop-blur-sm rounded-xl p-12 text-center max-w-md">
          <div className="text-6xl mb-4">🎣</div>
          <h1 className="text-2xl font-bold text-white mb-4">Fang nicht gefunden</h1>
          <p className="text-ocean-light mb-6">
            Dieser Fang existiert nicht oder ist nicht öffentlich geteilt.
          </p>
          <Link
            href="/"
            className="inline-block bg-ocean hover:bg-ocean-light text-white font-semibold py-3 px-8 rounded-lg transition-colors"
          >
            Zur Startseite
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-ocean-deeper to-ocean-dark">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="text-5xl mb-4">🎣</div>
          <h1 className="text-3xl font-bold text-white mb-2">FishBox</h1>
          <p className="text-ocean-light">Geteilter Fang von {catchData.user_email?.split('@')[0]}</p>
        </div>

        {/* Catch Card */}
        <div className="bg-ocean/30 backdrop-blur-sm rounded-xl overflow-hidden mb-6">
          {/* Photo */}
          {catchData.photo_url && (
            <div className="relative w-full h-96">
              <Image
                src={catchData.photo_url}
                alt={catchData.species}
                fill
                className="object-cover"
              />
            </div>
          )}

          {/* Content */}
          <div className="p-8">
            <div className="flex items-start justify-between mb-6">
              <div>
                <h2 className="text-3xl font-bold text-white mb-2">{catchData.species}</h2>
                <p className="text-ocean-light">
                  {format(new Date(catchData.date), 'dd. MMMM yyyy', { locale: de })}
                </p>
              </div>
              <div className="flex items-center gap-2 text-ocean-light">
                <span>❤️</span>
                <span>{catchData.likes_count || 0}</span>
              </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="bg-ocean-dark/50 rounded-lg p-4">
                <div className="text-ocean-light text-sm">Länge</div>
                <div className="text-2xl font-bold text-white">{catchData.length} cm</div>
              </div>

              {catchData.weight && (
                <div className="bg-ocean-dark/50 rounded-lg p-4">
                  <div className="text-ocean-light text-sm">Gewicht</div>
                  <div className="text-2xl font-bold text-white">
                    {catchData.weight > 1000
                      ? `${(catchData.weight / 1000).toFixed(2)} kg`
                      : `${catchData.weight} g`}
                  </div>
                </div>
              )}

              {catchData.weather && (
                <div className="bg-ocean-dark/50 rounded-lg p-4">
                  <div className="text-ocean-light text-sm">Wetter</div>
                  <div className="text-xl font-bold text-white">
                    {catchData.weather.icon} {catchData.weather.temperature}°C
                  </div>
                </div>
              )}

              {catchData.bait && (
                <div className="bg-ocean-dark/50 rounded-lg p-4">
                  <div className="text-ocean-light text-sm">Köder</div>
                  <div className="text-lg font-bold text-white truncate">{catchData.bait}</div>
                </div>
              )}
            </div>

            {/* Notes */}
            {catchData.notes && (
              <div className="mb-6 p-4 bg-ocean-dark/50 rounded-lg">
                <p className="text-white italic">&quot;{catchData.notes}&quot;</p>
              </div>
            )}

            {/* Map */}
            {catchData.coordinates && (
              <div className="mb-6">
                <Map
                  coordinates={catchData.coordinates}
                  location={catchData.location}
                  height="300px"
                />
              </div>
            )}

            {/* Share Button */}
            <button
              onClick={handleShare}
              className="w-full bg-ocean hover:bg-ocean-light text-white font-bold py-4 px-8 rounded-lg transition-colors mb-4"
            >
              🔗 Teilen
            </button>

            {/* CTA */}
            <div className="text-center pt-6 border-t border-ocean-light/20">
              <p className="text-ocean-light mb-4">
                Tracke auch du deine Fänge mit FishBox!
              </p>
              <Link
                href="/"
                className="inline-block bg-ocean-dark hover:bg-ocean text-white font-semibold py-3 px-8 rounded-lg transition-colors"
              >
                Jetzt starten
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
