'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useCatchStore } from '@/lib/store'
import { format } from 'date-fns'
import { de } from 'date-fns/locale'
import { Image as ImageIcon, Calendar, Fish, Filter, Download } from 'lucide-react'
import dynamic from 'next/dynamic'

const PhotoLightbox = dynamic(() => import('@/components/PhotoLightbox'), { ssr: false })

interface GalleryPhoto {
  id: string
  url: string
  species: string
  length: number
  date: string
  catchId: string
}

export default function GalleryPage() {
  const { catches } = useCatchStore()
  const [photos, setPhotos] = useState<GalleryPhoto[]>([])
  const [filteredPhotos, setFilteredPhotos] = useState<GalleryPhoto[]>([])
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null)
  const [filterSpecies, setFilterSpecies] = useState<string>('all')
  const [sortBy, setSortBy] = useState<'date' | 'species'>('date')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadPhotos()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [catches])

  useEffect(() => {
    applyFilters()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [photos, filterSpecies, sortBy])

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
      }))

    setPhotos(allPhotos)
    setLoading(false)
  }

  const applyFilters = () => {
    let filtered = [...photos]

    if (filterSpecies !== 'all') {
      filtered = filtered.filter(p => p.species === filterSpecies)
    }

    if (sortBy === 'date') {
      filtered.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    } else {
      filtered.sort((a, b) => a.species.localeCompare(b.species))
    }

    setFilteredPhotos(filtered)
  }

  const downloadAll = async () => {
    if (confirm(`${filteredPhotos.length} Fotos herunterladen?`)) {
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
      <div className="flex items-center justify-between">
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
            className="flex items-center gap-2 bg-ocean hover:bg-ocean-light text-white px-4 py-2 rounded-lg transition-colors text-sm"
          >
            <Download className="w-4 h-4" />
            Alle herunterladen
          </button>
        )}
      </div>

      {/* Filters */}
      {photos.length > 0 && (
        <div className="bg-ocean/30 backdrop-blur-sm rounded-lg p-4">
          <div className="flex items-center gap-2 mb-3">
            <Filter className="w-5 h-5 text-ocean-light" />
            <span className="text-white font-semibold">Filter</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
        </div>
      )}

      {/* Gallery Grid */}
      {filteredPhotos.length === 0 ? (
        <div className="bg-ocean/30 backdrop-blur-sm rounded-xl p-12 text-center">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-ocean-light/20 to-ocean/20 mb-6">
            <ImageIcon className="w-10 h-10 text-ocean-light" />
          </div>
          <h3 className="text-2xl font-bold text-white mb-2">
            {filterSpecies !== 'all' ? `Keine ${filterSpecies}-Fotos` : 'Keine Fotos'}
          </h3>
          <p className="text-ocean-light mb-6">
            {filterSpecies !== 'all' 
              ? `Keine Fotos von ${filterSpecies} gefunden.`
              : 'Füge Fotos zu deinen Fängen hinzu!'
            }
          </p>
          <Link
            href="/catches"
            className="inline-flex items-center gap-2 bg-gradient-to-r from-ocean-light to-ocean hover:from-ocean hover:to-ocean-dark text-white font-semibold py-3 px-8 rounded-lg transition-all shadow-lg hover:shadow-xl"
          >
            Fang hinzufügen
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {filteredPhotos.map((photo, index) => (
            <div
              key={photo.id}
              onClick={() => setSelectedIndex(index)}
              className="group relative aspect-square rounded-xl overflow-hidden cursor-pointer bg-ocean-dark hover:scale-105 transition-all duration-300 shadow-lg hover:shadow-2xl animate-scale-in"
              style={{ animationDelay: `${index * 30}ms` }}
            >
              <Image
                src={photo.url}
                alt={photo.species}
                fill
                className="object-cover group-hover:scale-110 transition-transform duration-300"
              />
              
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
          ))}
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
