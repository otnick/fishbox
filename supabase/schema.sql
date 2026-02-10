-- FishBox Database Schema
-- Run this in your Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create catches table
CREATE TABLE IF NOT EXISTS public.catches (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    species TEXT NOT NULL,
    length INTEGER NOT NULL, -- in cm
    weight INTEGER, -- in grams
    date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    location TEXT,
    bait TEXT,
    notes TEXT,
    photo_url TEXT, -- URL to photo in storage
    coordinates JSONB, -- {lat: number, lng: number}
    is_shiny BOOLEAN DEFAULT false,
    shiny_reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS catches_user_id_idx ON public.catches(user_id);
CREATE INDEX IF NOT EXISTS catches_date_idx ON public.catches(date DESC);
CREATE INDEX IF NOT EXISTS catches_species_idx ON public.catches(species);

-- Enable Row Level Security
ALTER TABLE public.catches ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view own catches" ON public.catches;
DROP POLICY IF EXISTS "Users can insert own catches" ON public.catches;
DROP POLICY IF EXISTS "Users can update own catches" ON public.catches;
DROP POLICY IF EXISTS "Users can delete own catches" ON public.catches;

-- RLS Policies
-- Users can only see their own catches
CREATE POLICY "Users can view own catches"
    ON public.catches
    FOR SELECT
    USING (auth.uid() = user_id);

-- Users can insert their own catches
CREATE POLICY "Users can insert own catches"
    ON public.catches
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Users can update their own catches
CREATE POLICY "Users can update own catches"
    ON public.catches
    FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Users can delete their own catches
CREATE POLICY "Users can delete own catches"
    ON public.catches
    FOR DELETE
    USING (auth.uid() = user_id);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_updated_at ON public.catches;

CREATE TRIGGER set_updated_at
    BEFORE UPDATE ON public.catches
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

-- Admin settings table
CREATE TABLE IF NOT EXISTS public.admin_settings (
    id SMALLINT PRIMARY KEY DEFAULT 1,
    shiny_lucky_chance NUMERIC NOT NULL DEFAULT 0.02,
    shiny_percentile NUMERIC NOT NULL DEFAULT 0.95,
    shiny_min_history INTEGER NOT NULL DEFAULT 8,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

INSERT INTO public.admin_settings (id)
VALUES (1)
ON CONFLICT (id) DO NOTHING;

ALTER TABLE public.admin_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated can view admin settings" ON public.admin_settings;
CREATE POLICY "Authenticated can view admin settings"
    ON public.admin_settings FOR SELECT
    USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Admins can update admin settings" ON public.admin_settings;
CREATE POLICY "Admins can update admin settings"
    ON public.admin_settings FOR UPDATE
    USING ((auth.jwt() -> 'app_metadata' ->> 'is_admin') = 'true');

DROP POLICY IF EXISTS "Admins can insert admin settings" ON public.admin_settings;
CREATE POLICY "Admins can insert admin settings"
    ON public.admin_settings FOR INSERT
    WITH CHECK ((auth.jwt() -> 'app_metadata' ->> 'is_admin') = 'true');

DROP TRIGGER IF EXISTS set_admin_settings_updated_at ON public.admin_settings;
CREATE TRIGGER set_admin_settings_updated_at
    BEFORE UPDATE ON public.admin_settings
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

-- Admin helpers
CREATE OR REPLACE FUNCTION public.remove_pinned_catch(catch_id UUID)
RETURNS VOID
LANGUAGE SQL
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.profiles
  SET pinned_catch_ids = array_remove(pinned_catch_ids, catch_id)
  WHERE pinned_catch_ids @> ARRAY[catch_id];
$$;

REVOKE ALL ON FUNCTION public.remove_pinned_catch(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.remove_pinned_catch(UUID) TO service_role;

-- Shiny rank helper
CREATE OR REPLACE FUNCTION public.get_species_length_rank(
    species_name TEXT,
    length_value NUMERIC
)
RETURNS TABLE (
    total_count BIGINT,
    above_or_equal_count BIGINT
)
LANGUAGE SQL
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT
        COUNT(*)::BIGINT AS total_count,
        COUNT(*) FILTER (WHERE length >= length_value)::BIGINT AS above_or_equal_count
    FROM public.catches
    WHERE species ILIKE species_name;
$$;

REVOKE ALL ON FUNCTION public.get_species_length_rank(TEXT, NUMERIC) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_species_length_rank(TEXT, NUMERIC) TO authenticated;

-- Trophy recalculation helper
CREATE OR REPLACE FUNCTION public.recalculate_trophy_shinies()
RETURNS INTEGER
LANGUAGE SQL
SECURITY DEFINER
SET search_path = public
AS $$
  WITH settings AS (
    SELECT shiny_percentile, shiny_min_history
    FROM public.admin_settings
    WHERE id = 1
  ),
  stats AS (
    SELECT
      c.species,
      percentile_cont(s.shiny_percentile) WITHIN GROUP (ORDER BY c.length) AS threshold,
      COUNT(*)::BIGINT AS sample_size
    FROM public.catches c
    CROSS JOIN settings s
    GROUP BY c.species, s.shiny_percentile
  ),
  updated AS (
    UPDATE public.catches c
    SET is_shiny = true,
        shiny_reason = 'trophy'
    FROM stats st
    CROSS JOIN settings s
    WHERE c.species = st.species
      AND st.sample_size >= s.shiny_min_history
      AND c.length >= st.threshold
      AND (c.shiny_reason IS DISTINCT FROM 'lucky')
    RETURNING c.id
  )
  SELECT COUNT(*)::INTEGER FROM updated;
$$;

REVOKE ALL ON FUNCTION public.recalculate_trophy_shinies() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.recalculate_trophy_shinies() TO service_role;

-- Optional: Create storage bucket for fish photos
INSERT INTO storage.buckets (id, name, public)
VALUES ('fish-photos', 'fish-photos', true)
ON CONFLICT (id) DO NOTHING;

-- Drop existing storage policies if they exist
DROP POLICY IF EXISTS "Users can upload their own photos" ON storage.objects;
DROP POLICY IF EXISTS "Users can view their own photos" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own photos" ON storage.objects;
DROP POLICY IF EXISTS "Public can view photos" ON storage.objects;

-- Storage policies for fish photos
CREATE POLICY "Users can upload their own photos"
    ON storage.objects
    FOR INSERT
    WITH CHECK (
        bucket_id = 'fish-photos' 
        AND auth.uid()::text = (storage.foldername(name))[1]
    );

CREATE POLICY "Users can view their own photos"
    ON storage.objects
    FOR SELECT
    USING (
        bucket_id = 'fish-photos' 
        AND auth.uid()::text = (storage.foldername(name))[1]
    );

-- Allow public viewing of photos (for sharing)
CREATE POLICY "Public can view photos"
    ON storage.objects
    FOR SELECT
    USING (bucket_id = 'fish-photos');

CREATE POLICY "Users can delete their own photos"
    ON storage.objects
    FOR DELETE
    USING (
        bucket_id = 'fish-photos' 
        AND auth.uid()::text = (storage.foldername(name))[1]
    );
