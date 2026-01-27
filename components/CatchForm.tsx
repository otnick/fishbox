'use client'

import { useState } from 'react'
import Image from 'next/image'
import { useCatchStore } from '@/lib/store'
import { uploadPhoto, compressImage } from '@/lib/utils/photoUpload'
import { getCurrentPosition, getLocationName, formatCoordinates } from '@/lib/utils/geolocation'
import { getCurrentWeather } from '@/lib/utils/weather'
import type { Coordinates } from '@/lib/utils/geolocation'

interface CatchFormProps {
  onSuccess: () => void
}

const FISH_SPECIES = [
  'Hecht',
  'Zander',
  'Barsch',
  'Karpfen',
  'Forelle',
  'Aal',
  'Wels',
  'Döbel',
  'Rotauge',
  'Brassen',
  'Schleie',
  'Andere',
]

export default function CatchForm({ onSuccess }: CatchFormProps) {
  const addCatch = useCatchStore((state) => state.addCatch)
  const user = useCatchStore((state) => state.user)
  
  const [formData, setFormData] = useState({
    species: '',
    length: '',
    weight: '',
    location: '',
    bait: '',
    notes: '',
    date: new Date().toISOString().split('T')[0],
  })

  const [photo, setPhoto] = useState<File | null>(null)
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)
  const [coordinates, setCoordinates] = useState<Coordinates | null>(null)
  const [gettingLocation, setGettingLocation] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [weather, setWeather] = useState<any>(null)
  const [fetchingWeather, setFetchingWeather] = useState(false)

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setPhoto(file)
      // Create preview
      const reader = new FileReader()
      reader.onloadend = () => {
        setPhotoPreview(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const removePhoto = () => {
    setPhoto(null)
    setPhotoPreview(null)
  }

  const getGPSLocation = async () => {
    setGettingLocation(true)
    
    const coords = await getCurrentPosition()
    
    if (coords) {
      setCoordinates(coords)
      
      // Try to get location name
      const locationName = await getLocationName(coords)
      if (locationName && !formData.location) {
        setFormData({ ...formData, location: locationName })
      }

      // Auto-fetch weather for current location
      setFetchingWeather(true)
      const weatherData = await getCurrentWeather(coords)
      if (weatherData) {
        setWeather(weatherData)
      }
      setFetchingWeather(false)
    } else {
      alert('GPS-Position konnte nicht ermittelt werden. Bitte erlaube Standortzugriff.')
    }
    
    setGettingLocation(false)
  }

  const removeGPS = () => {
    setCoordinates(null)
    setWeather(null)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!user) {
      alert('Du musst angemeldet sein!')
      return
    }

    setUploading(true)

    try {
      let photoUrl: string | undefined = undefined

      // Upload photo if provided
      if (photo) {
        // Compress image first
        const compressed = await compressImage(photo)
        photoUrl = await uploadPhoto(compressed, user.id) || undefined
        
        if (!photoUrl) {
          alert('Fehler beim Hochladen des Fotos. Versuche es erneut.')
          setUploading(false)
          return
        }
      }

      // Add catch
      await addCatch({
        species: formData.species,
        length: Number(formData.length),
        weight: formData.weight ? Number(formData.weight) : undefined,
        location: formData.location || undefined,
        bait: formData.bait || undefined,
        notes: formData.notes || undefined,
        date: new Date(formData.date),
        photo: photoUrl,
        coordinates: coordinates || undefined,
        weather: weather || undefined,
        is_public: false, // Default to private
      })

      // Reset form
      setFormData({
        species: '',
        length: '',
        weight: '',
        location: '',
        bait: '',
        notes: '',
        date: new Date().toISOString().split('T')[0],
      })
      setPhoto(null)
      setPhotoPreview(null)
      setCoordinates(null)

      onSuccess()
    } catch (error) {
      console.error('Error submitting catch:', error)
      alert('Fehler beim Speichern!')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="bg-ocean/30 backdrop-blur-sm rounded-lg p-6 max-w-2xl mx-auto">
      <h2 className="text-2xl font-bold text-white mb-6">Neuer Fang</h2>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Photo Upload */}
        <div>
          <label className="block text-ocean-light mb-2">📸 Foto</label>
          
          {!photoPreview ? (
            <div className="relative">
              <input
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handlePhotoChange}
                className="hidden"
                id="photo-upload"
              />
              <label
                htmlFor="photo-upload"
                className="flex items-center justify-center w-full px-4 py-8 border-2 border-dashed border-ocean-light/30 rounded-lg cursor-pointer hover:border-ocean-light/60 transition-colors"
              >
                <div className="text-center">
                  <div className="text-4xl mb-2">📷</div>
                  <div className="text-ocean-light">Foto aufnehmen oder hochladen</div>
                  <div className="text-ocean-light/60 text-sm mt-1">Optional</div>
                </div>
              </label>
            </div>
          ) : (
            <div className="relative w-full h-64">
              <Image
                src={photoPreview}
                alt="Preview"
                fill
                className="object-cover rounded-lg"
              />
              <button
                type="button"
                onClick={removePhoto}
                className="absolute top-2 right-2 bg-red-500 hover:bg-red-600 text-white p-2 rounded-full transition-colors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>
            </div>
          )}
        </div>

        {/* GPS Location */}
        <div>
          <label className="block text-ocean-light mb-2">📍 GPS-Position</label>
          
          {!coordinates ? (
            <button
              type="button"
              onClick={getGPSLocation}
              disabled={gettingLocation}
              className="w-full px-4 py-3 border border-ocean-light/30 rounded-lg text-ocean-light hover:bg-ocean-light/10 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {gettingLocation ? 'Ermittle Position...' : '🎯 Aktuelle Position erfassen'}
            </button>
          ) : (
            <div className="bg-ocean-dark/50 p-4 rounded-lg space-y-2">
              <div className="flex justify-between items-start">
                <div>
                  <div className="text-white font-semibold">Position erfasst ✓</div>
                  <div className="text-ocean-light text-sm">
                    {formatCoordinates(coordinates)}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={removeGPS}
                  className="text-red-400 hover:text-red-300"
                >
                  Entfernen
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Species */}
          <div>
            <label className="block text-ocean-light mb-2">Fischart *</label>
            <select
              required
              value={formData.species}
              onChange={(e) => setFormData({ ...formData, species: e.target.value })}
              className="w-full px-4 py-2 rounded-lg bg-ocean-dark text-white border border-ocean-light/30 focus:border-ocean-light focus:outline-none"
            >
              <option value="">Wähle eine Art</option>
              {FISH_SPECIES.map((species) => (
                <option key={species} value={species}>
                  {species}
                </option>
              ))}
            </select>
          </div>

          {/* Length */}
          <div>
            <label className="block text-ocean-light mb-2">Länge (cm) *</label>
            <input
              type="number"
              required
              min="1"
              value={formData.length}
              onChange={(e) => setFormData({ ...formData, length: e.target.value })}
              className="w-full px-4 py-2 rounded-lg bg-ocean-dark text-white border border-ocean-light/30 focus:border-ocean-light focus:outline-none"
              placeholder="z.B. 45"
            />
          </div>

          {/* Weight */}
          <div>
            <label className="block text-ocean-light mb-2">Gewicht (g)</label>
            <input
              type="number"
              min="1"
              value={formData.weight}
              onChange={(e) => setFormData({ ...formData, weight: e.target.value })}
              className="w-full px-4 py-2 rounded-lg bg-ocean-dark text-white border border-ocean-light/30 focus:border-ocean-light focus:outline-none"
              placeholder="z.B. 1200"
            />
          </div>

          {/* Date */}
          <div>
            <label className="block text-ocean-light mb-2">Datum *</label>
            <input
              type="date"
              required
              value={formData.date}
              onChange={(e) => setFormData({ ...formData, date: e.target.value })}
              className="w-full px-4 py-2 rounded-lg bg-ocean-dark text-white border border-ocean-light/30 focus:border-ocean-light focus:outline-none"
            />
          </div>

          {/* Location */}
          <div>
            <label className="block text-ocean-light mb-2">Gewässer</label>
            <input
              type="text"
              value={formData.location}
              onChange={(e) => setFormData({ ...formData, location: e.target.value })}
              className="w-full px-4 py-2 rounded-lg bg-ocean-dark text-white border border-ocean-light/30 focus:border-ocean-light focus:outline-none"
              placeholder="z.B. Elbe bei Hamburg"
            />
          </div>

          {/* Bait */}
          <div>
            <label className="block text-ocean-light mb-2">Köder</label>
            <input
              type="text"
              value={formData.bait}
              onChange={(e) => setFormData({ ...formData, bait: e.target.value })}
              className="w-full px-4 py-2 rounded-lg bg-ocean-dark text-white border border-ocean-light/30 focus:border-ocean-light focus:outline-none"
              placeholder="z.B. Wobbler, Wurm"
            />
          </div>
        </div>

        {/* Notes */}
        <div>
          <label className="block text-ocean-light mb-2">Notizen</label>
          <textarea
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            rows={3}
            className="w-full px-4 py-2 rounded-lg bg-ocean-dark text-white border border-ocean-light/30 focus:border-ocean-light focus:outline-none resize-none"
            placeholder="Zusätzliche Informationen..."
          />
        </div>

        {/* Submit */}
        <div className="flex gap-4">
          <button
            type="submit"
            disabled={uploading}
            className="flex-1 bg-ocean hover:bg-ocean-light text-white font-bold py-3 px-6 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {uploading ? 'Speichere...' : 'Fang speichern'}
          </button>
          <button
            type="button"
            onClick={onSuccess}
            disabled={uploading}
            className="px-6 py-3 rounded-lg border border-ocean-light/30 text-ocean-light hover:bg-ocean-light/10 transition-colors disabled:opacity-50"
          >
            Abbrechen
          </button>
        </div>
      </form>
    </div>
  )
}
