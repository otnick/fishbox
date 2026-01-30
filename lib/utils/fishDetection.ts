// lib/utils/fishDetection.ts
import { supabase } from '@/lib/supabase'

export interface FishDetectionResult {
  species: string
  accuracy: number
  scientific_name?: string
  species_id?: string
  raw?: any
}

export interface DetectionResponse {
  detections: number
  results: FishDetectionResult[]
}

const API_BASE_URL =
  process.env.NEXT_PUBLIC_FISH_API_URL || 'https://fishapi.nickot.is'

const API_KEY = process.env.NEXT_PUBLIC_FISH_API_KEY

if (!API_KEY) {
  console.warn('⚠️ NEXT_PUBLIC_FISH_API_KEY is not set')
}

/**
 * Local mapping tables
 * - map common english/latin names to German catalog names
 * - add scientific name -> German fallback when possible
 *
 * Extend these maps as you discover more species.
 */
const COMMON_TO_GERMAN: Record<string, string> = {
  pike: 'Hecht',
  perch: 'Barsch',
  zander: 'Zander',
  carp: 'Karpfen',
  catfish: 'Wels',
  trout: 'Forelle',
  eel: 'Aal',
  roach: 'Rotauge',
  bream: 'Brassen',
  tench: 'Schleie',
  dace: 'Döbel',
  // add more english common names...
}

const SCIENTIFIC_TO_GERMAN: Record<string, string> = {
  'esox lucius': 'Hecht',
  'salmo salar': 'Lachs',
  'salmo trutta': 'Forelle',
  'silurus glanis': 'Wels',
  'cyprinus carpio': 'Karpfen',
  'perca fluviatilis': 'Barsch',
  'sander lucioperca': 'Zander',
  // add more latin -> german mappings as needed
}

/**
 * Normalize incoming API candidate object to FishDetectionResult
 *
 * This handles multiple response shapes:
 * - { name: "Esox lucius", distance: 0.792, species_id: "...", ... }
 * - { species: "pike", accuracy: 0.92, scientific_name: "Esox lucius" }
 *
 * We produce:
 * - species: German common name if we can map, otherwise friendly name
 * - scientific_name: if available or if name looks like latin
 * - accuracy: number 0..1 (higher = more confident)
 */
function normalizeCandidate(candidate: any): FishDetectionResult {
  // defensive copies
  const raw = candidate || {}
  // Extract possible fields
  const maybeName = (raw.species || raw.name || raw.scientific_name || '').toString().trim()
  const maybeSpeciesId = raw.species_id || raw.speciesId || raw.id
  const maybeDistance = typeof raw.distance === 'number' ? raw.distance : undefined
  const maybeAccuracy = typeof raw.accuracy === 'number' ? raw.accuracy : undefined
  const maybeScientific = raw.scientific_name || (looksLikeLatin(maybeName) ? maybeName : undefined)

  // compute accuracy:
  // - if API gives accuracy, use it (assumed 0..1)
  // - if API gives distance (smaller = better), convert: accuracy = 1 - distance (clamp)
  // - if nothing, default to 0
  let accuracy = 0
  if (typeof maybeAccuracy === 'number') {
    accuracy = clamp01(maybeAccuracy)
  } else if (typeof maybeDistance === 'number') {
    // if distance >1 maybe it's already normalized; still clamp
    accuracy = clamp01(1 - maybeDistance)
  } else {
    accuracy = 0
  }

  // Determine display species:
  // Priority:
  // 1) If scientific name is present and we have mapping -> German name
  // 2) If candidate.species (english/common) -> map to German
  // 3) If candidate.name looks like Latin -> map if available, else keep readable
  // 4) fallback: normalized original name or "Andere"
  let species = 'Andere'
  if (maybeScientific) {
    const key = maybeScientific.toString().toLowerCase()
    species = SCIENTIFIC_TO_GERMAN[key] || titleCase(maybeScientific)
  } else if (raw.species) {
    const key = raw.species.toString().toLowerCase()
    species = COMMON_TO_GERMAN[key] || titleCase(raw.species)
  } else if (maybeName) {
    const key = maybeName.toLowerCase()
    species = SCIENTIFIC_TO_GERMAN[key] || COMMON_TO_GERMAN[key] || titleCase(maybeName)
  }

  return {
    species,
    scientific_name: maybeScientific ? String(maybeScientific) : undefined,
    accuracy,
    species_id: maybeSpeciesId ? String(maybeSpeciesId) : undefined,
    raw,
  }
}

