'use client'

import { useState, useEffect, useMemo } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { useCatchStore } from '@/lib/store'
import type { FishDexEntry, FishDexRegion, FishDexCategory, FishDexSortBy } from '@/lib/types/fishdex'
import { getSpeciesInfo, getSpeciesRarity, getSpeciesSearchTokens, normalizeSpeciesName } from '@/lib/utils/speciesInfo'
import { Search, Filter, Trophy, Star, Lock, Fish, BookOpen } from 'lucide-react'

export default function FishDexPage() {
  const user = useCatchStore(state => state.user)
  const [entries, setEntries] = useState<FishDexEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedRegion, setSelectedRegion] = useState<FishDexRegion>('deutschland')
  const [selectedCategory, setSelectedCategory] = useState<FishDexCategory>('all')
  const [sortBy, setSortBy] = useState<FishDexSortBy>('number')
  const [searchQuery, setSearchQuery] = useState('')
  const [onlyDiscovered, setOnlyDiscovered] = useState(false)

  useEffect(() => {
    if (user) {
      loadFishDex()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, selectedRegion])

  const loadFishDex = async () => {
    if (!user) return

    try {
      // Load all species for selected region
      const { data: species, error: speciesError } = await supabase
        .from('fish_species')
        .select('*')
        .contains('region', [selectedRegion])
        .order('name')

      if (speciesError) throw speciesError

      // Load user's discovered species
      const { data: userProgress, error: progressError } = await supabase
        .from('user_fishdex')
        .select('*')
        .eq('user_id', user.id)

      if (progressError) throw progressError

      const speciesById = new Map((species || []).map(s => [s.id, s]))

      const { data: userCatches, error: catchesError } = await supabase
        .from('catches')
        .select('species, verification_status, ai_verified, photo_url, length')
        .eq('user_id', user.id)
        .or('verification_status.eq.verified,ai_verified.eq.true')

      if (catchesError) throw catchesError

      const catchStats = new Map<
        string,
        {
          bestPhoto?: string | null
          bestLength: number
        }
      >()

      ;(userCatches || []).forEach((c) => {
        const name = (c.species || '').toLowerCase()
        if (!name) return

        const length = c.length || 0
        const stats = catchStats.get(name) || {
          bestPhoto: null,
          bestLength: 0,
        }

        if (c.photo_url && length >= stats.bestLength) {
          stats.bestLength = length
          stats.bestPhoto = c.photo_url
        }

        catchStats.set(name, stats)
      })

      const progressWithPhotos = (userProgress || []).map((progress) => {
        const speciesName = speciesById.get(progress.species_id)?.name || ''
        const stats = catchStats.get(speciesName.toLowerCase())

        return {
          ...progress,
          photo_url: stats?.bestPhoto || null,
          verified: true,
        }
      })

      // Merge data
      const progressMap = new Map(
        progressWithPhotos.map(p => [p.species_id, p])
      )

      const fishDexEntries: FishDexEntry[] = (species || []).map(s => ({
        ...s,
        discovered: progressMap.has(s.id),
        userProgress: progressMap.get(s.id),
        // Use photo from biggest catch if available
        image_url: progressMap.get(s.id)?.photo_url || s.image_url,
        verified: progressMap.get(s.id)?.verified ?? true,
      }))

      setEntries(fishDexEntries)
    } catch (error) {
      console.error('Error loading FishDex:', error)
    } finally {
      setLoading(false)
    }
  }

  // Filter and sort
  const filteredEntries = useMemo(() => {
    let filtered = entries

    // Category filter
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(e => {
        const info = getSpeciesInfo({ scientificName: e.scientific_name, germanName: e.name })
        if (selectedCategory === 'freshwater') {
          if (info?.wasser) return info.wasser.includes('süßwasser')
          return e.habitat === 'freshwater'
        }
        if (selectedCategory === 'saltwater') {
          if (info?.wasser) return info.wasser.includes('salzwasser')
          return e.habitat === 'saltwater'
        }
        if (selectedCategory === 'predator') {
          if (info?.typ) return info.typ === 'raubfisch'
          return ['Hecht', 'Zander', 'Barsch', 'Wels'].includes(e.name)
        }
        if (selectedCategory === 'peaceful') {
          if (info?.typ) return info.typ === 'friedfisch'
          return ['Karpfen', 'Brassen', 'Rotauge', 'Schleie'].includes(e.name)
        }
        return true
      })
    }

    if (onlyDiscovered) {
      filtered = filtered.filter(e => e.discovered)
    }

    // Search filter
    if (searchQuery) {
      const query = normalizeSpeciesName(searchQuery)
      filtered = filtered.filter(e => {
        const tokens = getSpeciesSearchTokens({
          scientificName: e.scientific_name,
          germanName: e.name,
        })
        return tokens.some(token => token.includes(query))
      })
    }

    // Sort
    filtered = [...filtered].sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.name.localeCompare(b.name)
        case 'rarity': {
          const aRarity = getSpeciesRarity({
            scientificName: a.scientific_name,
            germanName: a.name,
            fallback: a.rarity,
          })
          const bRarity = getSpeciesRarity({
            scientificName: b.scientific_name,
            germanName: b.name,
            fallback: b.rarity,
          })
          return bRarity - aRarity
        }
        case 'discovered':
          if (a.discovered === b.discovered) return 0
          return a.discovered ? -1 : 1
        case 'number':
        default:
          return 0 // Keep original order
      }
    })

    return filtered
  }, [entries, selectedCategory, searchQuery, sortBy])

  const stats = useMemo(() => {
    const total = entries.length
    const discovered = entries.filter(e => e.discovered).length
    const percentage = total > 0 ? Math.round((discovered / total) * 100) : 0

    return { total, discovered, percentage }
  }, [entries])

  const getRarityStars = (rarity: number) => {
    return '⭐'.repeat(rarity)
  }

  const getRarityColor = (rarity: number) => {
    switch (rarity) {
      case 1: return 'text-gray-400'
      case 2: return 'text-green-400'
      case 3: return 'text-blue-400'
      case 4: return 'text-purple-400'
      case 5: return 'text-yellow-400'
      default: return 'text-gray-400'
    }
  }

  const quickCategories: Array<{ value: FishDexCategory; label: string }> = [
    { value: 'all', label: 'Alle' },
    { value: 'freshwater', label: 'Süßwasser' },
    { value: 'saltwater', label: 'Salzwasser' },
    { value: 'predator', label: 'Raubfische' },
    { value: 'peaceful', label: 'Friedfische' },
  ]

  const collectionStats = useMemo(() => {
    const sets = [
      { key: 'freshwater', label: 'Süßwasser' },
      { key: 'saltwater', label: 'Salzwasser' },
      { key: 'predator', label: 'Raubfische' },
      { key: 'peaceful', label: 'Friedfische' },
    ] as const

    return sets.map((set) => {
      const total = entries.filter(e => {
        const info = getSpeciesInfo({ scientificName: e.scientific_name, germanName: e.name })
        if (set.key === 'freshwater') {
          if (info?.wasser) return info.wasser.includes('süßwasser')
          return e.habitat === 'freshwater'
        }
        if (set.key === 'saltwater') {
          if (info?.wasser) return info.wasser.includes('salzwasser')
          return e.habitat === 'saltwater'
        }
        if (set.key === 'predator') {
          if (info?.typ) return info.typ === 'raubfisch'
          return ['Hecht', 'Zander', 'Barsch', 'Wels'].includes(e.name)
        }
        if (set.key === 'peaceful') {
          if (info?.typ) return info.typ === 'friedfisch'
          return ['Karpfen', 'Brassen', 'Rotauge', 'Schleie'].includes(e.name)
        }
        return false
      }).length

      const discovered = entries.filter(e => e.discovered).filter(e => {
        const info = getSpeciesInfo({ scientificName: e.scientific_name, germanName: e.name })
        if (set.key === 'freshwater') {
          if (info?.wasser) return info.wasser.includes('süßwasser')
          return e.habitat === 'freshwater'
        }
        if (set.key === 'saltwater') {
          if (info?.wasser) return info.wasser.includes('salzwasser')
          return e.habitat === 'saltwater'
        }
        if (set.key === 'predator') {
          if (info?.typ) return info.typ === 'raubfisch'
          return ['Hecht', 'Zander', 'Barsch', 'Wels'].includes(e.name)
        }
        if (set.key === 'peaceful') {
          if (info?.typ) return info.typ === 'friedfisch'
          return ['Karpfen', 'Brassen', 'Rotauge', 'Schleie'].includes(e.name)
        }
        return false
      }).length

      const percentage = total > 0 ? Math.round((discovered / total) * 100) : 0

      return { label: set.label, total, discovered, percentage }
    })
  }, [entries])

  const globalIndexMap = useMemo(() => {
    const map = new Map<string, number>()
    entries.forEach((entry, idx) => {
      map.set(entry.id, idx + 1)
    })
    return map
  }, [entries])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-ocean-light">Lade FishDex...</div>
      </div>
    )
  }

  return (
    <div className="space-y-6 pb-20 md:pb-6">
      {/* Header */}
      <div className="bg-ocean/30 backdrop-blur-sm rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold text-white flex items-center gap-3">
              <BookOpen className="w-10 h-10 text-ocean-light" />
              FishDex
            </h1>
            <p className="text-ocean-light mt-1">
              Entdecke und sammle alle Fischarten!
            </p>
          </div>
          <Link
            href="/fishdex/achievements"
            className="px-4 py-2 bg-ocean hover:bg-ocean-light text-white rounded-lg transition-colors flex items-center gap-2"
          >
            <Trophy className="w-4 h-4" />
            <span className="hidden sm:inline">Erfolge</span>
          </Link>
        </div>

        {/* Progress Bar */}
        <div className="mb-4">
          <div className="flex items-center justify-between text-sm mb-2">
            <span className="text-white font-semibold">
              {selectedRegion === 'deutschland' && 'Deutschland'}
              {selectedRegion === 'europa' && 'Europa'}
              {selectedRegion === 'weltweit' && 'Weltweit'}
            </span>
            <span className="text-ocean-light">
              {stats.discovered}/{stats.total} ({stats.percentage}%)
            </span>
          </div>
          <div className="w-full bg-ocean-dark rounded-full h-3 overflow-hidden">
            <div
              className="bg-gradient-to-r from-ocean-light to-ocean h-full transition-all duration-500"
              style={{ width: `${stats.percentage}%` }}
            />
          </div>
        </div>

        {/* Filters */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Region */}
          <select
            value={selectedRegion}
            onChange={(e) => setSelectedRegion(e.target.value as FishDexRegion)}
            className="px-4 py-2 rounded-lg bg-ocean-dark text-white border border-ocean-light/30 focus:border-ocean-light focus:outline-none"
          >
            <option value="deutschland">Deutschland</option>
            <option value="europa">Europa</option>
            <option value="weltweit">Weltweit</option>
          </select>

          {/* Sort */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as FishDexSortBy)}
            className="px-4 py-2 rounded-lg bg-ocean-dark text-white border border-ocean-light/30 focus:border-ocean-light focus:outline-none"
          >
            <option value="number">Nach Nummer</option>
            <option value="name">Nach Name</option>
            <option value="rarity">Nach Seltenheit</option>
            <option value="discovered">Entdeckt zuerst</option>
          </select>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ocean-light" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Suchen..."
              className="w-full pl-10 pr-4 py-2 rounded-lg bg-ocean-dark text-white border border-ocean-light/30 focus:border-ocean-light focus:outline-none"
            />
          </div>

          {/* Discovered Toggle */}
          <button
            type="button"
            onClick={() => setOnlyDiscovered(prev => !prev)}
            className={`px-4 py-2 rounded-lg border transition-colors text-sm ${
              onlyDiscovered
                ? 'bg-green-900/40 border-green-500/40 text-green-300'
                : 'bg-ocean-dark border-ocean-light/30 text-ocean-light hover:text-white'
            }`}
          >
            {onlyDiscovered ? 'Nur entdeckte' : 'Alle & Entdeckte'}
          </button>
        </div>

        {/* Quick Category Chips */}
        <div className="flex flex-wrap gap-2 mt-4">
          {quickCategories.map((cat) => (
            <button
              key={cat.value}
              onClick={() => setSelectedCategory(cat.value)}
              className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${
                selectedCategory === cat.value
                  ? 'bg-ocean text-white border-ocean-light'
                  : 'bg-ocean-dark/50 text-ocean-light border-ocean-light/30 hover:text-white'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Collections */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {collectionStats.map((set) => (
          <div key={set.label} className="bg-ocean/30 backdrop-blur-sm rounded-xl p-4">
            <div className="text-white font-semibold mb-2">{set.label}</div>
            <div className="text-ocean-light text-sm mb-2">
              {set.discovered}/{set.total} ({set.percentage}%)
            </div>
            <div className="w-full bg-ocean-dark rounded-full h-2 overflow-hidden">
              <div
                className="bg-gradient-to-r from-ocean-light to-ocean h-full"
                style={{ width: `${set.percentage}%` }}
              />
            </div>
          </div>
        ))}
      </div>

      {/* Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
        {filteredEntries.map((entry) => (
          <Link
            key={entry.id}
            href={`/fishdex/${entry.id}`}
            className={`
              relative aspect-square rounded-xl overflow-hidden
              transition-all duration-300 hover:scale-105 hover:shadow-xl
              ${entry.discovered
                ? 'bg-ocean/30 backdrop-blur-sm'
                : 'bg-ocean-dark/50'
              }
            `}
          >
            {/* Number Badge */}
            <div className="absolute top-2 left-2 bg-ocean-deeper/80 backdrop-blur-sm px-2 py-1 rounded-full text-xs font-bold text-white z-10">
              #{String(globalIndexMap.get(entry.id) || 0).padStart(3, '0')}
            </div>

            {/* Rarity Badge */}
            {(() => {
              const rarity = getSpeciesRarity({
                scientificName: entry.scientific_name,
                germanName: entry.name,
                fallback: entry.rarity,
              })
              return (
                <div className={`absolute top-2 right-2 ${getRarityColor(rarity)} z-10 text-xs`}>
                  {getRarityStars(rarity)}
                </div>
              )
            })()}

            {/* Image */}
            <div className="w-full h-full relative">
              {entry.discovered ? (
                entry.image_url ? (
                  <Image
                    src={entry.image_url}
                    alt={entry.name}
                    fill
                    sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 20vw"
                    className="object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-ocean-dark/30">
                    <Fish className="w-16 h-16 text-ocean-light" />
                  </div>
                )
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-ocean-dark/30">
                  <Lock className="w-16 h-16 text-gray-600" />
                </div>
              )}
            </div>

            {/* Name */}
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-3">
              <div className={`text-sm font-bold text-center ${
                entry.discovered ? 'text-white' : 'text-gray-400'
              }`}>
                {entry.discovered ? entry.name : '???'}
              </div>
              {entry.discovered && entry.userProgress && (
                <div className="text-xs text-ocean-light text-center mt-1">
                  {entry.userProgress.total_caught}x gefangen
                </div>
              )}
            </div>
          </Link>
        ))}
      </div>

      {/* Empty State */}
      {filteredEntries.length === 0 && (
        <div className="bg-ocean/30 backdrop-blur-sm rounded-xl p-12 text-center">
          <Search className="w-16 h-16 text-ocean-light mx-auto mb-4" />
          <h3 className="text-xl font-bold text-white mb-2">
            Keine Ergebnisse
          </h3>
          <p className="text-ocean-light">
            Versuche andere Filter oder Suchbegriffe.
          </p>
        </div>
      )}
    </div>
  )
}
