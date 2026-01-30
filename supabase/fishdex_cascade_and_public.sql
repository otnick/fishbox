-- ============================================
-- FISHDEX CASCADE DELETE + PUBLIC TOGGLE
-- Auto-delete FishDex entries when last catch is removed
-- Add public toggle for catches
-- ============================================

-- 1. Add is_public column to catches (if not exists)
ALTER TABLE catches 
ADD COLUMN IF NOT EXISTS is_public BOOLEAN DEFAULT false;

-- Create index for public catches queries
CREATE INDEX IF NOT EXISTS idx_catches_public ON catches(user_id, is_public) WHERE is_public = true;

-- ============================================
-- 2. FishDex Auto-Update Trigger
-- Updates user_fishdex when catches are deleted
-- ============================================

CREATE OR REPLACE FUNCTION update_fishdex_on_catch_delete()
RETURNS TRIGGER AS $$
DECLARE
  v_species_id UUID;
  v_remaining_catches INTEGER;
  v_biggest_catch RECORD;
BEGIN
  -- Only process verified catches (manual/pending don't affect FishDex)
  IF OLD.verification_status != 'verified' THEN
    RETURN OLD;
  END IF;

  -- Find species by name
  SELECT id INTO v_species_id
  FROM fish_species
  WHERE LOWER(name) = LOWER(OLD.species)
  LIMIT 1;

  IF v_species_id IS NULL THEN
    RETURN OLD;
  END IF;

  -- Count remaining verified catches of this species for this user
  SELECT COUNT(*) INTO v_remaining_catches
  FROM catches
  WHERE user_id = OLD.user_id
    AND species = OLD.species
    AND verification_status = 'verified'
    AND id != OLD.id; -- Exclude the one being deleted

  IF v_remaining_catches = 0 THEN
    -- No more verified catches - DELETE FishDex entry
    DELETE FROM user_fishdex
    WHERE user_id = OLD.user_id
      AND species_id = v_species_id;
    
    RAISE NOTICE 'Deleted FishDex entry for % (no more verified catches)', OLD.species;
  ELSE
    -- Still has catches - UPDATE with new stats
    SELECT 
      id,
      length,
      weight,
      date
    INTO v_biggest_catch
    FROM catches
    WHERE user_id = OLD.user_id
      AND species = OLD.species
      AND verification_status = 'verified'
      AND id != OLD.id
    ORDER BY length DESC
    LIMIT 1;

    UPDATE user_fishdex
    SET
      total_caught = v_remaining_catches,
      biggest_length = v_biggest_catch.length,
      biggest_weight = COALESCE(v_biggest_catch.weight, 0),
      last_caught_at = v_biggest_catch.date,
      first_catch_id = CASE 
        WHEN first_catch_id = OLD.id THEN v_biggest_catch.id
        ELSE first_catch_id
      END,
      updated_at = NOW()
    WHERE user_id = OLD.user_id
      AND species_id = v_species_id;
    
    RAISE NOTICE 'Updated FishDex entry for % (% catches remaining)', OLD.species, v_remaining_catches;
  END IF;

  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for delete
DROP TRIGGER IF EXISTS trigger_update_fishdex_on_catch_delete ON catches;
CREATE TRIGGER trigger_update_fishdex_on_catch_delete
  BEFORE DELETE ON catches
  FOR EACH ROW
  EXECUTE FUNCTION update_fishdex_on_catch_delete();

-- Grant permissions
GRANT EXECUTE ON FUNCTION update_fishdex_on_catch_delete TO authenticated;

-- ============================================
-- 3. RLS Policy for Public Catches
-- ============================================

-- Allow users to see public catches from others
DROP POLICY IF EXISTS "Public catches are viewable by everyone" ON catches;
CREATE POLICY "Public catches are viewable by everyone"
  ON catches FOR SELECT
  USING (
    is_public = true 
    OR auth.uid() = user_id  -- User can always see their own catches
  );

-- ============================================
-- TESTING QUERIES
-- ============================================

-- Test: Delete a catch and check FishDex
-- DELETE FROM catches WHERE id = 'some-catch-id';
-- SELECT * FROM user_fishdex WHERE user_id = 'some-user-id';

-- Test: Toggle public
-- UPDATE catches SET is_public = true WHERE id = 'some-catch-id';
-- SELECT * FROM catches WHERE is_public = true;

-- Test: Count public catches per user
-- SELECT user_id, COUNT(*) as public_catches 
-- FROM catches 
-- WHERE is_public = true 
-- GROUP BY user_id;
