import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface Catch {
  id: string
  species: string
  length: number // in cm
  weight?: number // in grams
  date: Date
  location?: string
  bait?: string
  notes?: string
  photo?: string // URL or base64
  coordinates?: {
    lat: number
    lng: number
  }
}

interface CatchStore {
  catches: Catch[]
  addCatch: (catchData: Omit<Catch, 'id'>) => void
  deleteCatch: (id: string) => void
  updateCatch: (id: string, catchData: Partial<Catch>) => void
}

export const useCatchStore = create<CatchStore>()(
  persist(
    (set) => ({
      catches: [],
      
      addCatch: (catchData) =>
        set((state) => ({
          catches: [
            ...state.catches,
            {
              ...catchData,
              id: crypto.randomUUID(),
              date: new Date(catchData.date),
            },
          ],
        })),
      
      deleteCatch: (id) =>
        set((state) => ({
          catches: state.catches.filter((c) => c.id !== id),
        })),
      
      updateCatch: (id, catchData) =>
        set((state) => ({
          catches: state.catches.map((c) =>
            c.id === id ? { ...c, ...catchData } : c
          ),
        })),
    }),
    {
      name: 'fishing-tracker-storage',
    }
  )
)
