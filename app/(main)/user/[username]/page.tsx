'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { useCatchStore } from '@/lib/store'
import { format } from 'date-fns'
import { de } from 'date-fns/locale'
import { User, Calendar, Fish, Award, Heart, MessageCircle, ArrowLeft, Edit } from 'lucide-react'
import VerificationBadge from '@/components/VerificationBadge'
import LoadingSkeleton from '@/components/LoadingSkeleton'
import EmptyState from '@/components/EmptyState'
import { getSpeciesRarity } from '@/lib/utils/speciesInfo'

interface UserProfile {
  id: string
  username: string
  bio?: string
  created_at: string
}

interface PublicCatch {
  id: string
  species: string
  length: number
  weight?: number
  photo_url?: string
  date: string
  likes_count: number
  comments_count: number
  verification_status?: 'pending' | 'verified' | 'rejected' | 'manual'
  ai_verified?: boolean
}

export default function UserProfilePage({ params }: { params: { username: string } }) {
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [catches, setCatches] = useState<PublicCatch[]>([])
  const [fishdexEntries, setFishdexEntries] = useState<any[]>([])
  const [activeTab, setActiveTab] = useState<'gallery' | 'fishdex'>('gallery')
  const [showPublicOnly, setShowPublicOnly] = useState(true)
  const [stats, setStats] = useState({
    totalCatches: 0,
    uniqueSpecies: 0,
    biggestCatch: 0,
    totalWeight: 0,
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const currentUser = useCatchStore((state) => state.user)

  useEffect(() => {
    fetchProfile()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.username, showPublicOnly, currentUser?.id])

  const fetchProfile = async () => {
    try {
      // Get profile by username
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('username', params.username)
        .single()

      if (profileError) throw profileError

      setProfile(profileData)

      const isOwnProfile = currentUser?.id === profileData.id
      const publicOnly = !isOwnProfile || showPublicOnly

      // Get catches
      let catchesQuery = supabase
        .from('catches')
        .select('*')
        .eq('user_id', profileData.id)
        .order('date', { ascending: false })

      if (publicOnly) {
        catchesQuery = catchesQuery.eq('is_public', true)
      }

      const { data: catchesData, error: catchesError } = await catchesQuery

      if (catchesError) throw catchesError

      setCatches(catchesData)

      // Calculate stats
      const uniqueSpecies = new Set(catchesData.map(c => c.species)).size
      const biggestCatch = Math.max(...catchesData.map(c => c.length), 0)
      const totalWeight = catchesData.reduce((sum, c) => sum + (c.weight || 0), 0)

      setStats({
        totalCatches: catchesData.length,
        uniqueSpecies,
        biggestCatch,
        totalWeight,
      })

      // Get user's FishDex (discovered species)
      const { data: fishdexData } = await supabase
        .from('user_fishdex')
        .select(`
          *,
          species:fish_species(*)
        `)
        .eq('user_id', profileData.id)
        .order('discovered_at', { ascending: false })

      if (fishdexData) {
        let catchesQuery = supabase
          .from('catches')
          .select('species, verification_status, ai_verified, photo_url, length, is_public')
          .eq('user_id', profileData.id)
          .or('verification_status.eq.verified,ai_verified.eq.true')

        if (publicOnly) {
          catchesQuery = catchesQuery.eq('is_public', true)
        }

        const { data: allCatches } = await catchesQuery

        const statsMap = new Map<
          string,
          {
            bestPhoto?: string | null
            bestLength: number
          }
        >()

        ;(allCatches || []).forEach((c) => {
          const name = (c.species || '').toLowerCase()
          if (!name) return

          const length = c.length || 0
          const stats = statsMap.get(name) || {
            bestPhoto: null,
            bestLength: 0,
          }

          if (c.photo_url && length >= stats.bestLength) {
            stats.bestLength = length
            stats.bestPhoto = c.photo_url
          }

          statsMap.set(name, stats)
        })

        const progressWithPhotos = fishdexData.map((entry: any) => {
          const speciesName = entry.species?.name || ''
          const stats = statsMap.get(speciesName.toLowerCase())

          return {
            ...entry,
            photo_url: stats?.bestPhoto || null,
            verified: true,
          }
        })

        setFishdexEntries(progressWithPhotos)
      }
    } catch (err) {
      console.error('Error fetching profile:', err)
      setError(true)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <LoadingSkeleton type="card" />
        <LoadingSkeleton type="grid" />
      </div>
    )
  }

  if (error || !profile) {
    return (
      <div className="space-y-6">
        <EmptyState
          icon={User}
          title="Benutzer nicht gefunden"
          description={`@${params.username} existiert nicht oder ist privat.`}
          actionLabel="Zurück zum Feed"
          actionHref="/social"
        />
      </div>
    )
  }

  const isOwnProfile = currentUser?.id === profile.id

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Link
          href="/social"
          className="flex items-center gap-2 text-ocean-light hover:text-white transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
          Zurück
        </Link>
        {isOwnProfile && (
          <Link
            href="/profile"
            className="flex items-center gap-2 text-ocean-light hover:text-white text-sm transition-colors"
          >
            <Edit className="w-4 h-4" />
            Profil bearbeiten
          </Link>
        )}
      </div>

      {/* Profile Card */}
      <div className="bg-gradient-to-br from-ocean/40 to-ocean-dark/40 backdrop-blur-sm rounded-xl p-8 border border-ocean-light/10 shadow-xl">
        <div className="flex items-start gap-6">
          {/* Avatar */}
          <div className="w-24 h-24 rounded-full bg-gradient-to-br from-ocean-light to-ocean flex items-center justify-center text-5xl flex-shrink-0 shadow-lg">
            <Fish className="w-12 h-12 text-white" />
          </div>

          {/* Info */}
          <div className="flex-1">
            <h1 className="text-3xl font-bold text-white mb-2">
              @{profile.username}
            </h1>
            {profile.bio && (
              <p className="text-ocean-light mb-4">{profile.bio}</p>
            )}
            <div className="flex items-center gap-2 text-ocean-light text-sm">
              <Calendar className="w-4 h-4" />
              Mitglied seit {format(new Date(profile.created_at), 'MMMM yyyy', { locale: de })}
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6 pt-6 border-t border-ocean-light/20">
          <div className="bg-ocean/30 rounded-lg p-4">
            <div className="flex items-center gap-2 text-ocean-light text-sm mb-1">
              <Fish className="w-4 h-4" />
              Fänge
            </div>
            <div className="text-2xl font-bold text-white">{stats.totalCatches}</div>
          </div>
          <div className="bg-ocean/30 rounded-lg p-4">
            <div className="flex items-center gap-2 text-ocean-light text-sm mb-1">
              <Award className="w-4 h-4" />
              Arten
            </div>
            <div className="text-2xl font-bold text-white">{stats.uniqueSpecies}</div>
          </div>
          <div className="bg-ocean/30 rounded-lg p-4">
            <div className="text-ocean-light text-sm mb-1">Größter</div>
            <div className="text-2xl font-bold text-white">{stats.biggestCatch} cm</div>
          </div>
          <div className="bg-ocean/30 rounded-lg p-4">
            <div className="text-ocean-light text-sm mb-1">Gewicht</div>
            <div className="text-2xl font-bold text-white">
              {(stats.totalWeight / 1000).toFixed(1)} kg
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-ocean/30 backdrop-blur-sm rounded-xl p-2">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          {isOwnProfile && (
            <div className="flex items-center justify-between rounded-lg bg-ocean-dark/40 px-4 py-3 sm:order-2 sm:w-[260px]">
              <div>
                <div className="text-white font-semibold text-sm">Nur öffentlich</div>
                <div className="text-ocean-light text-xs">Privates ausblenden</div>
              </div>
              <label className="inline-flex cursor-pointer items-center gap-3">
                <span className="sr-only">Öffentliche Fänge umschalten</span>
                <input
                  type="checkbox"
                  className="sr-only"
                  checked={showPublicOnly}
                  onChange={() => setShowPublicOnly(prev => !prev)}
                />
                <span
                  className={`relative inline-flex h-6 w-11 items-center rounded-full border transition-colors shadow-inner ${
                    showPublicOnly
                      ? 'bg-green-500/90 border-green-400/60'
                      : 'bg-gray-700 border-gray-500/60'
                  }`}
                >
                  <span
                    className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${
                      showPublicOnly ? 'translate-x-5' : 'translate-x-1'
                    }`}
                  />
                </span>
              </label>
            </div>
          )}

          <div className="flex gap-2 sm:flex-1">
            <button
              onClick={() => setActiveTab('gallery')}
              className={`flex-1 py-3 px-4 rounded-lg font-semibold transition-colors ${
                activeTab === 'gallery'
                  ? 'bg-ocean text-white'
                  : 'text-ocean-light hover:text-white'
              }`}
            >
              <div className="flex items-center justify-center gap-2">
                <Fish className="w-5 h-5" />
                Galerie ({catches.length})
              </div>
            </button>
            <button
              onClick={() => setActiveTab('fishdex')}
              className={`flex-1 py-3 px-4 rounded-lg font-semibold transition-colors ${
                activeTab === 'fishdex'
                  ? 'bg-ocean text-white'
                  : 'text-ocean-light hover:text-white'
              }`}
            >
              <div className="flex items-center justify-center gap-2">
                <Award className="w-5 h-5" />
                FishDex ({fishdexEntries.length})
              </div>
            </button>
          </div>
        </div>
      </div>

      {/* Gallery Tab */}
      {activeTab === 'gallery' && (
        <div>
          {catches.length === 0 ? (
            <EmptyState
              icon={Fish}
              title={
                isOwnProfile
                  ? showPublicOnly
                    ? 'Keine öffentlichen Fänge'
                    : 'Keine Fänge'
                  : 'Noch keine öffentlichen Fänge'
              }
              description={
                isOwnProfile
                  ? showPublicOnly
                    ? 'Mache deine Fänge öffentlich, um sie hier zu zeigen.'
                    : 'Du hast noch keine Fänge gespeichert.'
                  : 'Dieser Angler hat noch keine öffentlichen Fänge geteilt.'
              }
              actionLabel={isOwnProfile ? 'Zu meinen Fängen' : undefined}
              actionHref={isOwnProfile ? '/catches' : undefined}
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {catches.map((catchData) => (
                <Link key={catchData.id} href={`/catch/${catchData.id}`}>
                  <div className="bg-ocean/30 backdrop-blur-sm rounded-xl overflow-hidden hover:bg-ocean/40 transition-all duration-300 cursor-pointer hover:shadow-xl hover:scale-105 animate-slide-up">
                    {catchData.photo_url ? (
                      <div className="relative h-48 bg-ocean-dark">
                        <Image
                          src={catchData.photo_url}
                          alt={catchData.species}
                          fill
                          className="object-cover"
                        />
                        <VerificationBadge
                          status={catchData.verification_status}
                          aiVerified={catchData.ai_verified}
                          className="absolute top-2 left-2"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-ocean-deeper/60 to-transparent opacity-0 hover:opacity-100 transition-opacity" />
                      </div>
                    ) : (
                      <div className="h-48 bg-gradient-to-br from-ocean-light/20 to-ocean-dark/20 flex items-center justify-center">
                        <Fish className="w-12 h-12 text-ocean-light/50" />
                      </div>
                    )}

                    <div className="p-4">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-lg font-bold text-white">
                        {catchData.species}
                        </h3>
                        {!catchData.photo_url && (
                          <VerificationBadge
                            status={catchData.verification_status}
                            aiVerified={catchData.ai_verified}
                            className="ml-1"
                          />
                        )}
                      </div>
                      <div className="text-ocean-light text-sm mb-3">
                        {catchData.length} cm
                        {catchData.weight && ` • ${catchData.weight > 1000 
                          ? `${(catchData.weight / 1000).toFixed(2)} kg`
                          : `${catchData.weight} g`
                        }`}
                      </div>
                      <div className="flex items-center gap-4 text-sm text-ocean-light">
                        <span className="flex items-center gap-1">
                          <Heart className="w-4 h-4" />
                          {catchData.likes_count || 0}
                        </span>
                        <span className="flex items-center gap-1">
                          <MessageCircle className="w-4 h-4" />
                          {catchData.comments_count || 0}
                        </span>
                        <span className="ml-auto">
                          {format(new Date(catchData.date), 'dd.MM.yyyy')}
                        </span>
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      )}

      {/* FishDex Tab */}
      {activeTab === 'fishdex' && (
        <div>
          {fishdexEntries.length === 0 ? (
            <EmptyState
              icon={Award}
              title="Noch keine Arten entdeckt"
              description="Fange verifizierte Fische, um sie im FishDex freizuschalten."
            />
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
              {fishdexEntries.map((entry) => (
                <Link
                  key={entry.id}
                  href={entry.species?.id ? `/fishdex/${entry.species.id}` : '#'}
                  className={`bg-ocean/30 backdrop-blur-sm rounded-xl p-3 hover:bg-ocean/40 transition-all duration-300 hover:scale-105 ${
                    entry.species?.id ? '' : 'pointer-events-none'
                  }`}
                >
                  <div className="aspect-square bg-ocean-dark rounded-lg mb-2 flex items-center justify-center relative overflow-hidden">
                    {entry.photo_url || entry.species?.image_url ? (
                      <Image
                        src={entry.photo_url || entry.species.image_url}
                        alt={entry.species.name}
                        fill
                        className="object-cover"
                      />
                    ) : (
                      <Fish className="w-12 h-12 text-ocean-light/50" />
                    )}
                  </div>
                  <div className="text-center">
                    <h3 className="text-white font-semibold text-sm mb-1">
                      {entry.species?.name || 'Unbekannt'}
                    </h3>
                    <div className="text-ocean-light text-xs">
                      {entry.total_caught}x gefangen
                    </div>
                    <div className="text-ocean-light text-xs">
                      Größte: {entry.biggest_length}cm
                    </div>
                    {/* Rarity Stars */}
                    {entry.species?.rarity && (
                      <div className="mt-1 text-xs">
                        {'⭐'.repeat(
                          getSpeciesRarity({
                            scientificName: entry.species?.scientific_name,
                            germanName: entry.species?.name,
                            fallback: entry.species?.rarity,
                          })
                        )}
                      </div>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
