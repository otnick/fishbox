-- ============================================
-- FISHDEX: COUNT VERIFIED CATCHES ONLY
-- Applies to INSERT/UPDATE/DELETE on catches
-- ============================================

CREATE OR REPLACE FUNCTION update_fishdex_on_catch()
RETURNS TRIGGER AS $$
DECLARE
  v_species_id UUID;
  v_user_id UUID;
  v_species_name TEXT;
  v_existing_record RECORD;
  v_remaining_catches INTEGER;
  v_first_catch_id UUID;
  v_biggest_length INTEGER;
  v_biggest_weight INTEGER;
  v_last_caught_at TIMESTAMPTZ;
BEGIN
  IF TG_OP = 'DELETE' THEN
    v_user_id := OLD.user_id;
    v_species_name := OLD.species;
  ELSE
    v_user_id := NEW.user_id;
    v_species_name := NEW.species;
  END IF;

  -- Find species by name
  SELECT id INTO v_species_id
  FROM fish_species
  WHERE LOWER(name) = LOWER(v_species_name)
  LIMIT 1;

  IF v_species_id IS NULL THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  -- Count remaining eligible catches (verified only)
  SELECT COUNT(*) INTO v_remaining_catches
  FROM catches
  WHERE user_id = v_user_id
    AND LOWER(species) = LOWER(v_species_name)
    AND (verification_status = 'verified' OR ai_verified = true);

  IF v_remaining_catches = 0 THEN
    DELETE FROM user_fishdex
    WHERE user_id = v_user_id AND species_id = v_species_id;

    RETURN COALESCE(NEW, OLD);
  END IF;

  -- Aggregate stats (verified only)
  SELECT id INTO v_first_catch_id
  FROM catches
  WHERE user_id = v_user_id
    AND LOWER(species) = LOWER(v_species_name)
    AND (verification_status = 'verified' OR ai_verified = true)
  ORDER BY date ASC
  LIMIT 1;

  SELECT MAX(length) INTO v_biggest_length
  FROM catches
  WHERE user_id = v_user_id
    AND LOWER(species) = LOWER(v_species_name)
    AND (verification_status = 'verified' OR ai_verified = true);

  SELECT MAX(weight) INTO v_biggest_weight
  FROM catches
  WHERE user_id = v_user_id
    AND LOWER(species) = LOWER(v_species_name)
    AND (verification_status = 'verified' OR ai_verified = true);

  SELECT MAX(date) INTO v_last_caught_at
  FROM catches
  WHERE user_id = v_user_id
    AND LOWER(species) = LOWER(v_species_name)
    AND (verification_status = 'verified' OR ai_verified = true);

  SELECT * INTO v_existing_record
  FROM user_fishdex
  WHERE user_id = v_user_id AND species_id = v_species_id;

  IF v_existing_record IS NULL THEN
    INSERT INTO user_fishdex (
      user_id,
      species_id,
      first_catch_id,
      total_caught,
      biggest_length,
      biggest_weight,
      last_caught_at
    ) VALUES (
      v_user_id,
      v_species_id,
      v_first_catch_id,
      v_remaining_catches,
      v_biggest_length,
      v_biggest_weight,
      v_last_caught_at
    );

    PERFORM check_fishdex_achievements(v_user_id);
  ELSE
    UPDATE user_fishdex
    SET
      total_caught = v_remaining_catches,
      first_catch_id = v_first_catch_id,
      biggest_length = v_biggest_length,
      biggest_weight = v_biggest_weight,
      last_caught_at = v_last_caught_at,
      updated_at = NOW()
    WHERE user_id = v_user_id AND species_id = v_species_id;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_update_fishdex_on_catch ON catches;
CREATE TRIGGER trigger_update_fishdex_on_catch
  AFTER INSERT OR UPDATE OR DELETE ON catches
  FOR EACH ROW
  EXECUTE FUNCTION update_fishdex_on_catch();

GRANT EXECUTE ON FUNCTION update_fishdex_on_catch TO authenticated;
