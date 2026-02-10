-- Social Features & Weather Data Migration
-- Run this AFTER the base schema

-- Add weather and social columns to catches table
ALTER TABLE public.catches 
ADD COLUMN IF NOT EXISTS weather JSONB,
ADD COLUMN IF NOT EXISTS is_public BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS likes_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS comments_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS is_shiny BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS shiny_reason TEXT;

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

-- Create user profiles table
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    bio TEXT,
    avatar_url TEXT,
    is_public BOOLEAN DEFAULT true,
    pinned_catch_ids UUID[] DEFAULT '{}'::uuid[],
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Trigger to auto-create profile on user signup
CREATE OR REPLACE FUNCTION create_profile_for_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, username)
    VALUES (
        NEW.id,
        SPLIT_PART(NEW.email, '@', 1)
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS create_profile_trigger ON auth.users;
CREATE TRIGGER create_profile_trigger
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION create_profile_for_user();

-- Create friendships table
CREATE TABLE IF NOT EXISTS public.friendships (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    friend_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    status TEXT DEFAULT 'pending', -- pending, accepted, rejected
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, friend_id)
);

-- Create likes table
CREATE TABLE IF NOT EXISTS public.catch_likes (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    catch_id UUID REFERENCES public.catches(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(catch_id, user_id)
);

-- Create comments table
CREATE TABLE IF NOT EXISTS public.catch_comments (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    catch_id UUID REFERENCES public.catches(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    comment TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create activity feed table
CREATE TABLE IF NOT EXISTS public.activities (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    activity_type TEXT NOT NULL, -- catch, like, comment, friend
    catch_id UUID REFERENCES public.catches(id) ON DELETE CASCADE,
    target_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS profiles_username_idx ON public.profiles(username);
CREATE INDEX IF NOT EXISTS friendships_user_id_idx ON public.friendships(user_id);
CREATE INDEX IF NOT EXISTS friendships_friend_id_idx ON public.friendships(friend_id);
CREATE INDEX IF NOT EXISTS catch_likes_catch_id_idx ON public.catch_likes(catch_id);
CREATE INDEX IF NOT EXISTS catch_likes_user_id_idx ON public.catch_likes(user_id);
CREATE INDEX IF NOT EXISTS catch_comments_catch_id_idx ON public.catch_comments(catch_id);
CREATE INDEX IF NOT EXISTS activities_user_id_idx ON public.activities(user_id);
CREATE INDEX IF NOT EXISTS activities_created_at_idx ON public.activities(created_at DESC);

-- Enable RLS on new tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.friendships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.catch_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.catch_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_settings ENABLE ROW LEVEL SECURITY;

-- RLS Policies for profiles
CREATE POLICY "Public profiles are viewable by everyone"
    ON public.profiles FOR SELECT
    USING (is_public = true OR auth.uid() = id);

CREATE POLICY "Users can update own profile"
    ON public.profiles FOR UPDATE
    USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
    ON public.profiles FOR INSERT
    WITH CHECK (auth.uid() = id);

-- RLS Policies for friendships
CREATE POLICY "Users can view own friendships"
    ON public.friendships FOR SELECT
    USING (auth.uid() = user_id OR auth.uid() = friend_id);

CREATE POLICY "Users can create friendships"
    ON public.friendships FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own friendship requests"
    ON public.friendships FOR UPDATE
    USING (auth.uid() = user_id OR auth.uid() = friend_id);

-- RLS Policies for catch_likes
CREATE POLICY "Everyone can view likes"
    ON public.catch_likes FOR SELECT
    USING (true);

CREATE POLICY "Users can like catches"
    ON public.catch_likes FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own likes"
    ON public.catch_likes FOR DELETE
    USING (auth.uid() = user_id);

-- RLS Policies for catch_comments
CREATE POLICY "Everyone can view comments on public catches"
    ON public.catch_comments FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.catches
            WHERE catches.id = catch_comments.catch_id
            AND (catches.is_public = true OR catches.user_id = auth.uid())
        )
    );

CREATE POLICY "Users can comment on public catches"
    ON public.catch_comments FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own comments"
    ON public.catch_comments FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own comments"
    ON public.catch_comments FOR DELETE
    USING (auth.uid() = user_id);

-- RLS Policies for activities
CREATE POLICY "Users can view activities from friends and own"
    ON public.activities FOR SELECT
    USING (
        auth.uid() = user_id OR
        EXISTS (
            SELECT 1 FROM public.friendships
            WHERE (friendships.user_id = auth.uid() AND friendships.friend_id = activities.user_id)
            OR (friendships.friend_id = auth.uid() AND friendships.user_id = activities.user_id)
            AND friendships.status = 'accepted'
        )
    );

CREATE POLICY "Users can create activities"
    ON public.activities FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- RLS Policies for admin settings
CREATE POLICY "Authenticated can view admin settings"
    ON public.admin_settings FOR SELECT
    USING (auth.role() = 'authenticated');

CREATE POLICY "Admins can update admin settings"
    ON public.admin_settings FOR UPDATE
    USING ((auth.jwt() -> 'app_metadata' ->> 'is_admin') = 'true');

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

-- Update catches policy to allow viewing public catches
DROP POLICY IF EXISTS "Users can view own catches" ON public.catches;

CREATE POLICY "Users can view own and public catches"
    ON public.catches FOR SELECT
    USING (
        auth.uid() = user_id OR
        is_public = true OR
        EXISTS (
            SELECT 1 FROM public.friendships
            WHERE (friendships.user_id = auth.uid() AND friendships.friend_id = catches.user_id)
            OR (friendships.friend_id = auth.uid() AND friendships.user_id = catches.user_id)
            AND friendships.status = 'accepted'
        )
    );

-- Trigger to update likes_count
CREATE OR REPLACE FUNCTION update_likes_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE public.catches
        SET likes_count = likes_count + 1
        WHERE id = NEW.catch_id;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE public.catches
        SET likes_count = GREATEST(0, likes_count - 1)
        WHERE id = OLD.catch_id;
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS catch_likes_count_trigger ON public.catch_likes;
CREATE TRIGGER catch_likes_count_trigger
    AFTER INSERT OR DELETE ON public.catch_likes
    FOR EACH ROW
    EXECUTE FUNCTION update_likes_count();

-- Trigger to update comments_count
CREATE OR REPLACE FUNCTION update_comments_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE public.catches
        SET comments_count = comments_count + 1
        WHERE id = NEW.catch_id;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE public.catches
        SET comments_count = GREATEST(0, comments_count - 1)
        WHERE id = OLD.catch_id;
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS catch_comments_count_trigger ON public.catch_comments;
CREATE TRIGGER catch_comments_count_trigger
    AFTER INSERT OR DELETE ON public.catch_comments
    FOR EACH ROW
    EXECUTE FUNCTION update_comments_count();

-- Function to create activity on new catch
CREATE OR REPLACE FUNCTION create_catch_activity()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.is_public = true THEN
        INSERT INTO public.activities (user_id, activity_type, catch_id)
        VALUES (NEW.user_id, 'catch', NEW.id);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS new_catch_activity_trigger ON public.catches;
CREATE TRIGGER new_catch_activity_trigger
    AFTER INSERT ON public.catches
    FOR EACH ROW
    EXECUTE FUNCTION create_catch_activity();
