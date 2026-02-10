-- ============================================
-- FISHBOX COMPLETE DATABASE SETUP
-- Führe dieses Script EINMAL aus
-- ============================================

-- STEP 1: Drop everything (fresh start)
DROP TABLE IF EXISTS public.activities CASCADE;
DROP TABLE IF EXISTS public.catch_comments CASCADE;
DROP TABLE IF EXISTS public.catch_likes CASCADE;
DROP TABLE IF EXISTS public.friendships CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE;
DROP TABLE IF EXISTS public.catches CASCADE;

DROP FUNCTION IF EXISTS create_profile_for_user() CASCADE;
DROP FUNCTION IF EXISTS increment_likes_count() CASCADE;
DROP FUNCTION IF EXISTS decrement_likes_count() CASCADE;
DROP FUNCTION IF EXISTS increment_comments_count() CASCADE;
DROP FUNCTION IF EXISTS decrement_comments_count() CASCADE;
DROP FUNCTION IF EXISTS create_activity_for_catch() CASCADE;

-- STEP 2: Create catches table (BASE)
CREATE TABLE public.catches (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    species TEXT NOT NULL,
    length NUMERIC NOT NULL,
    weight NUMERIC,
    date TIMESTAMP WITH TIME ZONE NOT NULL,
    location TEXT,
    coordinates JSONB,
    bait TEXT,
    notes TEXT,
    photo_url TEXT,
    weather JSONB,
    is_public BOOLEAN DEFAULT false,
    likes_count INTEGER DEFAULT 0,
    comments_count INTEGER DEFAULT 0,
    is_shiny BOOLEAN DEFAULT false,
    shiny_reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- STEP 3: Create profiles table
CREATE TABLE public.profiles (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    bio TEXT,
    avatar_url TEXT,
    is_public BOOLEAN DEFAULT true,
    pinned_catch_ids UUID[] DEFAULT '{}'::uuid[],
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- STEP 4: Create friendships table
CREATE TABLE public.friendships (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    friend_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    status TEXT CHECK (status IN ('pending', 'accepted', 'rejected')) DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, friend_id)
);

-- STEP 5: Create catch_likes table
CREATE TABLE public.catch_likes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    catch_id UUID REFERENCES public.catches(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(catch_id, user_id)
);

-- STEP 6: Create catch_comments table
CREATE TABLE public.catch_comments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    catch_id UUID REFERENCES public.catches(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    comment TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- STEP 7: Create activities table
CREATE TABLE public.activities (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    activity_type TEXT NOT NULL,
    catch_id UUID REFERENCES public.catches(id) ON DELETE CASCADE,
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- STEP 7b: Create admin settings table
CREATE TABLE public.admin_settings (
    id SMALLINT PRIMARY KEY DEFAULT 1,
    shiny_lucky_chance NUMERIC NOT NULL DEFAULT 0.02,
    shiny_percentile NUMERIC NOT NULL DEFAULT 0.95,
    shiny_min_history INTEGER NOT NULL DEFAULT 8,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

INSERT INTO public.admin_settings (id)
VALUES (1)
ON CONFLICT (id) DO NOTHING;

-- STEP 8: Enable RLS on all tables
ALTER TABLE public.catches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.friendships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.catch_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.catch_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_settings ENABLE ROW LEVEL SECURITY;

-- STEP 9: RLS Policies for catches
CREATE POLICY "Users can view own catches"
    ON public.catches FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can view public catches"
    ON public.catches FOR SELECT
    USING (is_public = true);

CREATE POLICY "Users can insert own catches"
    ON public.catches FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own catches"
    ON public.catches FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own catches"
    ON public.catches FOR DELETE
    USING (auth.uid() = user_id);

-- STEP 10: RLS Policies for profiles
CREATE POLICY "Public profiles are viewable by everyone"
    ON public.profiles FOR SELECT
    USING (is_public = true);

CREATE POLICY "Users can view own profile"
    ON public.profiles FOR SELECT
    USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
    ON public.profiles FOR INSERT
    WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile"
    ON public.profiles FOR UPDATE
    USING (auth.uid() = id);

-- STEP 11: RLS Policies for friendships
CREATE POLICY "Users can view own friendships"
    ON public.friendships FOR SELECT
    USING (auth.uid() = user_id OR auth.uid() = friend_id);

CREATE POLICY "Users can create friendships"
    ON public.friendships FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update received friendship requests"
    ON public.friendships FOR UPDATE
    USING (auth.uid() = friend_id);

CREATE POLICY "Users can delete own friendships"
    ON public.friendships FOR DELETE
    USING (auth.uid() = user_id);

-- STEP 12: RLS Policies for catch_likes
CREATE POLICY "Anyone can view likes"
    ON public.catch_likes FOR SELECT
    USING (true);

CREATE POLICY "Users can create likes"
    ON public.catch_likes FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own likes"
    ON public.catch_likes FOR DELETE
    USING (auth.uid() = user_id);

-- STEP 13: RLS Policies for catch_comments
CREATE POLICY "Anyone can view comments on public catches"
    ON public.catch_comments FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.catches
            WHERE catches.id = catch_comments.catch_id
            AND (catches.is_public = true OR catches.user_id = auth.uid())
        )
    );

CREATE POLICY "Users can create comments"
    ON public.catch_comments FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own comments"
    ON public.catch_comments FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own comments"
    ON public.catch_comments FOR DELETE
    USING (auth.uid() = user_id);

-- STEP 14: RLS Policies for activities
CREATE POLICY "Users can view public activities"
    ON public.activities FOR SELECT
    USING (true);

CREATE POLICY "Users can create activities"
    ON public.activities FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- STEP 15: RLS Policies for admin settings
CREATE POLICY "Authenticated can view admin settings"
    ON public.admin_settings FOR SELECT
    USING (auth.role() = 'authenticated');

CREATE POLICY "Admins can update admin settings"
    ON public.admin_settings FOR UPDATE
    USING ((auth.jwt() -> 'app_metadata' ->> 'is_admin') = 'true');

CREATE POLICY "Admins can insert admin settings"
    ON public.admin_settings FOR INSERT
    WITH CHECK ((auth.jwt() -> 'app_metadata' ->> 'is_admin') = 'true');

-- STEP 16: updated_at trigger for admin_settings
DROP TRIGGER IF EXISTS set_admin_settings_updated_at ON public.admin_settings;
CREATE TRIGGER set_admin_settings_updated_at
    BEFORE UPDATE ON public.admin_settings
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

-- STEP 17: Admin helpers
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

-- STEP 18: Shiny rank helper
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

-- STEP 19: Trophy recalculation helper
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

-- STEP 15: Create indexes for performance
CREATE INDEX idx_catches_user_id ON public.catches(user_id);
CREATE INDEX idx_catches_is_public ON public.catches(is_public);
CREATE INDEX idx_catches_date ON public.catches(date);
CREATE INDEX idx_profiles_username ON public.profiles(username);
CREATE INDEX idx_friendships_user_id ON public.friendships(user_id);
CREATE INDEX idx_friendships_friend_id ON public.friendships(friend_id);
CREATE INDEX idx_catch_likes_catch_id ON public.catch_likes(catch_id);
CREATE INDEX idx_catch_likes_user_id ON public.catch_likes(user_id);
CREATE INDEX idx_catch_comments_catch_id ON public.catch_comments(catch_id);
CREATE INDEX idx_activities_user_id ON public.activities(user_id);

-- STEP 16: Create auto-profile trigger
CREATE OR REPLACE FUNCTION create_profile_for_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, username)
    VALUES (NEW.id, SPLIT_PART(NEW.email, '@', 1))
    ON CONFLICT (id) DO NOTHING;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER create_profile_trigger
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION create_profile_for_user();

-- STEP 17: Create likes count triggers
CREATE OR REPLACE FUNCTION increment_likes_count()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE public.catches
    SET likes_count = likes_count + 1
    WHERE id = NEW.catch_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER increment_likes_trigger
    AFTER INSERT ON public.catch_likes
    FOR EACH ROW
    EXECUTE FUNCTION increment_likes_count();

CREATE OR REPLACE FUNCTION decrement_likes_count()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE public.catches
    SET likes_count = likes_count - 1
    WHERE id = OLD.catch_id;
    RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER decrement_likes_trigger
    AFTER DELETE ON public.catch_likes
    FOR EACH ROW
    EXECUTE FUNCTION decrement_likes_count();

-- STEP 18: Create comments count triggers
CREATE OR REPLACE FUNCTION increment_comments_count()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE public.catches
    SET comments_count = comments_count + 1
    WHERE id = NEW.catch_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER increment_comments_trigger
    AFTER INSERT ON public.catch_comments
    FOR EACH ROW
    EXECUTE FUNCTION increment_comments_count();

CREATE OR REPLACE FUNCTION decrement_comments_count()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE public.catches
    SET comments_count = comments_count - 1
    WHERE id = OLD.catch_id;
    RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER decrement_comments_trigger
    AFTER DELETE ON public.catch_comments
    FOR EACH ROW
    EXECUTE FUNCTION decrement_comments_count();

-- STEP 19: Create activity trigger
CREATE OR REPLACE FUNCTION create_activity_for_catch()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.is_public = true THEN
        INSERT INTO public.activities (user_id, activity_type, catch_id, metadata)
        VALUES (
            NEW.user_id,
            'catch',
            NEW.id,
            jsonb_build_object(
                'species', NEW.species,
                'length', NEW.length,
                'photo_url', NEW.photo_url
            )
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER create_activity_trigger
    AFTER INSERT ON public.catches
    FOR EACH ROW
    EXECUTE FUNCTION create_activity_for_catch();

-- STEP 20: Create storage bucket for photos
INSERT INTO storage.buckets (id, name, public)
VALUES ('fish-photos', 'fish-photos', true)
ON CONFLICT (id) DO NOTHING;

-- STEP 21: Storage policies
CREATE POLICY "Anyone can view photos"
    ON storage.objects FOR SELECT
    USING (bucket_id = 'fish-photos');

CREATE POLICY "Authenticated users can upload photos"
    ON storage.objects FOR INSERT
    WITH CHECK (bucket_id = 'fish-photos' AND auth.role() = 'authenticated');

CREATE POLICY "Users can update own photos"
    ON storage.objects FOR UPDATE
    USING (bucket_id = 'fish-photos' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete own photos"
    ON storage.objects FOR DELETE
    USING (bucket_id = 'fish-photos' AND auth.uid()::text = (storage.foldername(name))[1]);

-- ============================================
-- FERTIG! ✅
-- ============================================
-- Jetzt sollten alle Tabellen, Trigger und Policies existieren!
