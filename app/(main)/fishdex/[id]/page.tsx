'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { useCatchStore } from '@/lib/store'
import type { FishDexEntry } from '@/lib/types/fishdex'
import { getSpeciesInfo, getSpeciesRarity } from '@/lib/utils/speciesInfo'
import { ArrowLeft, MapPin, Calendar, Ruler, Scale, Trophy, Info, Lightbulb, Lock, Fish, Droplet, Waves, HelpCircle, RotateCcw, Trash2 } from 'lucide-react'
import { format } from 'date-fns'
import { de } from 'date-fns/locale'
import { useToast } from '@/components/ToastProvider'

export default function FishDexDetailPage({ params }: { params: { id: string } }) {
  const user = useCatchStore(state => state.user)
  const [entry, setEntry] = useState<FishDexEntry | null>(null)
  const [catches, setCatches] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [resetting, setResetting] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    if (user) {
      loadSpeciesDetail()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, params.id])

  const loadSpeciesDetail = async () => {
    if (!user) return

    try {
      // Load species info
      const { data: species, error: speciesError } = await supabase
        .from('fish_species')
        .select('*')
        .eq('id', params.id)
        .single()

      if (speciesError) throw speciesError

      // Load user progress
      const { data: progress, error: progressError } = await supabase
        .from('user_fishdex')
        .select('*')
        .eq('user_id', user.id)
        .eq('species_id', params.id)
        .single()

      // Load user's catches of this species (verified only)
      if (progress) {
        const { data: userCatches } = await supabase
          .from('catches')
          .select('*')
          .eq('user_id', user.id)
          .eq('species', species.name)
          .or('verification_status.eq.verified,ai_verified.eq.true')
          .order('date', { ascending: false })

        setCatches(userCatches || [])
      } else {
        setCatches([])
      }

      setEntry({
        ...species,
        discovered: !!progress,
        userProgress: progress || undefined
      })
    } catch (error) {
      console.error('Error loading species detail:', error)
    } finally {
      setLoading(false)
    }
  }

  const resetFishDexEntry = async () => {
    if (!user || !entry) return

    const confirmed = confirm(
      `Möchtest du wirklich deinen FishDex-Eintrag für ${entry.name} zurücksetzen?\n\n` +
      `Dies wird:\n` +
      `• Den Eintrag aus deiner FishDex entfernen\n` +
      `• Die Fischart als "nicht entdeckt" markieren\n\n` +
      `WICHTIG: Deine Fänge bleiben erhalten und die Art wird beim nächsten Fang wieder entdeckt!`
    )

    if (!confirmed) return

    setResetting(true)
    try {
      const { error } = await supabase.rpc('reset_fishdex_entry', {
        p_user_id: user.id,
        p_species_name: entry.name
      })

      if (error) throw error

      toast(`${entry.name} wurde aus deiner FishDex entfernt!`, 'success')
      // Redirect to FishDex
      window.location.href = '/fishdex'
    } catch (error: any) {
      console.error('Error resetting FishDex entry:', error)
      toast('Fehler beim Zurücksetzen: ' + (error.message || 'Unbekannter Fehler'), 'error')
    } finally {
      setResetting(false)
    }
  }

  const getRarityStars = (rarity: number) => {
    return '⭐'.repeat(rarity)
  }

  const getRarityLabel = (rarity: number) => {
    switch (rarity) {
      case 1: return 'Häufig'
      case 2: return 'Gelegentlich'
      case 3: return 'Selten'
      case 4: return 'Sehr selten'
      case 5: return 'Legendär'
      default: return 'Unbekannt'
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-ocean-light">Laden...</div>
      </div>
    )
  }

  if (!entry) {
    return (
      <div className="space-y-6">
        <div className="bg-ocean/30 backdrop-blur-sm rounded-xl p-12 text-center">
          <HelpCircle className="w-16 h-16 text-ocean-light mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-white mb-4">Art nicht gefunden</h1>
          <Link
            href="/fishdex"
            className="inline-block bg-ocean hover:bg-ocean-light text-white font-semibold py-3 px-8 rounded-lg transition-colors"
          >
            Zurück zur FishDex
          </Link>
        </div>
      </div>
    )
  }

  const info = getSpeciesInfo({
    scientificName: entry.scientific_name,
    germanName: entry.name,
  })

  const baits = entry.baits && entry.baits.length > 0 ? entry.baits : info?.['köder']
  const rarity = getSpeciesRarity({
    scientificName: entry.scientific_name,
    germanName: entry.name,
    fallback: entry.rarity,
  })
  const seasons = info?.saison || []
  const times = info?.tageszeit || []
  const methods = info?.fangmethode || []

  const waterLabels = info?.wasser || []

  return (
    <div className="space-y-6 pb-20 md:pb-6">
      {/* Back Button */}
      <Link
        href="/fishdex"
        className="inline-flex items-center gap-2 text-ocean-light hover:text-white transition-colors"
      >
        <ArrowLeft className="w-5 h-5" />
        Zurück zur FishDex
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Image & Basic Info */}
        <div className="lg:col-span-2 space-y-4">
          {/* Image Card */}
          <div className="bg-ocean/30 backdrop-blur-sm rounded-xl p-6">
            <div className="relative aspect-video rounded-lg overflow-hidden bg-ocean-dark mb-4">
              {entry.discovered ? (
                entry.image_url ? (
                  <Image
                    src={entry.image_url}
                    alt={entry.name}
                    fill
                    sizes="100vw"
            className="object-contain"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Fish className="w-32 h-32 text-ocean-light" />
                  </div>
                )
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <Lock className="w-32 h-32 text-gray-600" />
                </div>
              )}
            </div>

            {/* Status Badge */}
            <div className="flex items-center justify-center">
              {entry.discovered ? (
                <div className="inline-flex items-center gap-2 bg-green-900/30 text-green-400 px-4 py-2 rounded-full">
                  <Trophy className="w-5 h-5" />
                  <span className="font-bold">VERIFIZIERT</span>
                </div>
              ) : (
                <div className="inline-flex items-center gap-2 bg-gray-900/30 text-gray-400 px-4 py-2 rounded-full">
                  ðŸ”’ <span className="font-bold">NICHT ENTDECKT</span>
                </div>
              )}
            </div>
          </div>

          {/* Description */}
          {entry.discovered ? (
            <div className="bg-ocean/30 backdrop-blur-sm rounded-xl p-6">
              <h3 className="text-white font-semibold mb-3 flex items-center gap-2">
                <Info className="w-5 h-5 text-ocean-light" />
                Beschreibung
              </h3>
              <p className="text-white leading-relaxed">
                {entry.description}
              </p>
              {entry.scientific_name && (
                <p className="text-ocean-light text-sm mt-3 italic">
                  Wissenschaftlich: {entry.scientific_name}
                </p>
              )}
            </div>
          ) : (
            <div className="bg-ocean/30 backdrop-blur-sm rounded-xl p-6">
              <h3 className="text-white font-semibold mb-3 flex items-center gap-2">
                <Lightbulb className="w-5 h-5 text-yellow-400" />
                Hinweise
              </h3>
              <p className="text-ocean-light leading-relaxed">
                {entry.hints || 'Keine Hinweise verfügbar.'}
              </p>
            </div>
          )}

          {/* User's Catches */}
          {entry.discovered && catches.length > 0 && (
            <div className="bg-ocean/30 backdrop-blur-sm rounded-xl p-6">
              <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
                <Calendar className="w-5 h-5 text-ocean-light" />
                Deine Fänge ({catches.length})
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {catches.slice(0, 4).map(catchItem => (
                  <Link
                    key={catchItem.id}
                    href={`/catch/${catchItem.id}`}
                    className="bg-ocean-dark/50 rounded-lg p-3 hover:bg-ocean-dark transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      {catchItem.photo_url && (
                        <div className="relative w-16 h-16 rounded overflow-hidden flex-shrink-0">
                          <Image
                            src={catchItem.photo_url}
                            alt="Fang"
                            fill
                            sizes="100vw"
            className="object-cover"
                          />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="text-white font-semibold text-sm">
                          {catchItem.length} cm
                          {catchItem.weight && ` • ${catchItem.weight > 1000 ? `${(catchItem.weight/1000).toFixed(1)}kg` : `${catchItem.weight}g`}`}
                        </div>
                        <div className="text-ocean-light text-xs">
                          {format(new Date(catchItem.date), 'dd.MM.yyyy', { locale: de })}
                        </div>
                        {catchItem.location && (
                          <div className="text-ocean-light text-xs truncate flex items-center gap-1">
                            <MapPin className="w-3 h-3" />
                            {catchItem.location}
                          </div>
                        )}
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
              {catches.length > 4 && (
                <Link
                  href={`/catches?species=${entry.name}`}
                  className="block text-center text-ocean-light hover:text-white text-sm mt-3 transition-colors"
                >
                  Alle {catches.length} Fänge ansehen →
                </Link>
              )}
            </div>
          )}
        </div>

        {/* Right: Stats & Info */}
        <div className="space-y-4">
          {/* Title */}
          <div className="bg-ocean/30 backdrop-blur-sm rounded-xl p-6">
            <h1 className="text-3xl font-bold text-white mb-2">
              {entry.discovered ? entry.name : '??'}
            </h1>
            <div className="flex items-center gap-2 text-sm">
              <span className="text-ocean-light">Seltenheit:</span>
              <span className="text-yellow-400">{getRarityStars(rarity)}</span>
              <span className="text-ocean-light">({getRarityLabel(rarity)})</span>
            </div>
          </div>

          {/* Quick Highlights */}
          {info && (
            <div className="bg-ocean/30 backdrop-blur-sm rounded-xl p-6">
              <h3 className="text-white font-semibold mb-3">Schnellinfos</h3>
              <div className="flex flex-wrap gap-2">
                {seasons.length > 0 && (
                  <span className="px-3 py-1 bg-ocean-dark rounded-full text-ocean-light text-sm">
                    Saison: {seasons.join(', ')}
                  </span>
                )}
                {times.length > 0 && (
                  <span className="px-3 py-1 bg-ocean-dark rounded-full text-ocean-light text-sm">
                    Tageszeit: {times.join(', ')}
                  </span>
                )}
                {info.wassertemperatur && (
                  <span className="px-3 py-1 bg-ocean-dark rounded-full text-ocean-light text-sm">
                    {info.wassertemperatur.min ? info.wassertemperatur.min : '-'}–{info.wassertemperatur.max ? info.wassertemperatur.max : '-'}°C
                  </span>
                )}
                {methods.length > 0 && (
                  <span className="px-3 py-1 bg-ocean-dark rounded-full text-ocean-light text-sm">
                    Methoden: {methods.join(', ')}
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Discovery Stats */}
          {entry.discovered && entry.userProgress && (
            <div className="bg-ocean/30 backdrop-blur-sm rounded-xl p-6">
              <h3 className="text-white font-semibold mb-4">Deine Statistiken</h3>
              
              <div className="space-y-3">
                <div className="flex items-center justify-between py-2 border-b border-ocean-light/20">
                  <span className="text-ocean-light text-sm">Erstfang</span>
                  <span className="text-white font-semibold text-sm">
                    {format(new Date(entry.userProgress.discovered_at), 'dd.MM.yyyy', { locale: de })}
                  </span>
                </div>

                <div className="flex items-center justify-between py-2 border-b border-ocean-light/20">
                  <span className="text-ocean-light text-sm">Gesamt gefangen</span>
                  <span className="text-white font-semibold">
                    {entry.userProgress.total_caught}x
                  </span>
                </div>

                {entry.userProgress.biggest_length && (
                  <div className="flex items-center justify-between py-2 border-b border-ocean-light/20">
                    <span className="text-ocean-light text-sm flex items-center gap-1">
                      <Ruler className="w-4 h-4" />
                      Größter
                    </span>
                    <span className="text-white font-semibold">
                      {entry.userProgress.biggest_length} cm
                    </span>
                  </div>
                )}

                {entry.userProgress.biggest_weight && (
                  <div className="flex items-center justify-between py-2 border-b border-ocean-light/20">
                    <span className="text-ocean-light text-sm flex items-center gap-1">
                      <Scale className="w-4 h-4" />
                      Schwerster
                    </span>
                    <span className="text-white font-semibold">
                      {entry.userProgress.biggest_weight > 1000
                        ? `${(entry.userProgress.biggest_weight / 1000).toFixed(2)} kg`
                        : `${entry.userProgress.biggest_weight} g`}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Species Info */}
          <div className="bg-ocean/30 backdrop-blur-sm rounded-xl p-6">
            <h3 className="text-white font-semibold mb-4">Allgemeine Infos</h3>
            
            <div className="space-y-3">
              <div className="flex items-center justify-between py-2 border-b border-ocean-light/20">
                <span className="text-ocean-light text-sm">Lebensraum</span>
                <span className="text-white text-sm flex items-center gap-2">
                  {waterLabels.length > 0 ? (
                    <span className="flex flex-wrap items-center gap-2">
                      {waterLabels.map((water) => (
                        <span key={water} className="inline-flex items-center gap-1">
                          {water === 'süßwasser' && <Droplet className="w-4 h-4" />}
                          {(water === 'salzwasser' || water === 'brackwasser') && (
                            <Waves className="w-4 h-4" />
                          )}
                          {water === 'süßwasser' && 'Süßwasser'}
                          {water === 'salzwasser' && 'Salzwasser'}
                          {water === 'brackwasser' && 'Brackwasser'}
                          {water !== 'süßwasser' && water !== 'salzwasser' && water !== 'brackwasser' && water}
                        </span>
                      ))}
                    </span>
                  ) : (
                    <>
                      {entry.habitat === 'freshwater' && (
                        <>
                          <Droplet className="w-4 h-4" />
                          Süßwasser
                        </>
                      )}
                      {entry.habitat === 'saltwater' && (
                        <>
                          <Waves className="w-4 h-4" />
                          Salzwasser
                        </>
                      )}
                      {entry.habitat === 'brackish' && (
                        <>
                          <Waves className="w-4 h-4" />
                          Brackwasser
                        </>
                      )}
                    </>
                  )}
                </span>
              </div>

              {entry.min_length && entry.max_length && (
                <div className="flex items-center justify-between py-2 border-b border-ocean-light/20">
                  <span className="text-ocean-light text-sm">Größe</span>
                  <span className="text-white text-sm">
                    {entry.min_length}-{entry.max_length} cm
                  </span>
                </div>
              )}

              {entry.closed_season && (
                <div className="flex items-center justify-between py-2 border-b border-ocean-light/20">
                  <span className="text-ocean-light text-sm">Schonzeit</span>
                  <span className="text-white text-sm">
                    {entry.closed_season}
                  </span>
                </div>
              )}

              {entry.best_time && (
                <div className="flex items-center justify-between py-2 border-b border-ocean-light/20">
                  <span className="text-ocean-light text-sm">Beste Zeit</span>
                  <span className="text-white text-sm">
                    {entry.best_time}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Recommended Baits */}
          {baits && baits.length > 0 && (
            <div className="bg-ocean/30 backdrop-blur-sm rounded-xl p-6">
              <h3 className="text-white font-semibold mb-3">Empfohlene Köder</h3>
              <div className="flex flex-wrap gap-2">
                {baits.map(bait => (
                  <span
                    key={bait}
                    className="px-3 py-1 bg-ocean-dark rounded-full text-ocean-light text-sm"
                  >
                    {bait}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Fishing Tips */}
          {info && (
            <div className="bg-ocean/30 backdrop-blur-sm rounded-xl p-6">
              <h3 className="text-white font-semibold mb-4">Angel-Infos</h3>
              <div className="space-y-3">
                {info.typ && (
                  <div className="flex items-center justify-between py-2 border-b border-ocean-light/20">
                    <span className="text-ocean-light text-sm">Typ</span>
                    <span className="text-white text-sm">
                      {info.typ === 'raubfisch' ? 'Raubfisch' : 'Friedfisch'}
                    </span>
                  </div>
                )}

                {info?.['gewässertyp'] && info['gewässertyp'].length > 0 && (
                  <div className="flex items-center justify-between py-2 border-b border-ocean-light/20">
                    <span className="text-ocean-light text-sm">Gewässer</span>
                    <span className="text-white text-sm text-right">
                      {info['gewässertyp'].join(', ')}
                    </span>
                  </div>
                )}

                {info.saison && info.saison.length > 0 && (
                  <div className="flex items-center justify-between py-2 border-b border-ocean-light/20">
                    <span className="text-ocean-light text-sm">Saison</span>
                    <span className="text-white text-sm text-right">
                      {info.saison.join(', ')}
                    </span>
                  </div>
                )}

                {info.tageszeit && info.tageszeit.length > 0 && (
                  <div className="flex items-center justify-between py-2 border-b border-ocean-light/20">
                    <span className="text-ocean-light text-sm">Tageszeit</span>
                    <span className="text-white text-sm text-right">
                      {info.tageszeit.join(', ')}
                    </span>
                  </div>
                )}

                {info.fangmethode && info.fangmethode.length > 0 && (
                  <div className="flex items-center justify-between py-2 border-b border-ocean-light/20">
                    <span className="text-ocean-light text-sm">Fangmethode</span>
                    <span className="text-white text-sm text-right">
                      {info.fangmethode.join(', ')}
                    </span>
                  </div>
                )}

                {info.wassertemperatur && (
                  <div className="flex items-center justify-between py-2 border-b border-ocean-light/20">
                    <span className="text-ocean-light text-sm">Wassertemperatur</span>
                    <span className="text-white text-sm">
                      {info.wassertemperatur.min ? info.wassertemperatur.min : '-'}–{info.wassertemperatur.max ? info.wassertemperatur.max : '-'}°C
                    </span>
                  </div>
                )}

                {typeof info.schwierigkeit === 'number' && (
                  <div className="flex items-center justify-between py-2 border-b border-ocean-light/20">
                    <span className="text-ocean-light text-sm">Schwierigkeit</span>
                    <span className="text-white text-sm">
                      {info.schwierigkeit}/5
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Reset Button - Only show if discovered */}
          {entry.discovered && (
            <div className="bg-red-900/20 backdrop-blur-sm rounded-xl p-6 border border-red-600/30">
              <h3 className="text-white font-semibold mb-3 flex items-center gap-2">
                <RotateCcw className="w-5 h-5 text-red-400" />
                FishDex zurücksetzen
              </h3>
              <p className="text-ocean-light text-sm mb-4">
                Entferne diese Art aus deiner FishDex. Deine Fänge bleiben erhalten und die Art wird beim nächsten Fang wieder entdeckt.
              </p>
              <button
                onClick={resetFishDexEntry}
                disabled={resetting}
                className="w-full px-4 py-2 bg-red-900/50 hover:bg-red-900/70 text-red-400 rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <Trash2 className="w-4 h-4" />
                {resetting ? 'Wird zurückgesetzt...' : 'Eintrag zurücksetzen'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

