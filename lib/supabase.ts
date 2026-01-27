import { createClient } from '@supabase/supabase-js'

// These will be replaced with your actual Supabase credentials
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Database types - will be auto-generated once you set up Supabase
export interface Database {
  public: {
    Tables: {
      catches: {
        Row: {
          id: string
          user_id: string
          species: string
          length: number
          weight: number | null
          date: string
          location: string | null
          bait: string | null
          notes: string | null
          photo_url: string | null
          coordinates: { lat: number; lng: number } | null
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['catches']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['catches']['Insert']>
      }
    }
  }
}
