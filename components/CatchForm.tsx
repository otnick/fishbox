'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import {
  Bot,
  Camera,
  CheckCircle2,
  Cloud,
  Lock,
  MapPin,
  PencilLine,
  Thermometer,
  AlertTriangle,
  Wind,
} from 'lucide-react'
import { useCatchStore } from '@/lib/store'
import { supabase } from '@/lib/supabase'
import { uploadPhoto, compressImage } from '@/lib/utils/photoUpload'
import { getCurrentPosition, getLocationName, formatCoordinates } from '@/lib/utils/geolocation'
import { getCurrentWeather } from '@/lib/utils/weather'
import {
  ALL_GERMAN_SPECIES,
  detectFishSpecies,
  mapSpeciesToDatabase,
  type FishDetectionResult
} from '@/lib/utils/fishDetection'
import ScanAnimation from '@/components/ScanAnimation'
import AIVerificationModal from '@/components/AIVerificationModal'
import NoDetectionModal from '@/components/NoDetectionModal'
import SpeciesPickerDialog from '@/components/SpeciesPickerDialog'
import type { Coordinates } from '@/lib/utils/geolocation'
import type { FishSpecies, Achievement } from '@/lib/types/fishdex'

interface CatchFormProps {
  onSuccess: () => void
  embeddedFlow?: boolean
}

const FISH_SPECIES = Array.from(new Set([...ALL_GERMAN_SPECIES, 'Andere']))

