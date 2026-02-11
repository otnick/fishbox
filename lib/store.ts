import { create } from 'zustand'
import { supabase } from './supabase'
import type { User } from '@supabase/supabase-js'
import type { WeatherData } from './utils/weather'
import { emitToast } from './toast'

export interface Catch {
  id: string
  species: string
  length: number // in cm
  weight?: number // in grams
  date: Date | string
  location?: string
  bait?: string
  notes?: string
  photo?: string // URL or base64
  photos?: string[]
  coordinates?: {
    lat: number
    lng: number
  }
  user_id?: string
  created_at?: string
  
  // Weather data
  weather?: WeatherData
  
  // Social features
  is_public?: boolean
  likes_count?: number
  comments_count?: number
  is_shiny?: boolean
  shiny_reason?: string | null

  verification_status?: 'pending' | 'verified' | 'manual'
  ai_verified?: boolean
  ai_species?: string
  ai_confidence?: number
  verified_at?: string
}

interface CatchStore {
  catches: Catch[]
  user: User | null
  loading: boolean
  isCatchModalOpen: boolean
  isAiAnalyzing: boolean
  
  // Auth methods
  setUser: (user: User | null) => void
  signOut: () => Promise<void>

  // UI methods
  openCatchModal: () => void
  closeCatchModal: () => void
  toggleCatchModal: () => void
  setAiAnalyzing: (value: boolean) => void
  
  // Catch methods
  fetchCatches: () => Promise<void>
  addCatch: (catchData: Omit<Catch, 'id' | 'user_id' | 'created_at'>) => Promise<void>
  deleteCatch: (id: string) => Promise<void>
  updateCatch: (id: string, catchData: Partial<Catch>) => Promise<void>
}

export const useCatchStore = create<CatchStore>((set, get) => ({
  catches: [],
  user: null,
  loading: false,
  isCatchModalOpen: false,
  isAiAnalyzing: false,

  setUser: (user) => {
    set({ user })
    if (user) {
      get().fetchCatches()
    } else {
      set({ catches: [] })
    }
  },

  signOut: async () => {
    await supabase.auth.signOut()
    set({ user: null, catches: [] })
  },

  openCatchModal: () => set({ isCatchModalOpen: true }),
  closeCatchModal: () => set({ isCatchModalOpen: false }),
  toggleCatchModal: () => set((state) => ({ isCatchModalOpen: !state.isCatchModalOpen })),
  setAiAnalyzing: (value) => set({ isAiAnalyzing: value }),

  fetchCatches: async () => {
    const { user } = get()
    if (!user) return

    set({ loading: true })
    
    const { data, error } = await supabase
      .from('catches')
      .select('*, catch_photos(photo_url, order_index)')
      .eq('user_id', user.id)
      .order('date', { ascending: false })

    if (error) {
      console.error('Error fetching catches:', error)
    } else {
      const catches = data.map((c: any) => {
        const orderedPhotos = (c.catch_photos || [])
          .slice()
          .sort((a: any, b: any) => (a.order_index ?? 0) - (b.order_index ?? 0))
          .map((p: any) => p.photo_url)
          .filter(Boolean)

        return {
        ...c,
        date: new Date(c.date),
        photo: c.photo_url || orderedPhotos[0] || undefined,
        photos: orderedPhotos,
      }
      })
      set({ catches })
    }
    
    set({ loading: false })
  },

  addCatch: async (catchData) => {
    const { user } = get()
    if (!user) return

    const photoUrls = (catchData.photos || []).filter(Boolean)
    const primaryPhotoUrl = catchData.photo || photoUrls[0]

    const newCatch = {
      ...catchData,
      date: catchData.date instanceof Date ? catchData.date.toISOString() : catchData.date,
      user_id: user.id,
      photo_url: primaryPhotoUrl, // Primary photo for fast access/backward compatibility
    }

    // Remove frontend-only photo fields
    delete (newCatch as any).photo
    delete (newCatch as any).photos

    const { data, error } = await supabase
      .from('catches')
      .insert([newCatch])
      .select()
      .single()

    if (error) {
      console.error('Error adding catch:', error)
      emitToast('Fehler beim Speichern: ' + error.message, 'error')
    } else {
      if (photoUrls.length > 0) {
        const photoRows = photoUrls.map((photoUrl, index) => ({
          catch_id: data.id,
          photo_url: photoUrl,
          order_index: index,
        }))
        const { error: photosError } = await supabase
          .from('catch_photos')
          .insert(photoRows)

        if (photosError) {
          console.error('Error saving catch photos:', photosError)
          emitToast('Fang gespeichert, aber zusätzliche Fotos konnten nicht gespeichert werden.', 'error')
        }
      }

      const catchWithPhoto = {
        ...data,
        date: new Date(data.date),
        photo: data.photo_url,
        photos: photoUrls.length > 0 ? photoUrls : (data.photo_url ? [data.photo_url] : []),
      }
      set((state) => ({
        catches: [catchWithPhoto, ...state.catches],
      }))
    }
  },

  deleteCatch: async (id) => {
    const { error } = await supabase
      .from('catches')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Error deleting catch:', error)
      emitToast('Fehler beim Löschen: ' + error.message, 'error')
    } else {
      set((state) => ({
        catches: state.catches.filter((c) => c.id !== id),
      }))
    }
  },

  updateCatch: async (id, catchData) => {
    const updateData = {
      ...catchData,
      date: catchData.date instanceof Date ? catchData.date.toISOString() : catchData.date,
      photo_url: catchData.photo,
    }

    // Remove photo field for database
    delete (updateData as any).photo
    delete (updateData as any).photos

    const { error } = await supabase
      .from('catches')
      .update(updateData)
      .eq('id', id)

    if (error) {
      console.error('Error updating catch:', error)
      emitToast('Fehler beim Aktualisieren: ' + error.message, 'error')
    } else {
      set((state) => ({
        catches: state.catches.map((c) =>
          c.id === id ? { ...c, ...catchData } : c
        ),
      }))
    }
  },
}))
