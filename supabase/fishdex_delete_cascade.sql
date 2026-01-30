-- ============================================
-- FISHDEX DELETE CASCADE & RESET
-- Allow deleting catches and reset FishDex entries
-- ============================================

-- First, drop the existing foreign key constraint
ALTER TABLE user_fishdex 
DROP CONSTRAINT IF EXISTS user_fishdex_first_catch_id_fkey;

-- Re-add with ON DELETE SET NULL
ALTER TABLE user_fishdex
ADD CONSTRAINT user_fishdex_first_catch_id_fkey
FOREIGN KEY (first_catch_id) 
REFERENCES catches(id) 
ON DELETE SET NULL;

-- Drop existing trigger to recreate with better logic
DROP TRIGGER IF EXISTS trigger_update_fishdex_on_catch ON catches;
DROP FUNCTION IF EXISTS update_fishdex_on_catch();

-- Create improved trigger function with delete handling
CREATE OR REPLACE FUNCTION update_fishdex_on_catch()
RETURNS TRIGGER AS $$
DECLARE
  v_species_id UUID;
  v_existing_record RECORD;
  v_remaining_catches INTEGER;
BEGIN
  -- Handle DELETE
  IF TG_OP = 'DELETE' THEN
    -- Find species by name
    SELECT id INTO v_species_id
    FROM fish_species
    WHERE LOWER(name) = LOWER(OLD.species)
    LIMIT 1;

    IF v_species_id IS NOT NULL THEN
      -- Check how many catches remain for this species
      SELECT COUNT(*) INTO v_remaining_catches
      FROM catches
      WHERE user_id = OLD.user_id 
      AND LOWER(species) = LOWER(OLD.species);

      IF v_remaining_catches = 0 THEN
        -- No more catches of this species - DELETE from FishDex
        DELETE FROM user_fishdex
        WHERE user_id = OLD.user_id AND species_id = v_species_id;
      ELSE
        -- Update stats with remaining catches
        -- Also update first_catch_id if the deleted catch was the first one
        UPDATE user_fishdex
        SET
          total_caught = v_remaining_catches,
          biggest_length = (
            SELECT MAX(length) FROM catches 
            WHERE user_id = OLD.user_id AND LOWER(species) = LOWER(OLD.species)
          ),
          biggest_weight = (
            SELECT MAX(weight) FROM catches 
            WHERE user_id = OLD.user_id AND LOWER(species) = LOWER(OLD.species)
          ),
          first_catch_id = CASE 
            WHEN first_catch_id = OLD.id THEN (
              SELECT id FROM catches 
              WHERE user_id = OLD.user_id AND LOWER(species) = LOWER(OLD.species)
              ORDER BY date ASC
              LIMIT 1
            )
            ELSE first_catch_id
          END,
          updated_at = NOW()
        WHERE user_id = OLD.user_id AND species_id = v_species_id;
      END IF;
    END IF;

    RETURN OLD;
  END IF;

  -- Handle INSERT (existing logic)
  IF TG_OP = 'INSERT' THEN
    -- Find species by name
    SELECT id INTO v_species_id
    FROM fish_species
    WHERE LOWER(name) = LOWER(NEW.species)
    LIMIT 1;

    -- If species exists in catalog
    IF v_species_id IS NOT NULL THEN
      -- Check if user already has this species
      SELECT * INTO v_existing_record
      FROM user_fishdex
      WHERE user_id = NEW.user_id AND species_id = v_species_id;

      IF v_existing_record IS NULL THEN
        -- First catch of this species!
        INSERT INTO user_fishdex (
          user_id,
          species_id,
          first_catch_id,
          total_caught,
          biggest_length,
          biggest_weight,
          last_caught_at
        ) VALUES (
          NEW.user_id,
          v_species_id,
          NEW.id,
          1,
          NEW.length,
          NEW.weight,
          NEW.date
        );

        -- Check achievements
        PERFORM check_fishdex_achievements(NEW.user_id);
      ELSE
        -- Update existing record
        UPDATE user_fishdex
        SET
          total_caught = total_caught + 1,
          biggest_length = GREATEST(biggest_length, NEW.length),
          biggest_weight = GREATEST(COALESCE(biggest_weight, 0), COALESCE(NEW.weight, 0)),
          last_caught_at = NEW.date,
          updated_at = NOW()
        WHERE user_id = NEW.user_id AND species_id = v_species_id;
      END IF;
    END IF;

    RETURN NEW;
  END IF;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for both INSERT and DELETE
CREATE TRIGGER trigger_update_fishdex_on_catch
  AFTER INSERT OR DELETE ON catches
  FOR EACH ROW
  EXECUTE FUNCTION update_fishdex_on_catch();

-- Function to manually reset FishDex entry
CREATE OR REPLACE FUNCTION reset_fishdex_entry(p_user_id UUID, p_species_name TEXT)
RETURNS void AS $$
DECLARE
  v_species_id UUID;
BEGIN
  -- Find species
  SELECT id INTO v_species_id
  FROM fish_species
  WHERE LOWER(name) = LOWER(p_species_name)
  LIMIT 1;

  IF v_species_id IS NOT NULL THEN
    -- Delete FishDex entry
    DELETE FROM user_fishdex
    WHERE user_id = p_user_id AND species_id = v_species_id;

    -- Delete all associated achievements (optional - comment out if you want to keep achievements)
    -- DELETE FROM user_achievements
    -- WHERE user_id = p_user_id
    -- AND achievement_id IN (
    --   SELECT id FROM achievements 
    --   WHERE requirement->>'species_count' IS NOT NULL
    -- );

    RAISE NOTICE 'FishDex entry for % reset for user %', p_species_name, p_user_id;
  ELSE
    RAISE EXCEPTION 'Species % not found', p_species_name;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to reset entire FishDex for a user
CREATE OR REPLACE FUNCTION reset_entire_fishdex(p_user_id UUID)
RETURNS void AS $$
BEGIN
  -- Delete all FishDex entries
  DELETE FROM user_fishdex WHERE user_id = p_user_id;

  -- Delete all achievements
  DELETE FROM user_achievements WHERE user_id = p_user_id;

  RAISE NOTICE 'Entire FishDex reset for user %', p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
GRANT EXECUTE ON FUNCTION update_fishdex_on_catch TO authenticated;
GRANT EXECUTE ON FUNCTION reset_fishdex_entry TO authenticated;
GRANT EXECUTE ON FUNCTION reset_entire_fishdex TO authenticated;

-- Update RLS policies to allow DELETE
DROP POLICY IF EXISTS "Users can delete own fishdex" ON user_fishdex;
CREATE POLICY "Users can delete own fishdex"
  ON user_fishdex FOR DELETE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own achievements" ON user_achievements;
CREATE POLICY "Users can delete own achievements"
  ON user_achievements FOR DELETE
  USING (auth.uid() = user_id);

-- Example usage:
-- Reset single species:
-- SELECT reset_fishdex_entry('YOUR_USER_ID', 'Hecht');

-- Reset entire FishDex:
-- SELECT reset_entire_fishdex('YOUR_USER_ID');