export default function CatchForm({ onSuccess, embeddedFlow = false }: CatchFormProps) {
  const addCatch = useCatchStore((state) => state.addCatch)
  const user = useCatchStore((state) => state.user)
  
  const [formData, setFormData] = useState({
    species: '',
    length: '',
    weight: '',
    location: '',
    bait: '',
    notes: '',
    date: new Date().toISOString().slice(0, 16),
    isPublic: false, // Default to private
  })

  const [photo, setPhoto] = useState<File | null>(null)
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)
  const [coordinates, setCoordinates] = useState<Coordinates | null>(null)
  const [gettingLocation, setGettingLocation] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [weather, setWeather] = useState<any>(null)
  const [fetchingWeather, setFetchingWeather] = useState(false)
  const [newDiscovery, setNewDiscovery] = useState<{
    species: FishSpecies
    achievements: Achievement[]
  } | null>(null)

  // AI Verification states
  const [showAIVerification, setShowAIVerification] = useState(false)
  const [showNoDetection, setShowNoDetection] = useState(false)
  const [aiDetectionResults, setAIDetectionResults] = useState<FishDetectionResult[]>([])
  const [aiDetectionLoading, setAIDetectionLoading] = useState(false)
  const [manualMode, setManualMode] = useState(false)
  const [aiVerified, setAIVerified] = useState(false)
  const [showSpeciesPicker, setShowSpeciesPicker] = useState(false)
  const isSubModalOpen = showAIVerification || showNoDetection || showSpeciesPicker
  const isOverlayActive = aiDetectionLoading || isSubModalOpen

  const closeSubModals = () => {
    setShowAIVerification(false)
    setShowNoDetection(false)
    setShowSpeciesPicker(false)
  }

  // Debug: Watch newDiscovery changes
  useEffect(() => {
    console.log('newDiscovery state changed:', newDiscovery)
    if (newDiscovery) {
      console.log('ScanAnimation should render NOW!')
    }
  }, [newDiscovery])

  useEffect(() => {
    if (manualMode && !aiVerified && !formData.species) {
      setShowSpeciesPicker(true)
    }
  }, [manualMode, aiVerified, formData.species])

  useEffect(() => {
    if (!embeddedFlow || !isOverlayActive) return
    const sheet = document.querySelector<HTMLElement>('[data-catch-modal-sheet="true"]')
    if (!sheet) return
    const originalOverflow = sheet.style.overflowY
    const originalOverscroll = sheet.style.overscrollBehavior
    sheet.style.overflowY = 'hidden'
    sheet.style.overscrollBehavior = 'none'
    return () => {
      sheet.style.overflowY = originalOverflow
      sheet.style.overscrollBehavior = originalOverscroll
    }
  }, [embeddedFlow, isOverlayActive])

  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      if (embeddedFlow) {
        const sheet = document.querySelector<HTMLElement>('[data-catch-modal-sheet="true"]')
        sheet?.scrollTo({ top: 0, behavior: 'auto' })
      }

      setPhoto(file)
      const reader = new FileReader()
      reader.onloadend = () => {
        setPhotoPreview(reader.result as string)
      }
      reader.readAsDataURL(file)

      // Run AI detection
      console.log('Starting AI detection...')
      closeSubModals()
      setAIDetectionResults([])
      setShowAIVerification(true)
      setAIDetectionLoading(true)
      try {
        const results = await detectFishSpecies(file)
        console.log('AI Results:', results)
        
        if (results.detections > 0 && results.results.length > 0) {
          setAIDetectionResults(results.results)
          setShowAIVerification(true)
          console.log('Fish detected. Showing verification modal')
        } else {
          console.log('No fish detected. Showing NoDetectionModal')
          setShowAIVerification(false)
          setShowNoDetection(true)
        }
      } catch (error) {
        console.error('AI detection failed:', error)
        setShowAIVerification(false)
        setShowNoDetection(true)
      } finally {
        setAIDetectionLoading(false)
      }
    }
  }

  const getLocation = async () => {
    setGettingLocation(true)
    try {
      const position = await getCurrentPosition()
      setCoordinates(position)
      
      if (position) {
        const locationName = await getLocationName(position)
        setFormData(prev => ({ ...prev, location: locationName || '' }))

        const weatherData = await getCurrentWeather(position)
        setWeather(weatherData)
      }
    } catch (error) {
      console.error('Location error:', error)
      alert('Konnte Standort nicht ermitteln')
    } finally {
      setGettingLocation(false)
    }
  }

  const getWeatherData = async () => {
    if (!coordinates) {
      alert('Bitte zuerst Standort aktivieren')
      return
    }

    setFetchingWeather(true)
    try {
      const weatherData = await getCurrentWeather(coordinates)
      setWeather(weatherData)
    } catch (error) {
      console.error('Weather error:', error)
      alert('Konnte Wetter nicht laden')
    } finally {
      setFetchingWeather(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!user) {
      alert('Bitte melde dich an')
      return
    }

    if (!formData.species || !formData.length) {
      alert('Bitte Fischart und Länge angeben')
      return
    }

    setUploading(true)

    try {
      let photoUrl: string | undefined = undefined

      if (photo) {
        const compressed = await compressImage(photo)
        const url = await uploadPhoto(compressed, user.id)
        if (url) {
          photoUrl = url
        }
      }

      // Determine verification status
      let verificationData: any = {}
      
      if (aiVerified && aiDetectionResults.length > 0) {
        // AI verified catch
        const topResult = aiDetectionResults[0]
        verificationData = {
          ai_verified: true,
          ai_species: topResult.species,
          ai_confidence: topResult.accuracy,
          verified_at: new Date().toISOString(),
          verification_status: 'verified'
        }
        console.log('Saving as AI verified catch')
      } else if (manualMode) {
        // Manual mode
        verificationData = {
          ai_verified: false,
          verification_status: 'manual'
        }
        console.log('Saving as manual catch')
      } else {
        // Rejected or unverified
        verificationData = {
          ai_verified: false,
          verification_status: 'pending'
        }
        console.log('Saving as pending catch')
      }

      const catchData = {
        species: formData.species,
        length: parseInt(formData.length),
        weight: formData.weight ? parseInt(formData.weight) : undefined,
        location: formData.location || undefined,
        bait: formData.bait || undefined,
        notes: formData.notes || undefined,
        date: new Date(formData.date).toISOString(),
        photo: photoUrl,
        coordinates: coordinates || undefined,
        weather: weather || undefined,
        is_public: formData.isPublic, // Add public status
        ...verificationData
      }

      await addCatch(catchData)

      // Check if this was a new discovery (only verified)
      if (verificationData.verification_status === 'verified') {
        await checkForNewDiscovery(catchData.species)
      }

      setFormData({
        species: '',
        length: '',
        weight: '',
        location: '',
        bait: '',
        notes: '',
        date: new Date().toISOString().slice(0, 16),
        isPublic: false, // Reset to private
      })
      setPhoto(null)
      setPhotoPreview(null)
      setCoordinates(null)
      setWeather(null)
      setManualMode(false)
      setAIVerified(false)
      setAIDetectionResults([])

      // Only call onSuccess if no new discovery (to prevent navigation)
      if (!newDiscovery) {
        onSuccess()
      }
    } catch (error) {
      console.error('Submit error:', error)
      alert('Fehler beim Speichern')
    } finally {
      setUploading(false)
    }
  }

  const checkForNewDiscovery = async (speciesName: string) => {
    if (!user) return

    try {
      // Check if species exists in catalog
      const { data: species, error: speciesError } = await supabase
        .from('fish_species')
        .select('*')
        .ilike('name', speciesName)
        .single()

      if (speciesError || !species) {
        console.log('Species not found in catalog:', speciesName)
        return
      }

      console.log('Found species in catalog:', species.name)

      // Wait for trigger to complete (increased wait time)
      await new Promise(resolve => setTimeout(resolve, 1500))

      // Check if user_fishdex entry was created (by trigger)
      const { data: userEntry, error: entryError } = await supabase
        .from('user_fishdex')
        .select('*')
        .eq('user_id', user.id)
        .eq('species_id', species.id)
        .single()

      if (entryError) {
        console.log('Error checking user_fishdex:', entryError)
        return
      }

      // Check if this was just created (within last 10 seconds)
      const createdAt = new Date(userEntry.created_at).getTime()
      const now = Date.now()
      const isNew = (now - createdAt) < 10000

      console.log('User entry:', {
        created: userEntry.created_at,
        isNew,
        timeDiff: now - createdAt
      })

      if (isNew) {
        console.log('NEW DISCOVERY! Showing scan animation')

        // Load newly unlocked achievements
        const { data: achievements } = await supabase
          .from('user_achievements')
          .select('*, achievement:achievements(*)')
          .eq('user_id', user.id)
          .gte('unlocked_at', new Date(Date.now() - 10000).toISOString())

        console.log('Found achievements:', achievements?.length || 0)

        // IMPORTANT: Set state AFTER all data is loaded
        const discoveryData = {
          species,
          achievements: achievements?.map(a => a.achievement).filter(Boolean) || []
        }
        
        console.log('Setting newDiscovery state:', discoveryData)
        setNewDiscovery(discoveryData)
        
        // Force a small delay to ensure state propagates
        await new Promise(resolve => setTimeout(resolve, 100))
        console.log('State should be set now!')
      } else {
        console.log('Already discovered, no animation')
      }
    } catch (error) {
      console.error('Error checking discovery:', error)
    }
  }

  return (
    <>
      {/* AI Verification Modal */}
      {showAIVerification && photoPreview && (
        <AIVerificationModal
          embedded={embeddedFlow}
          photoPreview={photoPreview}
          detectionResults={aiDetectionResults}
          detectionLoading={aiDetectionLoading}
          onConfirm={(species) => {
            console.log('User confirmed:', species)
            const mappedSpecies = mapSpeciesToDatabase(species)
            setFormData({ ...formData, species: mappedSpecies })
            setAIVerified(true)
            closeSubModals()
          }}
          onReject={() => {
            console.log('User rejected catch. Discarding')
            closeSubModals()
            setPhoto(null)
            setPhotoPreview(null)
            setManualMode(false)
            setAIVerified(false)
            setAIDetectionResults([])
          }}
          onRetry={async () => {
            console.log('Retrying AI detection...')
            if (photo) {
              setAIDetectionLoading(true)
              try {
                const results = await detectFishSpecies(photo)
                setAIDetectionResults(results.results || [])
                if (results.detections === 0) {
                  closeSubModals()
                  setShowNoDetection(true)
                }
              } catch (error) {
                console.error('Retry failed:', error)
                closeSubModals()
                setShowNoDetection(true)
              } finally {
                setAIDetectionLoading(false)
              }
            }
          }}
          onManualOverride={() => {
            console.log('User chose manual mode from verification')
            closeSubModals()
            setManualMode(true)
            setAIVerified(false)
          }}
        />
      )}

      {/* No Detection Modal */}
      {showNoDetection && photoPreview && (
        <NoDetectionModal
          embedded={embeddedFlow}
          photoPreview={photoPreview}
          onRetry={async () => {
            console.log('Retrying AI detection from NoDetectionModal...')
            if (photo) {
              closeSubModals()
              setAIDetectionLoading(true)
              try {
                const results = await detectFishSpecies(photo)
                if (results.detections > 0 && results.results.length > 0) {
                  closeSubModals()
                  setAIDetectionResults(results.results)
                  setShowAIVerification(true)
                } else {
                  closeSubModals()
                  setShowNoDetection(true)
                }
              } catch (error) {
                console.error('Retry failed:', error)
                closeSubModals()
                setShowNoDetection(true)
              } finally {
                setAIDetectionLoading(false)
              }
            }
          }}
          onManualOverride={() => {
            console.log('User chose manual mode from NoDetectionModal')
            closeSubModals()
            setManualMode(true)
            setAIVerified(false)
          }}
          onReject={() => {
            console.log('User rejected from NoDetectionModal. Discarding')
            closeSubModals()
            setPhoto(null)
            setPhotoPreview(null)
            setManualMode(false)
            setAIVerified(false)
          }}
        />
      )}

      {/* Scan Animation Modal */}
      {newDiscovery && (
        <ScanAnimation
          species={newDiscovery.species}
          newAchievements={newDiscovery.achievements}
          onClose={() => {
            setNewDiscovery(null)
            onSuccess()
          }}
        />
      )}

      {/* Species Picker Dialog */}
      <SpeciesPickerDialog
        embedded={embeddedFlow}
        isOpen={showSpeciesPicker}
        species={FISH_SPECIES}
        selected={formData.species}
        onSelect={(species) => setFormData({ ...formData, species })}
        onClose={closeSubModals}
      />

      <form
        onSubmit={handleSubmit}
        className={`space-y-6 transition-all duration-200 ${isSubModalOpen ? 'pointer-events-none opacity-30 scale-[0.985]' : 'pointer-events-auto opacity-100 scale-100'}`}
      >
      {/* Photo Upload */}
      <div>
        <label className="block text-ocean-light text-sm mb-2">
          Foto
        </label>
        {photoPreview ? (
          <div className="relative w-full h-48 rounded-lg overflow-hidden mb-2">
            <Image
              src={photoPreview}
              alt="Preview"
              fill
              sizes="(max-width: 640px) 100vw, 640px"
              className="object-cover"
            />
            
            {/* Status Badge - Top Left (Icon only with tooltip) */}
            {aiDetectionLoading && (
              <div className="absolute top-2 left-2 bg-blue-500/90 backdrop-blur-sm text-white p-2 rounded-full animate-pulse group cursor-help">
                <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
                </svg>
                {/* Tooltip */}
                <div className="absolute left-full ml-2 top-1/2 -translate-y-1/2 bg-black/90 text-white text-xs px-3 py-1.5 rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                  KI-Analyse läuft...
                </div>
              </div>
            )}
            
            {!aiDetectionLoading && aiVerified && (
              <div className="absolute top-2 left-2 bg-green-500/90 backdrop-blur-sm text-white p-2 rounded-full group cursor-help">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {/* Tooltip */}
                <div className="absolute left-full ml-2 top-1/2 -translate-y-1/2 bg-black/90 text-white text-xs px-3 py-1.5 rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                  <span className="inline-flex items-center gap-1">
                    <CheckCircle2 className="w-4 h-4" />
                    KI-verifiziert → FishDex
                  </span>
                </div>
              </div>
            )}
            
            {!aiDetectionLoading && manualMode && !aiVerified && (
              <div className="absolute top-2 left-2 bg-yellow-500/90 backdrop-blur-sm text-white p-2 rounded-full group cursor-help">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                </svg>
                {/* Tooltip */}
                <div className="absolute left-full ml-2 top-1/2 -translate-y-1/2 bg-black/90 text-white text-xs px-3 py-1.5 rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                  <span className="inline-flex items-center gap-1">
                    <PencilLine className="w-4 h-4" />
                    Manuell → Kein FishDex
                  </span>
                </div>
              </div>
            )}
            
            <button
              type="button"
              onClick={() => {
                setPhoto(null)
                setPhotoPreview(null)
                setManualMode(false)
                setAIVerified(false)
                setAIDetectionResults([])
              }}
              className="absolute top-2 right-2 bg-red-500 text-white px-3 py-1 rounded-lg text-sm"
            >
              Entfernen
            </button>
          </div>
        ) : (
          <label className="flex items-center justify-center w-full h-48 border-2 border-dashed border-ocean-light/30 rounded-lg cursor-pointer hover:border-ocean-light transition-colors">
            <div className="text-center">
              <div className="mb-2 flex justify-center">
                <Camera className="w-9 h-9 text-ocean-light" />
              </div>
              <div className="text-ocean-light">Foto hochladen</div>
            </div>
            <input
              type="file"
              accept="image/*"
              onChange={handlePhotoChange}
              className="hidden"
            />
          </label>
        )}
        
        {/* Verification Status Info */}
        {photoPreview && (
          <div className="mt-2 text-sm text-ocean-light">
            {aiDetectionLoading && (
              <p className="inline-flex items-center gap-1">
                <Bot className="w-4 h-4" />
                Die KI analysiert dein Foto...
              </p>
            )}
            {!aiDetectionLoading && aiVerified && formData.species && (
              <p className="text-green-400">
                ✓ Verifiziert als <strong>{formData.species}</strong> - wird im FishDex freigeschaltet
              </p>
            )}
            {!aiDetectionLoading && manualMode && (
              <p className="text-yellow-400">
                <span className="inline-flex items-center gap-1">
                  <AlertTriangle className="w-4 h-4" />
                  Manuelle Eingabe - Fang wird gespeichert, aber NICHT im FishDex gewertet
                </span>
              </p>
            )}
          </div>
        )}
      </div>

      {/* Species */}
      <div>
        <label className="block text-ocean-light text-sm mb-2">
          Fischart *
          {aiVerified && (
            <span className="ml-2 text-xs text-green-400">
              <span className="inline-flex items-center gap-1">
                <Lock className="w-3.5 h-3.5" />
                KI-verifiziert
              </span>
            </span>
          )}
        </label>
        {aiVerified ? (
          <div className="w-full px-4 py-2 rounded-lg bg-ocean-dark text-white border border-ocean-light/30 opacity-60">
            {formData.species}
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setShowSpeciesPicker(true)}
            className="w-full px-4 py-2 rounded-lg bg-ocean-dark text-white border border-ocean-light/30 focus:border-ocean-light focus:outline-none text-left hover:border-ocean-light transition-colors"
          >
            {formData.species || 'Wähle eine Art'}
          </button>
        )}
        {aiVerified && (
          <p className="text-ocean-light text-xs mt-1">
            Die Art wurde durch KI verifiziert und kann nicht mehr geändert werden.
          </p>
        )}
        {!aiVerified && manualMode && (
          <p className="text-ocean-light text-xs mt-1">
            Manuelle Auswahl öffnet den Arten-Dialog mit Filtern.
          </p>
        )}
      </div>

      {/* Length & Weight */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-ocean-light text-sm mb-2">
            Länge (cm) *
          </label>
          <input
            type="number"
            value={formData.length}
            onChange={(e) => setFormData({ ...formData, length: e.target.value })}
            className="w-full px-4 py-2 rounded-lg bg-ocean-dark text-white border border-ocean-light/30 focus:border-ocean-light focus:outline-none"
            required
            min="1"
          />
        </div>
        <div>
          <label className="block text-ocean-light text-sm mb-2">
            Gewicht (g)
          </label>
          <input
            type="number"
            value={formData.weight}
            onChange={(e) => setFormData({ ...formData, weight: e.target.value })}
            className="w-full px-4 py-2 rounded-lg bg-ocean-dark text-white border border-ocean-light/30 focus:border-ocean-light focus:outline-none"
            min="1"
          />
        </div>
      </div>

      {/* Date & Time */}
      <div>
        <label className="block text-ocean-light text-sm mb-2">
          Datum & Uhrzeit
        </label>
        <input
          type="datetime-local"
          value={formData.date}
          onChange={(e) => setFormData({ ...formData, date: e.target.value })}
          className="w-full px-4 py-2 rounded-lg bg-ocean-dark text-white border border-ocean-light/30 focus:border-ocean-light focus:outline-none"
        />
      </div>

      {/* Location */}
      <div>
        <label className="block text-ocean-light text-sm mb-2">
          Standort
        </label>
        <div className="flex gap-2">
          <input
            type="text"
            value={formData.location}
            onChange={(e) => setFormData({ ...formData, location: e.target.value })}
            className="flex-1 px-4 py-2 rounded-lg bg-ocean-dark text-white border border-ocean-light/30 focus:border-ocean-light focus:outline-none"
            placeholder="z.B. Müggelsee, Berlin"
          />
          <button
            type="button"
            onClick={getLocation}
            disabled={gettingLocation}
            className="px-4 py-2 bg-ocean hover:bg-ocean-light text-white rounded-lg transition-colors disabled:opacity-50"
          >
            {gettingLocation ? '...' : <MapPin className="w-4 h-4" />}
          </button>
        </div>
        {coordinates && (
          <p className="text-xs text-ocean-light mt-1">
            <span className="inline-flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5" />
              {formatCoordinates(coordinates)}
            </span>
          </p>
        )}
      </div>

      {/* Weather */}
      {coordinates && (
        <div>
          <button
            type="button"
            onClick={getWeatherData}
            disabled={fetchingWeather}
            className="text-ocean-light hover:text-white text-sm transition-colors"
          >
            <span className="inline-flex items-center gap-1">
              <Cloud className="w-4 h-4" />
              {weather ? 'Wetter aktualisieren' : 'Wetter laden'}
            </span>
          </button>
          {weather && (
            <div className="mt-2 p-3 bg-ocean-dark/50 rounded-lg text-sm">
              <div className="text-white">
                <span className="inline-flex items-center gap-2">
                  <span className="inline-flex items-center gap-1">
                    <Thermometer className="w-4 h-4" />
                    {weather.temperature}°C
                  </span>
                  <span>•</span>
                  <span className="inline-flex items-center gap-1">
                    <Wind className="w-4 h-4" />
                    {weather.windSpeed} km/h
                  </span>
                </span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Bait */}
      <div>
        <label className="block text-ocean-light text-sm mb-2">
          Köder
        </label>
        <input
          type="text"
          value={formData.bait}
          onChange={(e) => setFormData({ ...formData, bait: e.target.value })}
          className="w-full px-4 py-2 rounded-lg bg-ocean-dark text-white border border-ocean-light/30 focus:border-ocean-light focus:outline-none"
          placeholder="z.B. Wobbler, Gummifisch, Wurm"
        />
      </div>

      {/* Notes */}
      <div>
        <label className="block text-ocean-light text-sm mb-2">
          Notizen
        </label>
        <textarea
          value={formData.notes}
          onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
          rows={3}
          className="w-full px-4 py-2 rounded-lg bg-ocean-dark text-white border border-ocean-light/30 focus:border-ocean-light focus:outline-none resize-none"
          placeholder="Zusätzliche Infos..."
        />
      </div>

      {/* Public Toggle */}
      <div className="bg-ocean/20 rounded-lg p-4 border border-ocean-light/20">
        <label className="flex items-center justify-between cursor-pointer group">
          <div className="flex-1">
            <div className="text-white font-semibold mb-1 flex items-center gap-2">
              <svg className="w-5 h-5 text-ocean-light" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Öffentlich teilen
            </div>
            <div className="text-ocean-light text-xs">
              {formData.isPublic
                ? 'Dieser Fang wird öffentlich sichtbar sein'
                : 'Nur du kannst diesen Fang sehen'}
            </div>
          </div>
          <div className="relative ml-4">
            <input
              type="checkbox"
              checked={formData.isPublic}
              onChange={(e) => setFormData({ ...formData, isPublic: e.target.checked })}
              className="sr-only peer"
            />
            <div className="w-14 h-8 bg-ocean-dark rounded-full peer peer-checked:bg-green-500 transition-colors"></div>
            <div className="absolute left-1 top-1 w-6 h-6 bg-white rounded-full transition-transform peer-checked:translate-x-6"></div>
          </div>
        </label>
      </div>

      {/* Submit */}
      <button
        type="submit"
        disabled={uploading}
        className="w-full bg-gradient-to-r from-ocean-light to-ocean hover:from-ocean hover:to-ocean-dark text-white font-semibold py-3 rounded-lg transition-all disabled:opacity-50 shadow-lg hover:shadow-xl"
      >
        {uploading ? 'Speichern...' : 'Fang speichern'}
      </button>
    </form>
    </>
  )
}


