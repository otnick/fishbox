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
    photo_url TEXT,
    coordinates JSONB, -- {lat: number, lng: number}
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS catches_user_id_idx ON public.catches(user_id);
CREATE INDEX IF NOT EXISTS catches_date_idx ON public.catches(date DESC);
CREATE INDEX IF NOT EXISTS catches_species_idx ON public.catches(species);

-- Enable Row Level Security
ALTER TABLE public.catches ENABLE ROW LEVEL SECURITY;

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

CREATE TRIGGER set_updated_at
    BEFORE UPDATE ON public.catches
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

-- Optional: Create storage bucket for fish photos
INSERT INTO storage.buckets (id, name, public)
VALUES ('fish-photos', 'fish-photos', true)
ON CONFLICT (id) DO NOTHING;

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

CREATE POLICY "Users can delete their own photos"
    ON storage.objects
    FOR DELETE
    USING (
        bucket_id = 'fish-photos' 
        AND auth.uid()::text = (storage.foldername(name))[1]
    );
