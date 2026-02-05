import speciesInfo from '@/public/fish/species_info.json'

export type SpeciesInfo = {
  name_de?: string
  wasser?: string[]
  typ?: string
  fangmethode?: string[]
  köder?: string[]
  saison?: string[]
  gewässertyp?: string[]
  tageszeit?: string[]
  wassertemperatur?: { min?: number; max?: number }
  schwierigkeit?: number
  name_en?: string
}

const SCIENTIFIC_INDEX: Record<string, SpeciesInfo> = Object.entries(
  speciesInfo as Record<string, SpeciesInfo>
).reduce((acc, [latin, info]) => {
  acc[latin.toLowerCase()] = info
  return acc
}, {} as Record<string, SpeciesInfo>)

const GERMAN_INDEX: Record<string, SpeciesInfo> = Object.values(
  speciesInfo as Record<string, SpeciesInfo>
).reduce((acc, info) => {
  if (info?.name_de) {
    acc[normalizeSpeciesName(info.name_de)] = info
  }
  return acc
}, {} as Record<string, SpeciesInfo>)

export function normalizeSpeciesName(name: string) {
  return name
    .toLowerCase()
    .replace(/ä/g, 'ae')
    .replace(/ö/g, 'oe')
    .replace(/ü/g, 'ue')
    .replace(/ß/g, 'ss')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

export function getSpeciesInfo(params: {
  scientificName?: string | null
  germanName?: string | null
}) {
  const scientificKey = params.scientificName?.toLowerCase().trim()
  if (scientificKey && SCIENTIFIC_INDEX[scientificKey]) {
    return SCIENTIFIC_INDEX[scientificKey]
  }

  const germanKey = params.germanName ? normalizeSpeciesName(params.germanName) : undefined
  if (germanKey && GERMAN_INDEX[germanKey]) {
    return GERMAN_INDEX[germanKey]
  }

  return undefined
}

export function getSpeciesRarity(params: {
  scientificName?: string | null
  germanName?: string | null
  fallback?: number
}) {
  const info = getSpeciesInfo(params)
  const value = typeof info?.schwierigkeit === 'number' ? info.schwierigkeit : undefined
  if (typeof value === 'number' && !Number.isNaN(value)) {
    if (value < 1) return 1
    if (value > 5) return 5
    return value
  }
  if (typeof params.fallback === 'number' && !Number.isNaN(params.fallback)) {
    if (params.fallback < 1) return 1
    if (params.fallback > 5) return 5
    return params.fallback
  }
  return 1
}

export function getSpeciesSearchTokens(params: {
  scientificName?: string | null
  germanName?: string | null
}) {
  const info = getSpeciesInfo(params)
  const tokens = new Set()

  if (params.scientificName) tokens.add(normalizeSpeciesName(params.scientificName))
  if (params.germanName) tokens.add(normalizeSpeciesName(params.germanName))
  if (info?.name_de) tokens.add(normalizeSpeciesName(info.name_de))
  if (info?.name_en) tokens.add(normalizeSpeciesName(info.name_en))

  return Array.from(tokens).filter(Boolean)
}
