'use client'

import { useCallback, useEffect, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import dynamic from 'next/dynamic'
import { supabase } from '@/lib/supabase'
import { useCatchStore } from '@/lib/store'
import { format } from 'date-fns'
import { de } from 'date-fns/locale'
import {
  Heart,
  MessageCircle,
  MapPin,
  Calendar,
  Ruler,
  Scale,
  Fish as FishIcon,
  ArrowLeft,
  CloudSun,
  Thermometer,
  Wind,
  Gauge,
  Droplets,
  Star,
} from 'lucide-react'
import VerificationBadge from '@/components/VerificationBadge'
import { useToast } from '@/components/ToastProvider'

const Map = dynamic(() => import('@/components/Map'), { ssr: false })
const Comments = dynamic(() => import('@/components/Comments'), { ssr: false })

interface CatchDetail {
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
  user_id: string
  username: string
  is_public: boolean
  is_shiny?: boolean
  shiny_reason?: string | null
  verification_status?: 'pending' | 'verified' | 'rejected' | 'manual'
  ai_verified?: boolean
  likes_count: number
  comments_count: number
  user_has_liked: boolean
}

function getWeatherSourceLabel(source?: 'historical' | 'forecast' | 'current'): string {
  if (source === 'historical') return 'Archivwetter (Fotozeit)'
  if (source === 'current') return 'Aktuelles Wetter'
  return 'Prognose (Zeitpunkt)'
}

function getWeatherSourceClass(source?: 'historical' | 'forecast' | 'current'): string {
  if (source === 'historical') return 'text-amber-300'
  if (source === 'current') return 'text-emerald-300'
  return 'text-sky-300'
}

export default function CatchDetailClient({ id }: { id: string }) {
  const [catchData, setCatchData] = useState<CatchDetail | null>(null)
  const [pinnedCatchIds, setPinnedCatchIds] = useState<string[]>([])
  const [pinSaving, setPinSaving] = useState(false)
  const [shinyRank, setShinyRank] = useState<{ total: number; above: number } | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const user = useCatchStore((state) => state.user)
  const { toast } = useToast()

  const fetchCatch = useCallback(async () => {
    if (!user) return

    try {
      const { data: catchRow, error } = await supabase
        .from('catches')
        .select('*')
        .eq('id', id)
        .single()

      if (error) throw error
      if (!catchRow) {
        setError(true)
        return
      }

      if (catchRow.user_id !== user.id && !catchRow.is_public) {
        setError(true)
        return
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('username, pinned_catch_ids')
        .eq('id', catchRow.user_id)
        .single()

      const { count: likesCount } = await supabase
        .from('catch_likes')
        .select('*', { count: 'exact', head: true })
        .eq('catch_id', id)

      const { data: userLike } = await supabase
        .from('catch_likes')
        .select('id')
        .eq('catch_id', id)
        .eq('user_id', user.id)
        .single()

      const { count: commentsCount } = await supabase
        .from('catch_comments')
        .select('*', { count: 'exact', head: true })
        .eq('catch_id', id)

      setCatchData({
        ...catchRow,
        username: profile?.username || 'angler',
        likes_count: likesCount || 0,
        comments_count: commentsCount || 0,
        user_has_liked: !!userLike,
      })

      if (catchRow.user_id === user.id) {
        setPinnedCatchIds((profile?.pinned_catch_ids || []).slice(0, 6))
      }

      if (catchRow.is_shiny) {
        const { data: rankData } = await supabase
          .rpc('get_species_length_rank', {
            species_name: catchRow.species,
            length_value: catchRow.length,
          })
        const row = Array.isArray(rankData) ? rankData[0] : null
        if (row?.total_count) {
          setShinyRank({
            total: Number(row.total_count),
            above: Number(row.above_or_equal_count || 0),
          })
        }
      }
    } catch (error) {
      console.error('Error fetching catch:', error)
      setError(true)
    } finally {
      setLoading(false)
    }
  }, [id, user])

  useEffect(() => {
    if (user) {
      fetchCatch()
    }
  }, [fetchCatch, user])

  const toggleLike = async () => {
    if (!user || !catchData) return

    try {
      if (catchData.user_has_liked) {
        await supabase
          .from('catch_likes')
          .delete()
          .eq('catch_id', id)
          .eq('user_id', user.id)

        setCatchData({
          ...catchData,
          likes_count: catchData.likes_count - 1,
          user_has_liked: false,
        })
      } else {
        await supabase
          .from('catch_likes')
          .insert({
            catch_id: id,
            user_id: user.id,
          })

        setCatchData({
          ...catchData,
          likes_count: catchData.likes_count + 1,
          user_has_liked: true,
        })
      }
    } catch (error) {
      console.error('Error toggling like:', error)
    }
  }

  const togglePublic = async () => {
    if (!user || !catchData || catchData.user_id !== user.id) return

    try {
      const nextPublic = !catchData.is_public
      const { error } = await supabase
        .from('catches')
        .update({ is_public: nextPublic })
        .eq('id', id)

      if (error) throw error

      setCatchData({
        ...catchData,
        is_public: nextPublic,
      })

      if (!nextPublic && pinnedCatchIds.includes(catchData.id)) {
        const nextPinned = pinnedCatchIds.filter((id) => id !== catchData.id)
        await persistPinned(nextPinned)
      }
    } catch (error) {
      console.error('Error toggling public:', error)
      toast('Fehler beim Aktualisieren der Sichtbarkeit', 'error')
    }
  }

  const persistPinned = async (nextPinned: string[]) => {
    if (!user) return false
    setPinSaving(true)
    const { error } = await supabase
      .from('profiles')
      .update({
        pinned_catch_ids: nextPinned,
        updated_at: new Date().toISOString(),
      })
      .eq('id', user.id)

    if (error) {
      toast('Fehler beim Anpinnen: ' + error.message, 'error')
      setPinSaving(false)
      return false
    }

    setPinnedCatchIds(nextPinned)
    setPinSaving(false)
    return true
  }

  const handleTogglePin = async () => {
    if (!catchData || !user || catchData.user_id !== user.id) return
    const isPinned = pinnedCatchIds.includes(catchData.id)
    if (!catchData.is_public && !isPinned) {
      toast('Bitte mache den Fang zuerst öffentlich, damit er in der Vitrine angezeigt werden kann.', 'info')
      return
    }
    if (!isPinned && pinnedCatchIds.length >= 6) {
      toast('Du kannst maximal 6 Fänge anpinnen.', 'info')
      return
    }

    const nextPinned = isPinned
      ? pinnedCatchIds.filter((id) => id !== catchData.id)
      : [...pinnedCatchIds, catchData.id]

    await persistPinned(nextPinned)
    toast(isPinned ? 'Fang aus Vitrine entfernt' : 'Fang in Vitrine gepinnt', 'success')
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-ocean-light">Laden...</div>
      </div>
    )
  }

  if (error || !catchData) {
    return (
      <div className="space-y-6">
        <div className="bg-ocean/30 backdrop-blur-sm rounded-xl p-12 text-center">
          <div className="mb-4 flex justify-center"><FishIcon className="w-14 h-14 text-ocean-light" /></div>
          <h1 className="text-2xl font-bold text-white mb-4">Fang nicht gefunden</h1>
          <p className="text-ocean-light mb-6">
            Dieser Fang existiert nicht oder ist privat.
          </p>
          <Link
            href="/catches"
            className="inline-block bg-ocean hover:bg-ocean-light text-white font-semibold py-3 px-8 rounded-lg transition-colors"
          >
            Zurück zu meinen Fängen
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-fade-in pb-20 md:pb-6">
      {/* Back Button */}
      <Link
        href="/catches"
        className="inline-flex items-center gap-2 text-ocean-light hover:text-white transition-colors"
      >
        <ArrowLeft className="w-5 h-5" />
        Zurück
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Photo & Map */}
        <div className="lg:col-span-2 space-y-4">
          {/* Photo */}
          {catchData.photo_url && (
            <div className="bg-ocean/30 backdrop-blur-sm rounded-xl p-4">
              <div className="relative w-full aspect-video rounded-lg overflow-hidden bg-ocean-dark">
                <Image
                  src={catchData.photo_url}
                  alt={catchData.species}
                  fill
                  sizes="100vw"
            className="object-cover"
                />
              </div>
            </div>
          )}

          {/* Map */}
          {catchData.coordinates && (
            <div className="bg-ocean/30 backdrop-blur-sm rounded-xl p-4">
              <h3 className="text-white font-semibold mb-3 flex items-center gap-2">
                <MapPin className="w-5 h-5 text-ocean-light" />
                Fangort
              </h3>
              <div className="h-64 rounded-lg overflow-hidden">
                <Map
                  coordinates={catchData.coordinates}
                  location={catchData.location}
                />
              </div>
            </div>
          )}
        </div>

        {/* Right Column - Info */}
        <div className="space-y-4">
          {/* Main Info Card */}
          <div className={`bg-ocean/30 backdrop-blur-sm rounded-xl p-6 ${catchData.is_shiny ? (catchData.shiny_reason === 'legendary' ? 'legendary-ring' : 'shiny-ring') : ''}`}>
            <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-2">
              <FishIcon className="w-8 h-8 text-ocean-light" />
              {catchData.species}
            </h1>
            {catchData.is_shiny && (
              <div className="space-y-1 mb-3">
                <div className="inline-flex items-center gap-2 text-sm text-yellow-300">
                  <span className="relative group inline-flex items-center gap-2">
                    <Star className={`w-4 h-4 ${catchData.shiny_reason === 'legendary' ? 'text-white' : 'fill-yellow-400 text-yellow-400'}`} />
                    {catchData.shiny_reason === 'legendary' ? 'Legendär' : 'Trophäe-Fang'}
                    {catchData.shiny_reason === 'trophy' && <span className="text-yellow-200/80">(Rekord)</span>}
                    {catchData.shiny_reason === 'lucky' && <span className="text-yellow-200/80">(Glück)</span>}
                    {catchData.shiny_reason === 'legendary' && <span className="text-white/80">(Rekord)</span>}
                    <span className="absolute left-0 -bottom-8 bg-black/90 text-white text-xs px-2 py-1 rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                      {catchData.shiny_reason === 'legendary' ? 'Legendär • Rekord' : 'Trophäe'}
                    </span>
                  </span>
                </div>
                {shinyRank && shinyRank.total > 0 && (
                  <div className="text-xs text-yellow-200/80">
                    Aktueller Rang: Platz {shinyRank.above} von {shinyRank.total} • Top{' '}
                    {Math.max(1, Math.round((shinyRank.above / shinyRank.total) * 100))}%
                  </div>
                )}
              </div>
            )}
            <div className="flex items-center gap-2 mb-3">
              <VerificationBadge
                status={catchData.verification_status}
                aiVerified={catchData.ai_verified}
              />
              <span className="text-xs text-ocean-light">
                {catchData.verification_status === 'verified' || catchData.ai_verified
                  ? 'Verifiziert'
                  : catchData.verification_status === 'manual'
                    ? 'Manuell'
                    : catchData.verification_status === 'rejected'
                      ? 'Abgelehnt'
                      : 'Ausstehend'}
              </span>
            </div>
            <Link href={`/user/${catchData.user_id}`}>
              <p className="text-ocean-light text-sm hover:text-white transition-colors mb-4">
                von @{catchData.username}
              </p>
            </Link>

            {/* Stats */}
            <div className="space-y-3 mb-4">
              <div className="flex items-center justify-between py-2 border-b border-ocean-light/20">
                <span className="text-ocean-light text-sm flex items-center gap-2">
                  <Ruler className="w-4 h-4" />
                  Länge
                </span>
                <span className="text-white font-semibold">{catchData.length} cm</span>
              </div>

              {catchData.weight && (
                <div className="flex items-center justify-between py-2 border-b border-ocean-light/20">
                  <span className="text-ocean-light text-sm flex items-center gap-2">
                    <Scale className="w-4 h-4" />
                    Gewicht
                  </span>
                  <span className="text-white font-semibold">
                    {catchData.weight > 1000
                      ? `${(catchData.weight / 1000).toFixed(2)} kg`
                      : `${catchData.weight} g`}
                  </span>
                </div>
              )}

              <div className="flex items-center justify-between py-2 border-b border-ocean-light/20">
                <span className="text-ocean-light text-sm flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  Datum
                </span>
                <div className="text-right">
                  <div className="text-white font-semibold text-sm">
                    {format(new Date(catchData.date), 'dd.MM.yyyy', { locale: de })}
                  </div>
                  <div className="text-ocean-light text-xs">
                    {format(new Date(catchData.date), 'HH:mm', { locale: de })} Uhr
                  </div>
                </div>
              </div>

              {catchData.location && (
                <div className="flex items-center justify-between py-2 border-b border-ocean-light/20">
                  <span className="text-ocean-light text-sm flex items-center gap-2">
                    <MapPin className="w-4 h-4" />
                    Ort
                  </span>
                  <span className="text-white font-semibold text-sm text-right">
                    {catchData.location}
                  </span>
                </div>
              )}
            </div>

            {/* Additional Info */}
            {catchData.bait && (
              <div className="mb-3">
                <div className="text-ocean-light text-sm mb-1">Köder</div>
                <div className="text-white text-sm">{catchData.bait}</div>
              </div>
            )}

            {catchData.notes && (
              <div className="mb-4">
                <div className="text-ocean-light text-sm mb-1">Notizen</div>
                <div className="text-white text-sm">{catchData.notes}</div>
              </div>
            )}

            {catchData.weather && (
              <div className="mb-4 p-4 rounded-lg bg-ocean-dark/50 border border-ocean-light/20">
                <div className="flex items-center gap-2 text-white font-semibold mb-3">
                  <CloudSun className="w-4 h-4 text-ocean-light" />
                  Wetter zum Fangzeitpunkt
                </div>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="text-ocean-light inline-flex items-center gap-1">
                    <Thermometer className="w-4 h-4" />
                    Temperatur
                  </div>
                  <div className="text-white text-right">{catchData.weather.temperature}°C</div>

                  <div className="text-ocean-light inline-flex items-center gap-1">
                    <Wind className="w-4 h-4" />
                    Wind
                  </div>
                  <div className="text-white text-right">{catchData.weather.windSpeed} km/h</div>

                  <div className="text-ocean-light inline-flex items-center gap-1">
                    <Gauge className="w-4 h-4" />
                    Luftdruck
                  </div>
                  <div className="text-white text-right">{catchData.weather.pressure} hPa</div>

                  <div className="text-ocean-light inline-flex items-center gap-1">
                    <Droplets className="w-4 h-4" />
                    Luftfeuchte
                  </div>
                  <div className="text-white text-right">{catchData.weather.humidity}%</div>
                </div>
                <div className="text-ocean-light text-xs mt-2">{catchData.weather.description}</div>
                <div className={`text-xs mt-1 ${getWeatherSourceClass(catchData.weather.source)}`}>
                  Quelle: {getWeatherSourceLabel(catchData.weather.source)}
                </div>
              </div>
            )}

            {/* Public Toggle - Only for own catches */}
            {catchData.user_id === user?.id && (
              <div className="mb-4 pb-4 border-b border-ocean-light/20">
                <label className="flex items-center justify-between cursor-pointer group">
                  <div>
                    <div className="text-white font-semibold mb-1">
                      Öffentlich teilen
                    </div>
                    <div className="text-ocean-light text-xs">
                      {catchData.is_public
                        ? 'Dieser Fang ist öffentlich sichtbar'
                        : 'Nur du kannst diesen Fang sehen'}
                    </div>
                  </div>
                  <div className="relative">
                    <input
                      type="checkbox"
                      checked={catchData.is_public}
                      onChange={togglePublic}
                      className="sr-only peer"
                    />
                    <div className="w-14 h-8 bg-ocean-dark rounded-full peer peer-checked:bg-green-500 transition-colors"></div>
                    <div className="absolute left-1 top-1 w-6 h-6 bg-white rounded-full transition-transform peer-checked:translate-x-6"></div>
                  </div>
                </label>
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center gap-4 pt-4 border-t border-ocean-light/20">
              {catchData.user_id === user?.id && (
                <button
                  onClick={handleTogglePin}
                  disabled={pinSaving}
                  className={`flex items-center gap-2 transition-all ${
                    pinnedCatchIds.includes(catchData.id)
                      ? 'text-yellow-300'
                      : 'text-ocean-light hover:text-yellow-300'
                  } ${pinSaving ? 'opacity-60 cursor-not-allowed' : ''}`}
                >
                  <Star
                    className={`w-6 h-6 ${
                      pinnedCatchIds.includes(catchData.id)
                        ? 'fill-yellow-400 text-yellow-400'
                        : ''
                    }`}
                  />
                  <span className="font-semibold">
                    {pinnedCatchIds.includes(catchData.id) ? 'Gepinnt' : 'Anpinnen'}
                  </span>
                </button>
              )}
              <button
                onClick={toggleLike}
                className={`flex items-center gap-2 transition-all ${
                  catchData.user_has_liked
                    ? 'text-red-400 scale-110'
                    : 'text-ocean-light hover:text-red-400 hover:scale-110'
                }`}
              >
                <Heart className={`w-6 h-6 ${catchData.user_has_liked ? 'fill-current' : ''}`} />
                <span className="font-semibold">{catchData.likes_count}</span>
              </button>
              <div className="flex items-center gap-2 text-ocean-light">
                <MessageCircle className="w-6 h-6" />
                <span className="font-semibold">{catchData.comments_count}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Comments - Full Width */}
      <Comments catchId={id} />
    </div>
  )
}


