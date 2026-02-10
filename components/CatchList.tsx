'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useCatchStore, type Catch } from '@/lib/store'
import { supabase } from '@/lib/supabase'
import { format } from 'date-fns'
import { de } from 'date-fns/locale'
import { Eye, Trash2, MapPin, Calendar, Ruler, Fish, Star, Filter } from 'lucide-react'
import dynamic from 'next/dynamic'
import VerificationBadge from '@/components/VerificationBadge'
import EmptyState from '@/components/EmptyState'
import FilterBar from '@/components/FilterBar'
import { useToast } from '@/components/ToastProvider'
import { useConfirm } from '@/components/ConfirmDialogProvider'

const Map = dynamic(() => import('./Map'), { ssr: false })

interface CatchListProps {
  catches?: Catch[]
}

export default function CatchList({ catches: propCatches }: CatchListProps = {}) {
  const user = useCatchStore((state) => state.user)
  const storeCatches = useCatchStore((state) => state.catches)
  const catches = propCatches || storeCatches
  const deleteCatch = useCatchStore((state) => state.deleteCatch)
  const [expandedMapId, setExpandedMapId] = useState<string | null>(null)
  const [pinnedCatchIds, setPinnedCatchIds] = useState<string[]>([])
  const [pinSaving, setPinSaving] = useState(false)
  const [showTrophiesOnly, setShowTrophiesOnly] = useState(false)
  const { toast } = useToast()
  const { confirm } = useConfirm()

  useEffect(() => {
    const loadPinned = async () => {
      if (!user) {
        setPinnedCatchIds([])
        return
      }
      const { data, error } = await supabase
        .from('profiles')
        .select('pinned_catch_ids')
        .eq('id', user.id)
        .single()

      if (!error) {
        setPinnedCatchIds((data?.pinned_catch_ids || []).slice(0, 6))
      }
    }

    loadPinned()
  }, [user])

  if (catches.length === 0) {
    return (
      <EmptyState
        icon={Fish}
        title="Noch keine Fänge"
        description="Füge deinen ersten Fang hinzu!"
        actionLabel="Fang hinzufügen"
        onAction={() => useCatchStore.getState().openCatchModal()}
      />
    )
  }

  const handleDelete = async (id: string) => {
    const confirmed = await confirm({
      title: 'Fang löschen?',
      message: 'Möchtest du diesen Fang wirklich löschen?',
      confirmLabel: 'Löschen',
      cancelLabel: 'Abbrechen',
      variant: 'danger',
    })
    if (confirmed) {
      await deleteCatch(id)
      toast('Fang gelöscht', 'success')
    }
  }

  const handleTogglePublic = async (catchItem: Catch) => {
    const newPublicState = !catchItem.is_public
    const { error } = await supabase
      .from('catches')
      .update({ is_public: newPublicState })
      .eq('id', catchItem.id)

    if (error) {
      toast('Fehler beim Aktualisieren der Sichtbarkeit', 'error')
      return
    }

    // Update store without page reload
    useCatchStore.setState((state) => ({
      catches: state.catches.map((c) =>
        c.id === catchItem.id
          ? { ...c, is_public: newPublicState }
          : c
      ),
    }))

    if (!newPublicState && pinnedCatchIds.includes(catchItem.id)) {
      const nextPinned = pinnedCatchIds.filter((id) => id !== catchItem.id)
      await persistPinned(nextPinned)
    }
    toast(newPublicState ? 'Fang ist jetzt öffentlich' : 'Fang ist jetzt privat', 'success')
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

  const handleTogglePin = async (catchItem: Catch) => {
    const isPinned = pinnedCatchIds.includes(catchItem.id)
    if (!catchItem.is_public && !isPinned) {
      toast('Bitte mache den Fang zuerst öffentlich, damit er in der Vitrine angezeigt werden kann.', 'info')
      return
    }

    if (!isPinned && pinnedCatchIds.length >= 6) {
      toast('Du kannst maximal 6 Fänge anpinnen.', 'info')
      return
    }

    const nextPinned = isPinned
      ? pinnedCatchIds.filter((id) => id !== catchItem.id)
      : [...pinnedCatchIds, catchItem.id]

    await persistPinned(nextPinned)
    toast(isPinned ? 'Fang aus Vitrine entfernt' : 'Fang in Vitrine gepinnt', 'success')
  }

  const visibleCatches = showTrophiesOnly
    ? catches.filter((c) => c.is_shiny)
    : catches

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold text-white mb-4">
        Meine Fänge ({visibleCatches.length})
      </h2>

      <FilterBar
        title="Filter"
        icon={Filter}
        activeFilters={showTrophiesOnly ? [{ id: 'trophies', label: 'Trophäen', onClear: () => setShowTrophiesOnly(false) }] : []}
        onClearAll={() => setShowTrophiesOnly(false)}
        clearAllLabel="Alle Filter"
      >
        <label className="flex items-center gap-2 text-ocean-light">
          <input
            type="checkbox"
            checked={showTrophiesOnly}
            onChange={(e) => setShowTrophiesOnly(e.target.checked)}
            className="accent-yellow-400"
          />
          Nur Trophäen anzeigen
        </label>
      </FilterBar>

      {/* Grid Layout - Like Social Page */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {visibleCatches.map((catchItem) => {
          const isLegendary = catchItem.shiny_reason === 'legendary'
          return (
            <div
              key={catchItem.id}
              className={`bg-ocean/30 backdrop-blur-sm rounded-xl overflow-hidden hover:shadow-xl transition-all duration-300 ${
                catchItem.is_shiny ? (isLegendary ? 'legendary-ring' : 'shiny-ring') : ''
              }`}
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
                    <VerificationBadge
                      status={catchItem.verification_status as any}
                      aiVerified={catchItem.ai_verified}
                      className="absolute top-2 left-2"
                    />

                    {catchItem.is_shiny && (
                      <div className={`absolute top-2 right-2 ${isLegendary ? 'legendary-badge text-white' : 'shiny-badge text-black'} rounded-full p-2 shadow-lg group`}>
                        <Star className="w-4 h-4" />
                        <div className="absolute bottom-full mb-2 right-0 bg-black/90 text-white text-xs px-2 py-1 rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                          {catchItem.shiny_reason === 'legendary'
                            ? 'Legendär • Rekord'
                            : `Trophäe${catchItem.shiny_reason ? ` • ${catchItem.shiny_reason === 'trophy' ? 'Rekord' : 'Glück'}` : ''}`}
                        </div>
                      </div>
                    )}
                    
                    {/* Hover Overlay */}
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center">
                      <Eye className="w-12 h-12 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  </>
                ) : (
                  <div className="h-full flex items-center justify-center relative">
                    <Fish className="w-14 h-14 opacity-50 text-ocean-light" />
                    {catchItem.is_shiny && (
                      <div className={`absolute top-2 right-2 ${isLegendary ? 'legendary-badge text-white' : 'shiny-badge text-black'} rounded-full p-2 shadow-lg group`}>
                        <Star className="w-4 h-4" />
                        <div className="absolute bottom-full mb-2 right-0 bg-black/90 text-white text-xs px-2 py-1 rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                          {catchItem.shiny_reason === 'legendary'
                            ? 'Legendär • Rekord'
                            : `Trophäe${catchItem.shiny_reason ? ` • ${catchItem.shiny_reason === 'trophy' ? 'Rekord' : 'Glück'}` : ''}`}
                        </div>
                      </div>
                    )}
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

                {/* Pin to Showcase */}
                <button
                  onClick={() => handleTogglePin(catchItem)}
                  disabled={pinSaving}
                  className={`px-3 py-2 rounded-lg transition-colors group relative ${
                    pinnedCatchIds.includes(catchItem.id)
                      ? 'bg-yellow-500/20 text-yellow-300 hover:bg-yellow-500/30'
                      : 'bg-ocean-dark hover:bg-ocean text-ocean-light'
                  } ${pinSaving ? 'opacity-60 cursor-not-allowed' : ''}`}
                  aria-label={pinnedCatchIds.includes(catchItem.id) ? 'Aus Vitrine entfernen' : 'In Vitrine anpinnen'}
                >
                  <Star
                    className={`w-4 h-4 ${
                      pinnedCatchIds.includes(catchItem.id)
                        ? 'fill-yellow-400 text-yellow-400'
                        : ''
                    }`}
                  />
                  <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-black/90 text-white text-xs px-2 py-1 rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                    {pinnedCatchIds.includes(catchItem.id) ? 'Gepinnt' : 'Anpinnen'}
                  </div>
                </button>

                {/* Public Toggle Button */}
                <button
                  onClick={() => handleTogglePublic(catchItem)}
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
          )
        })}
      </div>
    </div>
  )
}

