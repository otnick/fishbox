// FishDex Type Definitions

export interface FishSpecies {
  id: string
  name: string
  scientific_name?: string
  region: Array<'deutschland' | 'europa' | 'weltweit'>
  habitat?: 'freshwater' | 'saltwater' | 'brackish'
  rarity: 1 | 2 | 3 | 4 | 5
  description?: string
  hints?: string
  image_url?: string
  silhouette_url?: string
  min_length?: number
  max_length?: number
  min_weight?: number
  max_weight?: number
  closed_season?: string
  baits?: string[]
  best_time?: string
  created_at: string
  updated_at: string
}

export interface UserFishDexEntry {
  id: string
  user_id: string
  species_id: string
  discovered_at: string
  first_catch_id?: string
  total_caught: number
  biggest_length?: number
  biggest_weight?: number
  last_caught_at?: string
  created_at: string
  updated_at: string
}

export interface FishDexEntry extends FishSpecies {
  discovered: boolean
  userProgress?: UserFishDexEntry
  verified?: boolean
}

export interface Achievement {
  id: string
  name: string
  description?: string
  icon?: string
  category: 'collection' | 'skill' | 'social' | 'special'
  requirement: Record<string, any>
  xp_reward: number
  badge_color?: string
  created_at: string
}

export interface UserAchievement {
  id: string
  user_id: string
  achievement_id: string
  unlocked_at: string
  progress?: Record<string, any>
  achievement?: Achievement
}

export interface FishDexStats {
  deutschland: {
    discovered: number
    total: number
    percentage: number
  }
  europa: {
    discovered: number
    total: number
    percentage: number
  }
  weltweit: {
    discovered: number
    total: number
    percentage: number
  }
  totalDiscovered: number
  totalSpecies: number
  rarestCaught?: FishSpecies
  lastDiscovery?: {
    species: FishSpecies
    date: string
  }
}

export type FishDexRegion = 'deutschland' | 'europa' | 'weltweit'
export type FishDexCategory = 'all' | 'freshwater' | 'saltwater' | 'predator' | 'peaceful'
export type FishDexSortBy = 'number' | 'name' | 'rarity' | 'discovered'

export interface NewDiscovery {
  species: FishSpecies
  catchId: string
  isFirstEver: boolean
  newAchievements: Achievement[]
}
