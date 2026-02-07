'use client'

import { useState, useMemo } from 'react'
import CatchForm from '@/components/CatchForm'
import CatchList from '@/components/CatchList'
import { useCatchStore } from '@/lib/store'
import { Fish } from 'lucide-react'

export default function CatchesPage() {
  const [showForm, setShowForm] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterSpecies, setFilterSpecies] = useState('all')
  const [sortBy, setSortBy] = useState<'date' | 'length' | 'weight'>('date')
  const catches = useCatchStore((state) => state.catches)

  // Get unique species for filter
  const species = useMemo(() => {
    const uniqueSpecies = [...new Set(catches.map(c => c.species))].sort()
    return uniqueSpecies
  }, [catches])

  // Filter and sort catches
  const filteredCatches = useMemo(() => {
    let filtered = [...catches]

    // Search
    if (searchTerm) {
      filtered = filtered.filter(c =>
        c.species.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.location?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.bait?.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    // Filter by species
    if (filterSpecies !== 'all') {
      filtered = filtered.filter(c => c.species === filterSpecies)
    }

    // Sort
    filtered.sort((a, b) => {
      if (sortBy === 'date') {
        return new Date(b.date).getTime() - new Date(a.date).getTime()
      } else if (sortBy === 'length') {
        return b.length - a.length
      } else if (sortBy === 'weight') {
        return (b.weight || 0) - (a.weight || 0)
      }
      return 0
    })

    return filtered
  }, [catches, searchTerm, filterSpecies, sortBy])

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            <Fish className="w-8 h-8 text-ocean-light" />
            Meine Fänge
          </h1>
          <p className="text-ocean-light mt-1">{catches.length} Fänge insgesamt</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="w-full sm:w-auto bg-ocean hover:bg-ocean-light text-white font-bold py-3 px-6 rounded-lg transition-colors shadow-lg"
        >
          {showForm ? 'Abbrechen' : '+ Neuer Fang'}
        </button>
      </div>

      {/* Add Catch Form */}
      {showForm && (
        <div className="animate-fadeIn">
          <CatchForm onSuccess={() => setShowForm(false)} />
        </div>
      )}

      {/* Filters */}
      {!showForm && catches.length > 0 && (
        <div className="bg-ocean/30 backdrop-blur-sm rounded-lg p-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Search */}
            <div>
              <label className="block text-ocean-light text-sm mb-2">Suche</label>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Art, Ort, Köder..."
                className="w-full px-4 py-2 rounded-lg bg-ocean-dark text-white border border-ocean-light/30 focus:border-ocean-light focus:outline-none"
              />
            </div>

            {/* Filter by Species */}
            <div>
              <label className="block text-ocean-light text-sm mb-2">Fischart</label>
              <select
                value={filterSpecies}
                onChange={(e) => setFilterSpecies(e.target.value)}
                className="w-full px-4 py-2 rounded-lg bg-ocean-dark text-white border border-ocean-light/30 focus:border-ocean-light focus:outline-none"
              >
                <option value="all">Alle Arten</option>
                {species.map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>

            {/* Sort */}
            <div>
              <label className="block text-ocean-light text-sm mb-2">Sortierung</label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="w-full px-4 py-2 rounded-lg bg-ocean-dark text-white border border-ocean-light/30 focus:border-ocean-light focus:outline-none"
              >
                <option value="date">Neueste zuerst</option>
                <option value="length">Größte zuerst</option>
                <option value="weight">Schwerste zuerst</option>
              </select>
            </div>
          </div>

          {/* Results count */}
          {filteredCatches.length !== catches.length && (
            <div className="mt-4 text-ocean-light text-sm">
              {filteredCatches.length} von {catches.length} Fängen
              {searchTerm || filterSpecies !== 'all' ? (
                <button
                  onClick={() => {
                    setSearchTerm('')
                    setFilterSpecies('all')
                  }}
                  className="ml-2 text-white hover:underline"
                >
                  Filter zurücksetzen
                </button>
              ) : null}
            </div>
          )}
        </div>
      )}

      {/* Catch List */}
      {!showForm && (
        <div>
          <CatchList catches={filteredCatches} />
        </div>
      )}
    </div>
  )
}
