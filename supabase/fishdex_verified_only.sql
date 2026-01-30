-- ============================================
-- FISHDEX VERIFICATION UPDATE
-- Update trigger to only count AI-verified catches
-- ============================================

-- Update the trigger function to check verification_status
CREATE OR REPLACE FUNCTION update_fishdex_on_catch()
RETURNS TRIGGER AS $$
DECLARE
  v_species_id UUID;
  v_existing_record RECORD;
BEGIN
  -- CRITICAL: Only process AI-verified catches (verification_status = 'verified')
  -- Manual catches do NOT unlock FishDex entries
  IF NEW.verification_status != 'verified' THEN
    RETURN NEW;
  END IF;

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
      -- Update existing record (only if this catch is bigger)
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
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate trigger (in case it was dropped)
DROP TRIGGER IF EXISTS trigger_update_fishdex_on_catch ON catches;
CREATE TRIGGER trigger_update_fishdex_on_catch
  AFTER INSERT ON catches
  FOR EACH ROW
  EXECUTE FUNCTION update_fishdex_on_catch();

-- Grant permissions
GRANT EXECUTE ON FUNCTION update_fishdex_on_catch TO authenticated;

-- ============================================
-- UPDATE QUERY FILTERS
-- ============================================

-- Note: Frontend queries should also be updated to filter:
-- .in('verification_status', ['verified']) 
-- 
-- This means:
-- - FishDex only shows verified catches
-- - Manual catches are saved but don't unlock species
-- - Pending catches are ignored
