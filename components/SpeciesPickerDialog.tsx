'use client'

import { useMemo, useState } from 'react'
import { X, Search } from 'lucide-react'
import type { FishType, WaterType } from '@/lib/utils/fishSpeciesGroups'
import { getSpeciesTags, normalizeSpeciesName } from '@/lib/utils/fishSpeciesGroups'

interface SpeciesPickerDialogProps {
  embedded?: boolean
  isOpen: boolean
  species: string[]
  selected?: string
  onSelect: (species: string) => void
  onClose: () => void
}

type WaterFilter = 'all' | 'fresh' | 'salt'
type TypeFilter = 'all' | 'predator' | 'peace'

const WATER_LABELS: Record<WaterFilter, string> = {
  all: 'Alle',
  fresh: 'Süßwasser',
  salt: 'Salzwasser',
}

const TYPE_LABELS: Record<TypeFilter, string> = {
  all: 'Alle',
  predator: 'Raubfisch',
  peace: 'Friedfisch',
}

function matchesWater(tags: { water?: WaterType } | undefined, filter: WaterFilter) {
  if (filter === 'all') return true
  if (!tags?.water) return false
  if (tags.water === 'both') return true
  return tags.water === filter
}

function matchesType(tags: { type?: FishType } | undefined, filter: TypeFilter) {
  if (filter === 'all') return true
  if (!tags?.type) return false
  return tags.type === filter
}

export default function SpeciesPickerDialog({
  embedded = false,
  isOpen,
  species,
  selected,
  onSelect,
  onClose,
}: SpeciesPickerDialogProps) {
  const [search, setSearch] = useState('')
  const [waterFilter, setWaterFilter] = useState<WaterFilter>('all')
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all')

  const filteredSpecies = useMemo(() => {
    const query = normalizeSpeciesName(search)
    return species.filter((name) => {
      if (name === 'Andere') return false
      const tags = getSpeciesTags(name)
      if (!matchesWater(tags, waterFilter)) return false
      if (!matchesType(tags, typeFilter)) return false
      if (!query) return true
      const normalized = normalizeSpeciesName(name)
      return normalized.includes(query)
    })
  }, [species, search, waterFilter, typeFilter])

  if (!isOpen) return null

  return (
    <div
      className={
        embedded
          ? 'absolute inset-0 z-30 bg-black/75 backdrop-blur-sm rounded-2xl p-0 overflow-hidden animate-catchSubOverlayIn'
          : 'fixed inset-0 bg-black/92 z-[70] flex items-end sm:items-center justify-center p-2 pt-3 pb-[calc(env(safe-area-inset-bottom)+4.75rem)] sm:p-4'
      }
    >
      <div
        className={
          embedded
            ? 'bg-ocean/30 backdrop-blur-sm rounded-2xl w-full h-full p-4 sm:p-6 overflow-x-hidden overflow-y-auto overscroll-contain break-words animate-catchSubModalIn'
            : 'bg-ocean/30 backdrop-blur-sm rounded-xl max-w-3xl w-full p-4 sm:p-6 max-h-[82dvh] sm:max-h-[92vh] overflow-x-hidden overflow-y-auto break-words'
        }
      >
        <div className="flex items-start justify-between gap-4 mb-4">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-white">Fischart auswählen</h2>
            <p className="text-ocean-light text-sm">Filtere zuerst nach Gewässertyp, dann nach Artgruppe</p>
          </div>
          <button
            onClick={onClose}
            className="text-ocean-light hover:text-white transition-colors"
            aria-label="Schließen"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
          <div className="bg-ocean-dark/50 rounded-lg p-2">
            <div className="text-ocean-light text-xs mb-2">Gewässer</div>
            <div className="flex flex-wrap gap-2">
              {(['all', 'fresh', 'salt'] as WaterFilter[]).map((filter) => (
                <button
                  key={filter}
                  onClick={() => setWaterFilter(filter)}
                  className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
                    waterFilter === filter
                      ? 'bg-ocean text-white'
                      : 'bg-ocean-dark/60 text-ocean-light hover:text-white'
                  }`}
                >
                  {WATER_LABELS[filter]}
                </button>
              ))}
            </div>
          </div>
          <div className="bg-ocean-dark/50 rounded-lg p-2">
            <div className="text-ocean-light text-xs mb-2">Gruppe</div>
            <div className="flex flex-wrap gap-2">
              {(['all', 'predator', 'peace'] as TypeFilter[]).map((filter) => (
                <button
                  key={filter}
                  onClick={() => setTypeFilter(filter)}
                  className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
                    typeFilter === filter
                      ? 'bg-ocean text-white'
                      : 'bg-ocean-dark/60 text-ocean-light hover:text-white'
                  }`}
                >
                  {TYPE_LABELS[filter]}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-ocean-light w-4 h-4" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Suche nach Art..."
            className="w-full pl-10 pr-3 py-2 rounded-lg bg-ocean-dark text-white border border-ocean-light/30 focus:border-ocean-light focus:outline-none"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <button
            onClick={() => {
              onSelect('Andere')
              onClose()
            }}
            className={`text-left px-3 py-2 rounded-lg border transition-colors ${
              selected === 'Andere'
                ? 'bg-ocean border-ocean-light text-white'
                : 'bg-ocean-dark/50 border-transparent text-ocean-light hover:border-ocean-light/40 hover:text-white'
            }`}
          >
            Andere
          </button>
          {filteredSpecies.map((name) => (
            <button
              key={name}
              onClick={() => {
                onSelect(name)
                onClose()
              }}
              className={`text-left px-3 py-2 rounded-lg border transition-colors ${
                selected === name
                  ? 'bg-ocean border-ocean-light text-white'
                  : 'bg-ocean-dark/50 border-transparent text-ocean-light hover:border-ocean-light/40 hover:text-white'
              }`}
            >
              {name}
            </button>
          ))}
        </div>

        {filteredSpecies.length === 0 && (
          <div className="text-ocean-light text-sm bg-ocean-dark/40 rounded-lg p-4 mt-3">
            Keine Treffer mit den aktuellen Filtern. Setze die Filter zurück oder suche nach einem anderen Begriff.
          </div>
        )}

        <div className="text-ocean-light text-xs mt-4">
          Hinweis: Einige Arten sind noch nicht kategorisiert und erscheinen nur bei Filter &quot;Alle&quot;.
        </div>
      </div>
    </div>
  )
}
