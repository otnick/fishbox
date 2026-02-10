/* eslint-disable no-console */
const fs = require('fs')
const path = require('path')
const { createClient } = require('@supabase/supabase-js')

const args = process.argv.slice(2)
const shouldConfirm = args.includes('--confirm')
const shouldPrune = args.includes('--prune')
const shouldDedupe = args.includes('--dedupe')
const tableArg = args.find((a) => a.startsWith('--table='))
const tableName = tableArg ? tableArg.split('=')[1] : 'fish_species'

const DEFAULT_REGION = 'weltweit'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || ""
const SERVICE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_SERVICE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('Missing SUPABASE env vars.')
  console.error('Required: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const infoPath = path.join(__dirname, '..', 'public', 'fish', 'species_info.json')
const speciesInfo = JSON.parse(fs.readFileSync(infoPath, 'utf8'))

function normalizeName(name) {
  const fixed = String(name || '')
    // Fix common mis-encodings first
    .replace(/\u00c3\u00a4/g, '\u00e4')
    .replace(/\u00c3\u00b6/g, '\u00f6')
    .replace(/\u00c3\u00bc/g, '\u00fc')
    .replace(/\u00c3\u009f/g, '\u00df')
  return fixed
    .toLowerCase()
    .replace(/\u00e4/g, 'ae')
    .replace(/\u00f6/g, 'oe')
    .replace(/\u00fc/g, 'ue')
    .replace(/\u00df/g, 'ss')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function toHabitat(wasser) {
  const waters = Array.isArray(wasser) ? wasser : []
  const hasFresh = waters.includes('süßwasser') || waters.includes('s\u00c3\u00bc\u00c3\u009fwasser')
  const hasSalt = waters.includes('salzwasser')
  if (hasFresh && hasSalt) return 'brackish'
  if (hasFresh) return 'freshwater'
  if (hasSalt) return 'saltwater'
  return null
}

function toRarity(schwierigkeit) {
  if (typeof schwierigkeit !== 'number' || Number.isNaN(schwierigkeit)) return null
  if (schwierigkeit < 1) return 1
  if (schwierigkeit > 5) return 5
  return schwierigkeit
}

function toBestTime(tageszeit) {
  if (!Array.isArray(tageszeit) || tageszeit.length === 0) return null
  return tageszeit.join(', ')
}

function toBaits(koeder) {
  if (!Array.isArray(koeder) || koeder.length === 0) return null
  return koeder
}

function expandRegions(regions) {
  const set = new Set(regions)
  if (set.has('deutschland')) {
    set.add('europa')
    set.add('weltweit')
  }
  if (set.has('europa')) {
    set.add('weltweit')
  }
  return Array.from(set)
}

function toRegions(region) {
  let regions = []
  if (Array.isArray(region) && region.length > 0) {
    regions = region
  } else if (typeof region === 'string' && region.trim()) {
    regions = [region.trim()]
  } else {
    regions = [DEFAULT_REGION]
  }
  return expandRegions(regions)
}

function arraysEqual(a, b) {
  if (!Array.isArray(a) && !Array.isArray(b)) return true
  if (!Array.isArray(a) || !Array.isArray(b)) return false
  if (a.length !== b.length) return false
  const aSorted = [...a].sort()
  const bSorted = [...b].sort()
  return aSorted.every((val, idx) => val === bSorted[idx])
}

function scoreRow(row) {
  let score = 0
  if (Array.isArray(row.region)) {
    if (row.region.includes('deutschland')) score += 5
    if (row.region.includes('europa')) score += 2
  }
  if (row.rarity) score += 1
  if (row.habitat) score += 1
  if (row.best_time) score += 1
  if (Array.isArray(row.baits)) score += row.baits.length * 0.1
  return score
}

function scoreDbRow(row) {
  let score = 0
  if (Array.isArray(row.region)) {
    if (row.region.includes('deutschland')) score += 5
    if (row.region.includes('europa')) score += 2
  }
  if (row.rarity !== null && row.rarity !== undefined) score += 1
  if (row.habitat) score += 1
  if (row.best_time) score += 1
  if (Array.isArray(row.baits)) score += row.baits.length * 0.1
  return score
}

const rawRows = Object.entries(speciesInfo).map(([latin, info]) => {
  const rarity = toRarity(info.schwierigkeit)
  const regions = toRegions(info.region)
  return {
    scientific_name: latin,
    name: info.name_de,
    rarity,
    habitat: toHabitat(info.wasser),
    baits: toBaits(info['k\u00f6der'] || info['k\u00c3\u00b6der']),
    best_time: toBestTime(info.tageszeit),
    region: regions,
  }
}).filter((row) => row.name && row.rarity)

// De-duplicate by German name (prefer DE/EU, then most complete)
const byGermanKey = new Map()
for (const row of rawRows) {
  const key = normalizeName(row.name)
  const existing = byGermanKey.get(key)
  if (!existing) {
    byGermanKey.set(key, row)
    continue
  }
  const existingScore = scoreRow(existing)
  const rowScore = scoreRow(row)
  if (rowScore > existingScore) {
    byGermanKey.set(key, row)
  }
}

const sourceRows = Array.from(byGermanKey.values())

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { persistSession: false },
})

