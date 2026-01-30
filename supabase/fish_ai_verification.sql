  -- ============================================
  -- FISH AI VERIFICATION MIGRATION
  -- Add fields for AI-verified catches
  -- ============================================

  -- Add verification columns to catches table
  ALTER TABLE catches ADD COLUMN IF NOT EXISTS ai_verified BOOLEAN DEFAULT false;
  ALTER TABLE catches ADD COLUMN IF NOT EXISTS ai_species TEXT;
  ALTER TABLE catches ADD COLUMN IF NOT EXISTS ai_confidence DECIMAL(3,2);
  ALTER TABLE catches ADD COLUMN IF NOT EXISTS verified_at TIMESTAMPTZ;
  ALTER TABLE catches ADD COLUMN IF NOT EXISTS verification_status TEXT CHECK (verification_status IN ('pending', 'verified', 'rejected', 'manual'));

  -- Set default verification_status for existing catches
  UPDATE catches 
  SET verification_status = 'manual' 
  WHERE verification_status IS NULL;

  -- Add index for filtering verified catches
  CREATE INDEX IF NOT EXISTS idx_catches_ai_verified ON catches(ai_verified);
  CREATE INDEX IF NOT EXISTS idx_catches_verification_status ON catches(verification_status);

  -- Update FishDex trigger to only count verified catches
  DROP TRIGGER IF EXISTS trigger_update_fishdex_on_catch ON catches;

  CREATE OR REPLACE FUNCTION update_fishdex_on_catch()
  RETURNS TRIGGER AS $$
  DECLARE
    v_species_id UUID;
    v_existing_record RECORD;
    v_remaining_catches INTEGER;
  BEGIN
    -- Handle DELETE
    IF TG_OP = 'DELETE' THEN
      -- Only process if catch was verified
      IF OLD.ai_verified = true OR OLD.verification_status = 'manual' THEN
        -- Find species by name
        SELECT id INTO v_species_id
        FROM fish_species
        WHERE LOWER(name) = LOWER(OLD.species)
        LIMIT 1;

        IF v_species_id IS NOT NULL THEN
          -- Count remaining VERIFIED catches
          SELECT COUNT(*) INTO v_remaining_catches
          FROM catches
          WHERE user_id = OLD.user_id 
          AND LOWER(species) = LOWER(OLD.species)
          AND (ai_verified = true OR verification_status = 'manual');

          IF v_remaining_catches = 0 THEN
            -- No more verified catches - DELETE from FishDex
            DELETE FROM user_fishdex
            WHERE user_id = OLD.user_id AND species_id = v_species_id;
          ELSE
            -- Update stats with remaining verified catches
            UPDATE user_fishdex
            SET
              total_caught = v_remaining_catches,
              biggest_length = (
                SELECT MAX(length) FROM catches 
                WHERE user_id = OLD.user_id 
                AND LOWER(species) = LOWER(OLD.species)
                AND (ai_verified = true OR verification_status = 'manual')
              ),
              biggest_weight = (
                SELECT MAX(weight) FROM catches 
                WHERE user_id = OLD.user_id 
                AND LOWER(species) = LOWER(OLD.species)
                AND (ai_verified = true OR verification_status = 'manual')
              ),
              first_catch_id = CASE 
                WHEN first_catch_id = OLD.id THEN (
                  SELECT id FROM catches 
                  WHERE user_id = OLD.user_id 
                  AND LOWER(species) = LOWER(OLD.species)
                  AND (ai_verified = true OR verification_status = 'manual')
                  ORDER BY date ASC
                  LIMIT 1
                )
                ELSE first_catch_id
              END,
              updated_at = NOW()
            WHERE user_id = OLD.user_id AND species_id = v_species_id;
          END IF;
        END IF;
      END IF;

      RETURN OLD;
    END IF;

    -- Handle INSERT - only if verified
    IF TG_OP = 'INSERT' AND (NEW.ai_verified = true OR NEW.verification_status = 'manual') THEN
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
          -- First verified catch of this species!
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

    -- Handle UPDATE - if verification status changes to verified
    IF TG_OP = 'UPDATE' AND OLD.ai_verified = false AND NEW.ai_verified = true THEN
      -- Treat like INSERT
      SELECT id INTO v_species_id
      FROM fish_species
      WHERE LOWER(name) = LOWER(NEW.species)
      LIMIT 1;

      IF v_species_id IS NOT NULL THEN
        SELECT * INTO v_existing_record
        FROM user_fishdex
        WHERE user_id = NEW.user_id AND species_id = v_species_id;

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
            NEW.user_id,
            v_species_id,
            NEW.id,
            1,
            NEW.length,
            NEW.weight,
            NEW.date
          );

          PERFORM check_fishdex_achievements(NEW.user_id);
        ELSE
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

    RETURN NEW;
  END;
  $$ LANGUAGE plpgsql SECURITY DEFINER;

  -- Create trigger for INSERT, UPDATE, and DELETE
  CREATE TRIGGER trigger_update_fishdex_on_catch
    AFTER INSERT OR UPDATE OR DELETE ON catches
    FOR EACH ROW
    EXECUTE FUNCTION update_fishdex_on_catch();

  -- Add RLS policy for verification status
  CREATE POLICY "Users can update verification status of own catches"
    ON catches FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

  -- Function to re-verify a catch
  CREATE OR REPLACE FUNCTION reverify_catch(p_catch_id UUID, p_user_id UUID)
  RETURNS void AS $$
  BEGIN
    UPDATE catches
    SET 
      verification_status = 'pending',
      verified_at = NULL
    WHERE id = p_catch_id AND user_id = p_user_id;
  END;
  $$ LANGUAGE plpgsql SECURITY DEFINER;

  GRANT EXECUTE ON FUNCTION reverify_catch TO authenticated;

  -- Comments
  COMMENT ON COLUMN catches.ai_verified IS 'Whether the catch was verified by AI';
  COMMENT ON COLUMN catches.ai_species IS 'Species detected by AI';
  COMMENT ON COLUMN catches.ai_confidence IS 'AI confidence score (0-1)';
  COMMENT ON COLUMN catches.verified_at IS 'When the catch was verified';
  COMMENT ON COLUMN catches.verification_status IS 'pending, verified, rejected, or manual';
