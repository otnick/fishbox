'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useCatchStore } from '@/lib/store'
import { format } from 'date-fns'
import { de } from 'date-fns/locale'
import { Image as ImageIcon, Calendar, Fish, Filter, Download, Star } from 'lucide-react'
import EmptyState from '@/components/EmptyState'
import FilterBar from '@/components/FilterBar'
import dynamic from 'next/dynamic'
import { useConfirm } from '@/components/ConfirmDialogProvider'

const PhotoLightbox = dynamic(() => import('@/components/PhotoLightbox'), { ssr: false })

interface GalleryPhoto {
  id: string
  url: string
  species: string
  length: number
  date: string
  catchId: string
  isShiny: boolean
  shinyReason?: string | null
}

export default function GalleryPage() {
  const { catches } = useCatchStore()
  const [photos, setPhotos] = useState<GalleryPhoto[]>([])
  const [filteredPhotos, setFilteredPhotos] = useState<GalleryPhoto[]>([])
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null)
  const [filterSpecies, setFilterSpecies] = useState<string>('all')
  const [filterShiny, setFilterShiny] = useState(false)
  const [sortBy, setSortBy] = useState<'date' | 'species'>('date')
  const [loading, setLoading] = useState(true)
  const { confirm } = useConfirm()

  useEffect(() => {
    loadPhotos()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [catches])

  useEffect(() => {
    applyFilters()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [photos, filterSpecies, sortBy, filterShiny])

  const loadPhotos = () => {
    const allPhotos: GalleryPhoto[] = catches
      .filter(c => c.photo)
      .map(c => ({
        id: c.id,
        url: c.photo!,
        species: c.species,
        length: c.length,
        date: typeof c.date === 'string' ? c.date : c.date.toISOString(),
        catchId: c.id,
        isShiny: !!c.is_shiny,
        shinyReason: c.shiny_reason || null,
      }))

    setPhotos(allPhotos)
    setLoading(false)
  }

  const applyFilters = () => {
    let filtered = [...photos]

    if (filterSpecies !== 'all') {
      filtered = filtered.filter(p => p.species === filterSpecies)
    }

    if (filterShiny) {
      filtered = filtered.filter(p => p.isShiny)
    }

    if (sortBy === 'date') {
      filtered.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    } else {
      filtered.sort((a, b) => a.species.localeCompare(b.species))
    }

    setFilteredPhotos(filtered)
  }

  const downloadAll = async () => {
    const confirmed = await confirm({
      title: 'Fotos herunterladen?',
      message: `${filteredPhotos.length} Fotos herunterladen?`,
      confirmLabel: 'Herunterladen',
      cancelLabel: 'Abbrechen',
    })
    if (confirmed) {
      for (const photo of filteredPhotos) {
        try {
          const response = await fetch(photo.url)
          const blob = await response.blob()
          const url = window.URL.createObjectURL(blob)
          const a = document.createElement('a')
          a.href = url
          a.download = `fishbox-${photo.species}-${format(new Date(photo.date), 'yyyy-MM-dd')}.jpg`
          a.click()
          window.URL.revokeObjectURL(url)
          await new Promise(resolve => setTimeout(resolve, 500))
        } catch (error) {
          console.error('Download failed:', error)
        }
      }
    }
  }

  const uniqueSpecies = [...new Set(photos.map(p => p.species))].sort()

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="bg-ocean/30 backdrop-blur-sm rounded-xl p-12 text-center">
          <div className="text-ocean-light">Lade Galerie...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            <ImageIcon className="w-8 h-8 text-ocean-light" />
            Foto-Galerie
          </h1>
          <p className="text-ocean-light mt-1">
            {filteredPhotos.length} {filteredPhotos.length === 1 ? 'Foto' : 'Fotos'}
          </p>
        </div>
        {filteredPhotos.length > 0 && (
          <button
            onClick={downloadAll}
            className="w-full sm:w-auto flex items-center justify-center gap-2 bg-ocean hover:bg-ocean-light text-white px-4 py-2 rounded-lg transition-colors text-sm"
          >
            <Download className="w-4 h-4" />
            Alle herunterladen
          </button>
        )}
      </div>

      {/* Filters */}
      {photos.length > 0 && (
        <FilterBar
          title="Filter"
          icon={Filter}
          activeFilters={[
            ...(filterSpecies !== 'all'
              ? [{ id: 'species', label: `Art: ${filterSpecies}`, onClear: () => setFilterSpecies('all') }]
              : []),
            ...(filterShiny ? [{ id: 'trophies', label: 'Trophäen', onClear: () => setFilterShiny(false) }] : []),
          ]}
          onClearAll={() => {
            setFilterSpecies('all')
            setFilterShiny(false)
          }}
          clearAllLabel="Alle Filter"
        >
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-ocean-light text-sm mb-2">Fischart</label>
              <select
                value={filterSpecies}
                onChange={(e) => setFilterSpecies(e.target.value)}
                className="w-full px-4 py-2 rounded-lg bg-ocean-dark text-white border border-ocean-light/30 focus:border-ocean-light focus:outline-none transition-all"
              >
                <option value="all">Alle Arten ({photos.length})</option>
                {uniqueSpecies.map(species => (
                  <option key={species} value={species}>
                    {species} ({photos.filter(p => p.species === species).length})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-ocean-light text-sm mb-2">Trophäen</label>
              <label className="flex items-center gap-2 bg-ocean-dark/50 border border-ocean-light/20 rounded-lg px-3 py-2 text-ocean-light">
                <input
                  type="checkbox"
                  checked={filterShiny}
                  onChange={(e) => setFilterShiny(e.target.checked)}
                  className="accent-yellow-400"
                />
                Nur Trophäen-Fotos
              </label>
            </div>

            <div>
              <label className="block text-ocean-light text-sm mb-2">Sortierung</label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as 'date' | 'species')}
                className="w-full px-4 py-2 rounded-lg bg-ocean-dark text-white border border-ocean-light/30 focus:border-ocean-light focus:outline-none transition-all"
              >
                <option value="date">Neueste zuerst</option>
                <option value="species">Nach Fischart</option>
              </select>
            </div>
          </div>
        </FilterBar>
      )}

      {/* Gallery Grid */}
      {filteredPhotos.length === 0 ? (
        <EmptyState
          icon={ImageIcon}
          title={filterSpecies !== 'all' ? `Keine ${filterSpecies}-Fotos` : 'Keine Fotos'}
          description={
            filterSpecies !== 'all'
              ? `Keine Fotos von ${filterSpecies} gefunden.`
              : 'Füge Fotos zu deinen Fängen hinzu!'
          }
          actionLabel="Fang hinzufügen"
          actionHref="/catches"
        />
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {filteredPhotos.map((photo, index) => {
            const isLegendary = photo.shinyReason === 'legendary'
            return (
            <div
              key={photo.id}
              onClick={() => setSelectedIndex(index)}
              className={`group relative aspect-square rounded-xl overflow-hidden cursor-pointer bg-ocean-dark hover:scale-105 transition-all duration-300 shadow-lg hover:shadow-2xl animate-scale-in ${
                photo.isShiny ? (isLegendary ? 'legendary-ring' : 'shiny-ring') : ''
              }`}
              style={{ animationDelay: `${index * 30}ms` }}
            >
              <Image
                src={photo.url}
                alt={photo.species}
                fill
                sizes="100vw"
            className="object-cover group-hover:scale-110 transition-transform duration-300"
              />

              {photo.isShiny && (
                <div className={`absolute top-2 right-2 ${isLegendary ? 'legendary-badge text-white' : 'shiny-badge text-black'} rounded-full p-2 shadow-lg group`}>
                  <Star className="w-3.5 h-3.5" />
                  <div className="absolute bottom-full mb-2 right-0 bg-black/90 text-white text-xs px-2 py-1 rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                    {photo.shinyReason === 'legendary' ? 'Legendär • Rekord' : 'Trophäe'}
                  </div>
                </div>
              )}
              
              {/* Overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                <div className="absolute bottom-0 left-0 right-0 p-3">
                  <div className="flex items-center gap-2 text-white text-sm font-semibold mb-1">
                    <Fish className="w-4 h-4" />
                    {photo.species}
                  </div>
                  <div className="flex items-center gap-2 text-white/80 text-xs">
                    <Calendar className="w-3 h-3" />
                    {format(new Date(photo.date), 'dd.MM.yyyy', { locale: de })}
                  </div>
                  <div className="text-white/80 text-xs mt-1">
                    {photo.length} cm
                  </div>
                </div>
              </div>

              {/* Species Badge */}
              <div className="absolute top-2 left-2 bg-ocean/90 backdrop-blur-sm px-2 py-1 rounded-full text-white text-xs font-semibold">
                {photo.species}
              </div>
            </div>
          )})}
        </div>
      )}

      {/* Lightbox */}
      {selectedIndex !== null && (
        <PhotoLightbox
          photos={filteredPhotos.map(p => ({
            id: p.id,
            url: p.url,
            species: p.species,
            date: p.date,
          }))}
          initialIndex={selectedIndex}
          onClose={() => setSelectedIndex(null)}
        />
      )}
    </div>
  )
}
