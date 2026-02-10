'use client'

import { useState, useMemo, useEffect, useRef } from 'react'
import Link from 'next/link'
import dynamic from 'next/dynamic'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useCatchStore } from '@/lib/store'
import { MapPin, Fish, Filter, TrendingUp, RotateCcw } from 'lucide-react'
import FilterBar from '@/components/FilterBar'
import { format } from 'date-fns'
import { de } from 'date-fns/locale'

const SpotsMap = dynamic(() => import('@/components/SpotsMap'), { ssr: false })

type VerificationFilter = 'all' | 'verified' | 'manual' | 'pending'

type SortBy = 'catches' | 'species' | 'recent' | 'quality'
type MobileView = 'map' | 'spots'

export default function MapPage() {
  const catches = useCatchStore((state) => state.catches)
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const hasInitializedFromQuery = useRef(false)

  const [filterSpecies, setFilterSpecies] = useState<string>('all')
  const [filterTimeframe, setFilterTimeframe] = useState<string>('all')
  const [filterVerification, setFilterVerification] = useState<VerificationFilter>('all')
  const [sortBy, setSortBy] = useState<SortBy>('catches')
  const [mobileView, setMobileView] = useState<MobileView>('map')
  const [selectedSpot, setSelectedSpot] = useState<{ lat: number; lng: number } | null>(null)
  const [showHeatmap, setShowHeatmap] = useState(false)

  const filteredCatches = useMemo(() => {
    let filtered = catches.filter((c) => c.coordinates)

    if (filterSpecies !== 'all') {
      filtered = filtered.filter((c) => c.species === filterSpecies)
    }

    if (filterVerification !== 'all') {
      filtered = filtered.filter((c) => {
        if (filterVerification === 'verified') return Boolean(c.ai_verified || c.verification_status === 'verified')
        if (filterVerification === 'manual') return c.verification_status === 'manual'
        return c.verification_status === 'pending' && !c.ai_verified
      })
    }

    if (filterTimeframe !== 'all') {
      const now = new Date()
      const filterDate = new Date()

      switch (filterTimeframe) {
        case 'week':
          filterDate.setDate(now.getDate() - 7)
          break
        case 'month':
          filterDate.setMonth(now.getMonth() - 1)
          break
        case 'year':
          filterDate.setFullYear(now.getFullYear() - 1)
          break
      }

      filtered = filtered.filter((c) => new Date(c.date) >= filterDate)
    }

    return filtered
  }, [catches, filterSpecies, filterTimeframe, filterVerification])

  const spotStats = useMemo(() => {
    const spots = new Map<
      string,
      {
        catches: number
        verified: number
        species: Set<string>
        location: string
        coordinates: { lat: number; lng: number }
        lastCatch: Date
        score: number
      }
    >()

    const getSpotScore = (entry: {
      catches: number
      verified: number
      species: Set<string>
      lastCatch: Date
    }) => {
      const now = Date.now()
      const daysSinceLast = Math.floor((now - entry.lastCatch.getTime()) / (1000 * 60 * 60 * 24))
      const countScore = Math.min(35, entry.catches * 5)
      const speciesScore = Math.min(25, entry.species.size * 8)
      const verifyRatio = entry.catches > 0 ? entry.verified / entry.catches : 0
      const verifyScore = Math.round(verifyRatio * 25)
      const recencyScore = daysSinceLast <= 7 ? 15 : daysSinceLast <= 30 ? 11 : daysSinceLast <= 90 ? 7 : 3
      return Math.min(100, countScore + speciesScore + verifyScore + recencyScore)
    }

    filteredCatches.forEach((catchData) => {
      if (!catchData.coordinates) return

      const key = `${catchData.coordinates.lat.toFixed(4)},${catchData.coordinates.lng.toFixed(4)}`

      if (!spots.has(key)) {
        spots.set(key, {
          catches: 0,
          verified: 0,
          species: new Set(),
          location: catchData.location || 'Unbekannt',
          coordinates: catchData.coordinates,
          lastCatch: new Date(catchData.date),
          score: 0,
        })
      }

      const spot = spots.get(key)!
      spot.catches++
      if (catchData.ai_verified || catchData.verification_status === 'verified') {
        spot.verified++
      }
      spot.species.add(catchData.species)

      const catchDate = new Date(catchData.date)
      if (catchDate > spot.lastCatch) {
        spot.lastCatch = catchDate
      }
      spot.score = getSpotScore(spot)
    })

    const spotsArray = Array.from(spots.values())

    switch (sortBy) {
      case 'catches':
        spotsArray.sort((a, b) => b.catches - a.catches)
        break
      case 'species':
        spotsArray.sort((a, b) => b.species.size - a.species.size)
        break
      case 'recent':
        spotsArray.sort((a, b) => b.lastCatch.getTime() - a.lastCatch.getTime())
        break
      case 'quality':
        spotsArray.sort((a, b) => b.score - a.score)
        break
    }

    return spotsArray
  }, [filteredCatches, sortBy])

  const uniqueSpecies = useMemo(() => {
    return [...new Set(catches.filter((c) => c.coordinates).map((c) => c.species))].sort((a, b) => a.localeCompare(b, 'de'))
  }, [catches])

  useEffect(() => {
    if (hasInitializedFromQuery.current) return

    const qSpecies = searchParams.get('species')
    const qTimeframe = searchParams.get('timeframe')
    const qVerify = searchParams.get('verify')
    const qSort = searchParams.get('sort')
    const qHeatmap = searchParams.get('heatmap')
    const qView = searchParams.get('view')

    if (qSpecies) setFilterSpecies(qSpecies)
    if (qTimeframe === 'all' || qTimeframe === 'week' || qTimeframe === 'month' || qTimeframe === 'year') {
      setFilterTimeframe(qTimeframe)
    }
    if (qVerify === 'all' || qVerify === 'verified' || qVerify === 'manual' || qVerify === 'pending') {
      setFilterVerification(qVerify)
    }
    if (qSort === 'catches' || qSort === 'species' || qSort === 'recent' || qSort === 'quality') {
      setSortBy(qSort)
    }
    if (qHeatmap === '1') setShowHeatmap(true)
    if (qView === 'map' || qView === 'spots') setMobileView(qView)

    hasInitializedFromQuery.current = true
  }, [searchParams])

  useEffect(() => {
    if (!hasInitializedFromQuery.current) return

    const params = new URLSearchParams()
    if (filterSpecies !== 'all') params.set('species', filterSpecies)
    if (filterTimeframe !== 'all') params.set('timeframe', filterTimeframe)
    if (filterVerification !== 'all') params.set('verify', filterVerification)
    if (sortBy !== 'catches') params.set('sort', sortBy)
    if (showHeatmap) params.set('heatmap', '1')
    if (mobileView !== 'map') params.set('view', mobileView)

    const nextQuery = params.toString()
    const currentQuery = searchParams.toString()
    if (nextQuery === currentQuery) return

    router.replace(nextQuery ? `${pathname}?${nextQuery}` : pathname, { scroll: false })
  }, [filterSpecies, filterTimeframe, filterVerification, sortBy, showHeatmap, mobileView, pathname, router, searchParams])

  const resetFilters = () => {
    setFilterSpecies('all')
    setFilterTimeframe('all')
    setFilterVerification('all')
    setSortBy('catches')
    setShowHeatmap(false)
    setMobileView('map')
  }

  useEffect(() => {
    if (!selectedSpot) return
    const stillExists = spotStats.some(
      (spot) => spot.coordinates.lat === selectedSpot.lat && spot.coordinates.lng === selectedSpot.lng
    )
    if (!stillExists) setSelectedSpot(null)
  }, [spotStats, selectedSpot])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
          <MapPin className="w-8 h-8 text-ocean-light" />
          Angelkarte
        </h1>
        <p className="text-ocean-light">
          {filteredCatches.length} {filteredCatches.length === 1 ? 'Fang' : 'Fänge'} • {spotStats.length}{' '}
          {spotStats.length === 1 ? 'Spot' : 'Spots'}
        </p>
      </div>

      <FilterBar
        title="Filter & Sortierung"
        icon={Filter}
        activeFilters={[
          ...(filterSpecies !== 'all'
            ? [{ id: 'species', label: `Art: ${filterSpecies}`, onClear: () => setFilterSpecies('all') }]
            : []),
          ...(filterTimeframe !== 'all'
            ? [{
                id: 'timeframe',
                label:
                  filterTimeframe === 'week'
                    ? 'Zeit: Letzte Woche'
                    : filterTimeframe === 'month'
                      ? 'Zeit: Letzter Monat'
                      : 'Zeit: Letztes Jahr',
                onClear: () => setFilterTimeframe('all'),
              }]
            : []),
          ...(filterVerification !== 'all'
            ? [{
                id: 'verify',
                label:
                  filterVerification === 'verified'
                    ? 'Verifiziert'
                    : filterVerification === 'manual'
                      ? 'Manuell'
                      : 'Ausstehend',
                onClear: () => setFilterVerification('all'),
              }]
            : []),
          ...(showHeatmap ? [{ id: 'heatmap', label: 'Heatmap', onClear: () => setShowHeatmap(false) }] : []),
        ]}
        onClearAll={resetFilters}
        clearAllLabel="Alles zurücksetzen"
      >
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-ocean-light text-sm mb-2">Fischart</label>
            <select
              value={filterSpecies}
              onChange={(e) => setFilterSpecies(e.target.value)}
              className="w-full px-4 py-2 rounded-lg bg-ocean-dark text-white border border-ocean-light/30 focus:border-ocean-light focus:outline-none"
            >
              <option value="all">Alle Arten ({catches.filter((c) => c.coordinates).length})</option>
              {uniqueSpecies.map((species) => (
                <option key={species} value={species}>
                  {species} ({catches.filter((c) => c.coordinates && c.species === species).length})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-ocean-light text-sm mb-2">Zeitraum</label>
            <select
              value={filterTimeframe}
              onChange={(e) => setFilterTimeframe(e.target.value)}
              className="w-full px-4 py-2 rounded-lg bg-ocean-dark text-white border border-ocean-light/30 focus:border-ocean-light focus:outline-none"
            >
              <option value="all">Alle Zeit</option>
              <option value="week">Letzte Woche</option>
              <option value="month">Letzter Monat</option>
              <option value="year">Letztes Jahr</option>
            </select>
          </div>

          <div>
            <label className="block text-ocean-light text-sm mb-2">Verifizierung</label>
            <select
              value={filterVerification}
              onChange={(e) => setFilterVerification(e.target.value as VerificationFilter)}
              className="w-full px-4 py-2 rounded-lg bg-ocean-dark text-white border border-ocean-light/30 focus:border-ocean-light focus:outline-none"
            >
              <option value="all">Alle</option>
              <option value="verified">Verifiziert</option>
              <option value="manual">Manuell</option>
              <option value="pending">Ausstehend</option>
            </select>
          </div>

          <div>
            <label className="block text-ocean-light text-sm mb-2">Sortierung</label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortBy)}
              className="w-full px-4 py-2 rounded-lg bg-ocean-dark text-white border border-ocean-light/30 focus:border-ocean-light focus:outline-none"
            >
              <option value="catches">Meiste Fänge</option>
              <option value="species">Meiste Arten</option>
              <option value="recent">Neueste zuerst</option>
              <option value="quality">Beste Spot-Qualität</option>
            </select>
          </div>
        </div>

        <div className="mt-4 flex items-center justify-between rounded-lg bg-ocean-dark/40 px-4 py-3">
          <div>
            <div className="text-white font-semibold">Heatmap</div>
            <div className="text-ocean-light text-sm">Dichte der Fänge visualisieren</div>
          </div>
          <div className="flex items-center gap-3">
            <label className="inline-flex cursor-pointer items-center gap-3">
              <span className="sr-only">Heatmap umschalten</span>
              <input
                type="checkbox"
                className="sr-only"
                checked={showHeatmap}
                onChange={() => setShowHeatmap((prev) => !prev)}
              />
              <span
                className={`relative inline-flex h-6 w-11 items-center rounded-full border transition-colors shadow-inner ${
                  showHeatmap ? 'bg-amber-500/90 border-amber-400/60' : 'bg-gray-700 border-gray-500/60'
                }`}
              >
                <span
                  className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${
                    showHeatmap ? 'translate-x-5' : 'translate-x-1'
                  }`}
                />
              </span>
            </label>
            <button
              type="button"
              onClick={resetFilters}
              className="inline-flex items-center gap-2 text-sm text-ocean-light hover:text-white transition-colors"
            >
              <RotateCcw className="w-4 h-4" />
              Reset
            </button>
          </div>
        </div>
      </FilterBar>

      <div className="md:hidden inline-flex w-full rounded-xl bg-ocean/30 border border-ocean-light/20 p-1">
        <button
          type="button"
          onClick={() => setMobileView('map')}
          className={`flex-1 py-2 rounded-lg text-sm transition-colors ${mobileView === 'map' ? 'bg-ocean text-white' : 'text-ocean-light hover:text-white'}`}
        >
          Karte
        </button>
        <button
          type="button"
          onClick={() => setMobileView('spots')}
          className={`flex-1 py-2 rounded-lg text-sm transition-colors ${mobileView === 'spots' ? 'bg-ocean text-white' : 'text-ocean-light hover:text-white'}`}
        >
          Spots
        </button>
      </div>

      {filteredCatches.length > 0 ? (
        <div className={`bg-ocean/30 backdrop-blur-sm rounded-xl p-4 ${mobileView === 'spots' ? 'hidden md:block' : ''}`}>
          <div className="h-[500px] rounded-lg overflow-hidden">
            <SpotsMap catches={filteredCatches} selectedSpot={selectedSpot} showHeatmap={showHeatmap} />
          </div>
        </div>
      ) : (
        <div className="bg-ocean/30 backdrop-blur-sm rounded-xl p-12 text-center">
          <MapPin className="w-16 h-16 text-ocean-light mx-auto mb-4" />
          <h3 className="text-xl font-bold text-white mb-2">Keine Spots gefunden</h3>
          <p className="text-ocean-light mb-6">
            {filterSpecies !== 'all' || filterTimeframe !== 'all' || filterVerification !== 'all'
              ? 'Versuche andere Filter'
              : 'Füge Fänge mit GPS-Koordinaten hinzu'}
          </p>
          <Link
            href="/catches"
            className="inline-block bg-ocean hover:bg-ocean-light text-white font-semibold py-3 px-8 rounded-lg transition-colors"
          >
            Fang hinzufügen
          </Link>
        </div>
      )}

      {spotStats.length > 0 && (
        <div className={`bg-ocean/30 backdrop-blur-sm rounded-xl p-6 ${mobileView === 'map' ? 'hidden md:block' : ''}`}>
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="w-5 h-5 text-ocean-light" />
            <h2 className="text-xl font-bold text-white">Spots</h2>
          </div>

          <p className="text-ocean-light text-sm mb-4">Tippe auf einen Spot, um die Karte dorthin zu zoomen.</p>

          <div className="space-y-3">
            {spotStats.map((spot, index) => (
              <button
                key={`${spot.coordinates.lat}-${spot.coordinates.lng}`}
                type="button"
                onClick={() => setSelectedSpot(spot.coordinates)}
                className={`w-full text-left bg-ocean-dark/50 rounded-lg p-4 transition-colors ${
                  selectedSpot &&
                  selectedSpot.lat === spot.coordinates.lat &&
                  selectedSpot.lng === spot.coordinates.lng
                    ? 'ring-2 ring-ocean-light'
                    : 'hover:bg-ocean-dark'
                }`}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-ocean text-white font-bold text-sm">
                      #{index + 1}
                    </div>
                    <div>
                      <div className="font-semibold text-white">{spot.location}</div>
                      <div className="text-xs text-ocean-light">
                        {spot.coordinates.lat.toFixed(4)}, {spot.coordinates.lng.toFixed(4)}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-ocean-light text-xs">Qualität</div>
                    <div className="text-white text-sm font-semibold">{spot.score}/100</div>
                    <div className="text-ocean-light text-xs">Letzter Fang</div>
                    <div className="text-white text-sm font-semibold">{format(spot.lastCatch, 'dd.MM.yyyy', { locale: de })}</div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-ocean-deeper/50 rounded p-2">
                    <div className="text-ocean-light text-xs flex items-center gap-1">
                      <Fish className="w-3 h-3" />
                      Fänge
                    </div>
                    <div className="text-white font-semibold">{spot.catches}</div>
                  </div>
                  <div className="bg-ocean-deeper/50 rounded p-2">
                    <div className="text-ocean-light text-xs">Arten</div>
                    <div className="text-white font-semibold">{spot.species.size}</div>
                  </div>
                </div>

                {spot.species.size > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {Array.from(spot.species).map((species) => (
                      <span key={species} className="text-xs bg-ocean/50 text-ocean-light px-2 py-1 rounded-full">
                        {species}
                      </span>
                    ))}
                  </div>
                )}
                <div className="mt-3">
                  <Link
                    href={`/catches?new=1&lat=${spot.coordinates.lat}&lng=${spot.coordinates.lng}&location=${encodeURIComponent(spot.location)}`}
                    className="inline-flex items-center gap-2 text-xs text-ocean-light hover:text-white transition-colors"
                  >
                    + Fang hier eintragen
                  </Link>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {filteredCatches.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-ocean/30 backdrop-blur-sm rounded-xl p-4 text-center">
            <div className="text-3xl font-bold text-white mb-1">{filteredCatches.length}</div>
            <div className="text-ocean-light text-sm">Fänge mit GPS</div>
          </div>

          <div className="bg-ocean/30 backdrop-blur-sm rounded-xl p-4 text-center">
            <div className="text-3xl font-bold text-white mb-1">{spotStats.length}</div>
            <div className="text-ocean-light text-sm">Verschiedene Spots</div>
          </div>

          <div className="bg-ocean/30 backdrop-blur-sm rounded-xl p-4 text-center">
            <div className="text-3xl font-bold text-white mb-1">{new Set(filteredCatches.map((c) => c.species)).size}</div>
            <div className="text-ocean-light text-sm">Verschiedene Arten</div>
          </div>

          <div className="bg-ocean/30 backdrop-blur-sm rounded-xl p-4 text-center">
            <div className="text-3xl font-bold text-white mb-1">{spotStats.length > 0 ? Math.max(...spotStats.map((s) => s.catches)) : 0}</div>
            <div className="text-ocean-light text-sm">Max Fänge/Spot</div>
          </div>
        </div>
      )}
    </div>
  )
}
