import { create } from 'zustand'
import { supabase } from './supabase'
import type { User } from '@supabase/supabase-js'
import type { WeatherData } from './utils/weather'

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
  
  // Auth methods
  setUser: (user: User | null) => void
  signOut: () => Promise<void>

  // UI methods
  openCatchModal: () => void
  closeCatchModal: () => void
  toggleCatchModal: () => void
  
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

  fetchCatches: async () => {
    const { user } = get()
    if (!user) return

    set({ loading: true })
    
    const { data, error } = await supabase
      .from('catches')
      .select('*')
      .eq('user_id', user.id)
      .order('date', { ascending: false })

    if (error) {
      console.error('Error fetching catches:', error)
    } else {
      // Convert date strings to Date objects and map photo_url to photo
      const catches = data.map(c => ({
        ...c,
        date: new Date(c.date),
        photo: c.photo_url, // Map photo_url to photo for frontend
      }))
      set({ catches })
    }
    
    set({ loading: false })
  },

  addCatch: async (catchData) => {
    const { user } = get()
    if (!user) return

    const newCatch = {
      ...catchData,
      date: catchData.date instanceof Date ? catchData.date.toISOString() : catchData.date,
      user_id: user.id,
      photo_url: catchData.photo, // Map photo to photo_url for database
    }

    // Remove the photo field as it's now photo_url
    delete (newCatch as any).photo

    const { data, error } = await supabase
      .from('catches')
      .insert([newCatch])
      .select()
      .single()

    if (error) {
      console.error('Error adding catch:', error)
      alert('Fehler beim Speichern: ' + error.message)
    } else {
      // Map photo_url back to photo for frontend
      const catchWithPhoto = {
        ...data,
        date: new Date(data.date),
        photo: data.photo_url,
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
      alert('Fehler beim Löschen: ' + error.message)
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

    const { error } = await supabase
      .from('catches')
      .update(updateData)
      .eq('id', id)

    if (error) {
      console.error('Error updating catch:', error)
      alert('Fehler beim Aktualisieren: ' + error.message)
    } else {
      set((state) => ({
        catches: state.catches.map((c) =>
          c.id === id ? { ...c, ...catchData } : c
        ),
      }))
    }
  },
}))