async function run() {
  console.log(`Table: ${tableName}`)
  console.log(`Mode: ${shouldConfirm ? 'UPDATE/INSERT' : 'DRY-RUN'}`)
  console.log(`Prune stale rows: ${shouldPrune ? 'YES' : 'NO'}`)
  console.log(`Dedupe by name: ${shouldDedupe ? 'YES' : 'NO'}`)
  console.log(`Region default for missing: ${DEFAULT_REGION}`)

  const { data: rows, error } = await supabase
    .from(tableName)
    .select('id, name, scientific_name, region, rarity, habitat, baits, best_time')

  if (error) {
    console.error('Failed to read table:', error.message)
    process.exit(1)
  }

  const byScientific = new Map()
  const byGerman = new Map()

  for (const row of rows || []) {
    if (row.scientific_name) {
      byScientific.set(String(row.scientific_name).toLowerCase(), row)
    }
    if (row.name) {
      byGerman.set(normalizeName(String(row.name)), row)
    }
  }

  const toInsert = []
  const toUpdate = []
  const sourceScientific = new Set(
    sourceRows
      .map((r) => String(r.scientific_name || '').toLowerCase().trim())
      .filter(Boolean)
  )
  const sourceGerman = new Set(
    sourceRows
      .map((r) => normalizeName(r.name))
      .filter(Boolean)
  )

  for (const src of sourceRows) {
    const scientificKey = src.scientific_name.toLowerCase()
    const germanKey = normalizeName(src.name)
    const existing = byScientific.get(scientificKey) || byGerman.get(germanKey)

    if (!existing) {
      toInsert.push({
        name: src.name,
        scientific_name: src.scientific_name,
        region: src.region,
        rarity: src.rarity,
        habitat: src.habitat,
        baits: src.baits,
        best_time: src.best_time,
      })
      continue
    }

    const changes = {}

    if (existing.rarity !== src.rarity) changes.rarity = src.rarity
    if ((existing.habitat || null) !== (src.habitat || null)) changes.habitat = src.habitat
    if (!arraysEqual(existing.baits, src.baits)) changes.baits = src.baits
    if ((existing.best_time || null) !== (src.best_time || null)) changes.best_time = src.best_time
    if (!arraysEqual(existing.region, src.region)) changes.region = src.region

    if (Object.keys(changes).length > 0) {
      toUpdate.push({ id: existing.id, changes })
    }
  }

  console.log(`To insert: ${toInsert.length}`)
  console.log(`To update: ${toUpdate.length}`)

  let toDelete = []
  if (shouldPrune) {
    toDelete = (rows || []).filter((row) => {
      const scientificKey = String(row.scientific_name || '').toLowerCase().trim()
      const germanKey = normalizeName(row.name || '')
      const keepByScientific = scientificKey && sourceScientific.has(scientificKey)
      const keepByGerman = germanKey && sourceGerman.has(germanKey)
      return !keepByScientific && !keepByGerman
    })
    console.log(`To delete (stale): ${toDelete.length}`)
  }

  let toDeleteDedupe = []
  if (shouldDedupe) {
    const byName = new Map()
    for (const row of rows || []) {
      const key = normalizeName(row.name || '')
      if (!key) continue
      const list = byName.get(key) || []
      list.push(row)
      byName.set(key, list)
    }

    for (const list of byName.values()) {
      if (list.length <= 1) continue
      list.sort((a, b) => {
        const scoreDiff = scoreDbRow(b) - scoreDbRow(a)
        if (scoreDiff !== 0) return scoreDiff
        const aId = String(a.id || '')
        const bId = String(b.id || '')
        return aId.localeCompare(bId)
      })
      const extras = list.slice(1)
      toDeleteDedupe.push(...extras)
    }

    console.log(`To delete (dedupe): ${toDeleteDedupe.length}`)
  }

  if (!shouldConfirm) {
    console.log('Dry-run sample inserts (first 5):')
    console.log(toInsert.slice(0, 5))
    console.log('Dry-run sample updates (first 5):')
    console.log(toUpdate.slice(0, 5))
    if (shouldPrune) {
      console.log('Dry-run sample deletes (first 5):')
      console.log(
        toDelete.slice(0, 5).map((r) => ({
          id: r.id,
          scientific_name: r.scientific_name,
          name: r.name,
        }))
      )
    }
    if (shouldDedupe) {
      console.log('Dry-run sample dedupe deletes (first 5):')
      console.log(
        toDeleteDedupe.slice(0, 5).map((r) => ({
          id: r.id,
          scientific_name: r.scientific_name,
          name: r.name,
        }))
      )
    }
    console.log('Run with --confirm to apply.')
    return
  }

  if (toInsert.length > 0) {
    const chunkSize = 200
    let inserted = 0
    for (let i = 0; i < toInsert.length; i += chunkSize) {
      const chunk = toInsert.slice(i, i + chunkSize)
      const { error: insertError } = await supabase
        .from(tableName)
        .insert(chunk)

      if (insertError) {
        console.error('Insert failed:', insertError.message)
        process.exit(1)
      }

      inserted += chunk.length
      console.log(`Inserted ${inserted}/${toInsert.length}`)
    }
  }

  if (toUpdate.length > 0) {
    let updated = 0
    for (const row of toUpdate) {
      const { error: updateError } = await supabase
        .from(tableName)
        .update(row.changes)
        .eq('id', row.id)

      if (updateError) {
        console.error('Update failed:', updateError.message)
        process.exit(1)
      }

      updated += 1
      if (updated % 50 === 0 || updated === toUpdate.length) {
        console.log(`Updated ${updated}/${toUpdate.length}`)
      }
    }
  }

  if (shouldPrune && toDelete.length > 0) {
    const chunkSize = 200
    let deleted = 0
    const ids = toDelete.map((r) => r.id)
    for (let i = 0; i < ids.length; i += chunkSize) {
      const chunk = ids.slice(i, i + chunkSize)
      const { error: deleteError } = await supabase
        .from(tableName)
        .delete()
        .in('id', chunk)

      if (deleteError) {
        console.error('Delete failed:', deleteError.message)
        process.exit(1)
      }

      deleted += chunk.length
      console.log(`Deleted ${deleted}/${ids.length}`)
    }
  }

  if (shouldDedupe && toDeleteDedupe.length > 0) {
    const chunkSize = 200
    let deleted = 0
    const ids = toDeleteDedupe.map((r) => r.id)
    for (let i = 0; i < ids.length; i += chunkSize) {
      const chunk = ids.slice(i, i + chunkSize)
      const { error: deleteError } = await supabase
        .from(tableName)
        .delete()
        .in('id', chunk)

      if (deleteError) {
        console.error('Dedupe delete failed:', deleteError.message)
        process.exit(1)
      }

      deleted += chunk.length
      console.log(`Deleted dedupe ${deleted}/${ids.length}`)
    }
  }

  console.log('Done.')
}

run().catch((err) => {
  console.error(err)
  process.exit(1)
})