/* Helpers */
function clamp01(v: number) {
  if (isNaN(v)) return 0
  return Math.max(0, Math.min(1, v))
}

function titleCase(s: string) {
  return s
    .toLowerCase()
    .split(/[\s_-]+/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ')
}

function looksLikeLatin(s: string) {
  // crude heuristic: latin names typically have two parts and lowercase letters
  if (!s) return false
  const parts = s.trim().split(/\s+/)
  if (parts.length === 2 && parts[0].match(/^[A-Za-z]+$/) && parts[1].match(/^[A-Za-z]+$/)) {
    // e.g. "Esox lucius" or "esox lucius"
    return true
  }
  return false
}

/**
 * Detect fish species from image file
 * DIRECT call to Fish API, then normalize results
 */
export async function detectFishSpecies(
  file: File,
  topk: number = 3
): Promise<DetectionResponse> {
  const formData = new FormData()
  formData.append('file', file)

  const resp = await fetch(`${API_BASE_URL}/predict?topk=${topk}`, {
    method: 'POST',
    headers: {
      'X-API-Key': API_KEY!,
    },
    body: formData,
  })

  if (!resp.ok) {
    const text = await resp.text()
    throw new Error(`Fish detection failed (${resp.status}): ${text}`)
  }

  const json = await resp.json().catch(() => null)
  if (!json) {
    throw new Error('Empty or invalid JSON response from fish API')
  }

  // Expecting shape: { detections: number, results: [ ... ] }
  const rawResults = Array.isArray(json.results) ? json.results : []
  const normalized = rawResults.map((r: any) => normalizeCandidate(r))

  // sort by accuracy desc
  normalized.sort((a: FishDetectionResult, b: FishDetectionResult) => b.accuracy - a.accuracy)

  return {
    detections: Number(json.detections || normalized.length || 0),
    results: normalized.slice(0, topk),
  }
}

/**
 * Detect fish species from image URL (server-side endpoint)
 * Note: API provides /predict_url which expects JSON body { url, topk }
 */
export async function detectFishSpeciesFromUrl(
  url: string,
  topk: number = 3
): Promise<DetectionResponse> {
  const resp = await fetch(`${API_BASE_URL}/predict_url`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': API_KEY!,
    },
    body: JSON.stringify({ url, topk }),
  })

  if (!resp.ok) {
    const text = await resp.text()
    throw new Error(`Fish detection failed (${resp.status}): ${text}`)
  }

  const json = await resp.json().catch(() => null)
  if (!json) throw new Error('Empty or invalid JSON response from fish API')

  const rawResults = Array.isArray(json.results) ? json.results : []
  const normalized = rawResults.map((r: any) => normalizeCandidate(r))
  normalized.sort((a: FishDetectionResult, b: FishDetectionResult) => b.accuracy - a.accuracy)

  return {
    detections: Number(json.detections || normalized.length || 0),
    results: normalized.slice(0, topk),
  }
}

/**
 * Map AI species name to database species name (keeps backwards compat)
 */
export function mapSpeciesToDatabase(aiSpecies: string): string {
  const mapping: Record<string, string> = {
    pike: 'Hecht',
    perch: 'Barsch',
    zander: 'Zander',
    carp: 'Karpfen',
    catfish: 'Wels',
    trout: 'Forelle',
    eel: 'Aal',
    roach: 'Rotauge',
    bream: 'Brassen',
    tench: 'Schleie',
    dace: 'Döbel',
  }

  const normalized = aiSpecies.toLowerCase().trim()
  return mapping[normalized] || aiSpecies
}
