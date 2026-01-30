-- ============================================
-- FISHDEX MIGRATION
-- Gamification: Pokemon-style fish collection
-- ============================================

-- Fish Species Catalog (Master Data)
CREATE TABLE IF NOT EXISTS fish_species (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  scientific_name TEXT,
  region TEXT NOT NULL, -- 'deutschland', 'europa', 'weltweit'
  habitat TEXT, -- 'freshwater', 'saltwater', 'brackish'
  rarity INTEGER DEFAULT 1 CHECK (rarity >= 1 AND rarity <= 5),
  description TEXT,
  hints TEXT, -- Tipps zum Fangen (für locked state)
  image_url TEXT,
  silhouette_url TEXT, -- For locked state
  min_length INTEGER,
  max_length INTEGER,
  min_weight INTEGER,
  max_weight INTEGER,
  closed_season TEXT, -- z.B. "15.02-30.04"
  baits TEXT[], -- Empfohlene Köder
  best_time TEXT, -- z.B. "Dämmerung", "Nacht"
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- User's FishDex Progress
CREATE TABLE IF NOT EXISTS user_fishdex (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  species_id UUID REFERENCES fish_species(id) ON DELETE CASCADE,
  discovered_at TIMESTAMPTZ DEFAULT NOW(),
  first_catch_id UUID REFERENCES catches(id),
  total_caught INTEGER DEFAULT 1,
  biggest_length INTEGER,
  biggest_weight INTEGER,
  last_caught_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, species_id)
);

-- Achievements
CREATE TABLE IF NOT EXISTS achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  icon TEXT, -- Emoji oder Icon name
  category TEXT, -- 'collection', 'skill', 'social', 'special'
  requirement JSONB, -- Conditions to unlock
  xp_reward INTEGER DEFAULT 0,
  badge_color TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- User Achievements
CREATE TABLE IF NOT EXISTS user_achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  achievement_id UUID REFERENCES achievements(id) ON DELETE CASCADE,
  unlocked_at TIMESTAMPTZ DEFAULT NOW(),
  progress JSONB, -- For tracking progress towards achievement
  UNIQUE(user_id, achievement_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_fish_species_region ON fish_species(region);
CREATE INDEX IF NOT EXISTS idx_fish_species_rarity ON fish_species(rarity);
CREATE INDEX IF NOT EXISTS idx_user_fishdex_user ON user_fishdex(user_id);
CREATE INDEX IF NOT EXISTS idx_user_fishdex_species ON user_fishdex(species_id);
CREATE INDEX IF NOT EXISTS idx_user_achievements_user ON user_achievements(user_id);

-- RLS Policies
ALTER TABLE fish_species ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_fishdex ENABLE ROW LEVEL SECURITY;
ALTER TABLE achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_achievements ENABLE ROW LEVEL SECURITY;

-- fish_species: Public read
CREATE POLICY "Fish species are viewable by everyone"
  ON fish_species FOR SELECT
  USING (true);

-- user_fishdex: Users can read own progress
CREATE POLICY "Users can view own fishdex"
  ON user_fishdex FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own fishdex"
  ON user_fishdex FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own fishdex"
  ON user_fishdex FOR UPDATE
  USING (auth.uid() = user_id);

-- achievements: Public read
CREATE POLICY "Achievements are viewable by everyone"
  ON achievements FOR SELECT
  USING (true);

-- user_achievements: Users can read own
CREATE POLICY "Users can view own achievements"
  ON user_achievements FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own achievements"
  ON user_achievements FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- ============================================
-- SEED DATA: Deutschland Fische
-- ============================================

INSERT INTO fish_species (name, scientific_name, region, habitat, rarity, description, hints, min_length, max_length, closed_season, baits, best_time) VALUES
-- Raubfische (Common-Uncommon)
('Hecht', 'Esox lucius', 'deutschland', 'freshwater', 2, 'Räuberischer Süßwasserfisch mit langgestrecktem Körper und Entenschnabel-förmigem Maul.', 'Besonders aktiv in der Dämmerung. Bevorzugt Uferbereiche mit Pflanzenbewuchs.', 40, 150, '15.02-30.04', ARRAY['Wobbler', 'Gummifisch', 'Blinker'], 'Dämmerung'),
('Zander', 'Sander lucioperca', 'deutschland', 'freshwater', 3, 'Nachtaktiver Raubfisch mit großen Augen und charakteristischen Stachelflossen.', 'Am besten in der Dämmerung und nachts. Bevorzugt tiefere Gewässerbereiche.', 40, 120, '01.04-31.05', ARRAY['Gummifisch', 'Wobbler', 'Köderfisch'], 'Nacht'),
('Barsch', 'Perca fluviatilis', 'deutschland', 'freshwater', 1, 'Gestreifter Raubfisch mit rötlichen Flossen. Jagt in Schwärmen.', 'Häufig in Ufernähe. Beißt fast auf alle kleinen Köder.', 15, 50, NULL, ARRAY['Wurm', 'Gummifisch', 'Spinner'], 'Tag'),
('Wels', 'Silurus glanis', 'deutschland', 'freshwater', 4, 'Größter europäischer Süßwasserfisch. Nachtaktiver Bodenjäger mit langen Barteln.', 'Sehr selten! Am besten nachts mit Köderfisch am Grund.', 100, 280, NULL, ARRAY['Köderfisch', 'Tauwurm', 'Tintenfisch'], 'Nacht'),

-- Friedfische (Common)
('Karpfen', 'Cyprinus carpio', 'deutschland', 'freshwater', 2, 'Beliebter Angelfisch mit kräftigem Körper. Kann sehr alt und groß werden.', 'Geduldig sein! Mag Mais, Boilies und Teig. Oft in ruhigen Gewässerbereichen.', 30, 120, NULL, ARRAY['Mais', 'Boilies', 'Teig'], 'Morgen'),
('Schleie', 'Tinca tinca', 'deutschland', 'freshwater', 2, 'Friedfisch mit olivgrüner Färbung und kleinen Schuppen.', 'Bevorzugt schlammige Gewässer mit Pflanzenbewuchs.', 20, 70, NULL, ARRAY['Wurm', 'Mais', 'Made'], 'Morgen'),
('Brassen', 'Abramis brama', 'deutschland', 'freshwater', 1, 'Hochrückiger Friedfisch. Bildet große Schwärme.', 'Sehr häufig! Mag ruhige, tiefere Bereiche.', 30, 80, NULL, ARRAY['Made', 'Wurm', 'Mais'], 'Tag'),
('Rotauge', 'Rutilus rutilus', 'deutschland', 'freshwater', 1, 'Kleiner Schwarmfisch mit roten Augen. Sehr häufig.', 'Perfekt für Anfänger! Beißt auf fast alles.', 15, 45, NULL, ARRAY['Made', 'Wurm', 'Brot'], 'Tag'),
('Rotfeder', 'Scardinius erythrophthalmus', 'deutschland', 'freshwater', 1, 'Ähnlich wie Rotauge, aber mit rötlicheren Flossen.', 'Oft in Oberflächennähe. Mag pflanzenbewachsene Bereiche.', 15, 40, NULL, ARRAY['Made', 'Brot', 'Teig'], 'Tag'),

-- Forellen (Uncommon-Rare)
('Bachforelle', 'Salmo trutta fario', 'deutschland', 'freshwater', 3, 'Anspruchsvoller Salmonide. Braucht sauberes, kaltes Wasser.', 'Nur in sauberen Bächen und Flüssen. Sehr vorsichtig!', 25, 80, '15.10-15.03', ARRAY['Wurm', 'Fliege', 'Spinner'], 'Morgen'),
('Regenbogenforelle', 'Oncorhynchus mykiss', 'deutschland', 'freshwater', 2, 'Importierte Forellenart mit charakteristischem Regenbogen-Streifen.', 'Häufiger in Forellenseen. Beißt gut auf Teig und Blinker.', 25, 80, '15.10-15.03', ARRAY['Teig', 'Mais', 'Blinker'], 'Tag'),

-- Weißfische (Common)
('Döbel', 'Squalius cephalus', 'deutschland', 'freshwater', 2, 'Kräftiger Weißfisch. Vorsichtiger Allesfresser.', 'Intelligent und vorsichtig. Mag Strömung.', 30, 60, NULL, ARRAY['Wurm', 'Mais', 'Käse'], 'Tag'),
('Hasel', 'Leuciscus leuciscus', 'deutschland', 'freshwater', 1, 'Kleiner Schwarmfisch. Bevorzugt fließende Gewässer.', 'Häufig in Flüssen. Bildet große Schwärme.', 15, 30, NULL, ARRAY['Made', 'Wurm'], 'Tag'),
('Ukelei', 'Alburnus alburnus', 'deutschland', 'freshwater', 1, 'Sehr kleiner Oberflächenfisch mit silbriger Färbung.', 'Sehr häufig! Schwimmt in Oberflächennähe.', 10, 20, NULL, ARRAY['Made', 'Brot'], 'Tag'),

-- Besondere Arten (Rare-Legendary)
('Aal', 'Anguilla anguilla', 'deutschland', 'freshwater', 3, 'Schlangenförmiger Wanderfisch. Nachtaktiv.', 'Nur nachts! Am besten mit Wurm am Grund.', 40, 150, NULL, ARRAY['Tauwurm', 'Köderfisch'], 'Nacht'),
('Stör', 'Acipenser sturio', 'deutschland', 'freshwater', 5, 'Urzeitfisch! Extrem selten in Deutschland.', 'LEGENDÄR! Nur in wenigen Gewässern. Braucht spezielle Genehmigung!', 100, 300, 'Ganzjährig geschützt', ARRAY['Boilies', 'Pellets'], 'Tag'),
('Quappe', 'Lota lota', 'deutschland', 'freshwater', 4, 'Einziger Süßwasser-Dorsch. Sehr selten!', 'Nur im Winter aktiv! Nachtfischer in kaltem Wasser.', 30, 100, '15.02-30.06', ARRAY['Köderfisch', 'Wurm'], 'Nacht'),

-- Salzwasser (für spätere Erweiterung, einfache Beispiele)
('Dorsch', 'Gadus morhua', 'deutschland', 'saltwater', 2, 'Beliebter Speisefisch der Nord- und Ostsee.', 'Häufig in Ostsee und Nordsee. Bodennah.', 30, 120, NULL, ARRAY['Wattwurm', 'Fischfetzen'], 'Tag'),
('Makrele', 'Scomber scombrus', 'deutschland', 'saltwater', 2, 'Schneller Schwarmfisch. Wandert saisonal.', 'Im Sommer häufig an der Küste. Jagt in Schwärmen.', 30, 50, NULL, ARRAY['Paternoster', 'Blinker'], 'Tag'),
('Hering', 'Clupea harengus', 'deutschland', 'saltwater', 1, 'Kleiner Schwarmfisch. Wichtiger Speisefisch.', 'Sehr häufig! Bildet riesige Schwärme.', 20, 40, NULL, ARRAY['Heringsvorfach'], 'Tag');

-- ============================================
-- SEED DATA: Basic Achievements
-- ============================================

INSERT INTO achievements (name, description, icon, category, requirement, xp_reward, badge_color) VALUES
('Anfänger', 'Entdecke deine erste Fischart', '🎣', 'collection', '{"species_count": 1}', 50, 'bronze'),
('Kenner', 'Entdecke 5 verschiedene Fischarten', '🐟', 'collection', '{"species_count": 5}', 100, 'silver'),
('Experte', 'Entdecke 10 verschiedene Fischarten', '🎯', 'collection', '{"species_count": 10}', 200, 'gold'),
('Meister', 'Entdecke 25 verschiedene Fischarten', '👑', 'collection', '{"species_count": 25}', 500, 'platinum'),
('Deutschland Meister', 'Entdecke alle Deutschland-Fischarten', '🇩🇪', 'collection', '{"region": "deutschland", "complete": true}', 1000, 'diamond'),

('Nachtangler', 'Fange 5 Fische nach 20 Uhr', '🌙', 'skill', '{"night_catches": 5}', 150, 'silver'),
('Frühaufsteher', 'Fange 5 Fische vor 6 Uhr', '🌅', 'skill', '{"early_catches": 5}', 150, 'silver'),
('Raubfisch-Jäger', 'Fange alle Raubfische', '🦈', 'skill', '{"predator_fish": true}', 300, 'gold'),
('Friedfisch-Freund', 'Fange alle Friedfische', '🐠', 'skill', '{"peaceful_fish": true}', 300, 'gold'),

('Seltener Fang', 'Fange eine 4-Sterne Fischart', '⭐', 'special', '{"rarity": 4}', 250, 'gold'),
('Legendär', 'Fange eine 5-Sterne Fischart', '💎', 'special', '{"rarity": 5}', 500, 'diamond'),
('Riesen-Fang', 'Fange einen Fisch über 100cm', '📏', 'special', '{"length": 100}', 200, 'gold'),
('Schwergewicht', 'Fange einen Fisch über 10kg', '⚖️', 'special', '{"weight": 10000}', 200, 'gold');

-- ============================================
-- FUNCTIONS
-- ============================================

-- Function to check and unlock achievements
CREATE OR REPLACE FUNCTION check_fishdex_achievements(p_user_id UUID)
RETURNS void AS $$
DECLARE
  v_species_count INTEGER;
  v_achievement_id UUID;
BEGIN
  -- Count discovered species
  SELECT COUNT(*) INTO v_species_count
  FROM user_fishdex
  WHERE user_id = p_user_id;

  -- Check "Anfänger" (1 species)
  IF v_species_count >= 1 THEN
    SELECT id INTO v_achievement_id FROM achievements WHERE name = 'Anfänger';
    INSERT INTO user_achievements (user_id, achievement_id)
    VALUES (p_user_id, v_achievement_id)
    ON CONFLICT (user_id, achievement_id) DO NOTHING;
  END IF;

  -- Check "Kenner" (5 species)
  IF v_species_count >= 5 THEN
    SELECT id INTO v_achievement_id FROM achievements WHERE name = 'Kenner';
    INSERT INTO user_achievements (user_id, achievement_id)
    VALUES (p_user_id, v_achievement_id)
    ON CONFLICT (user_id, achievement_id) DO NOTHING;
  END IF;

  -- Check "Experte" (10 species)
  IF v_species_count >= 10 THEN
    SELECT id INTO v_achievement_id FROM achievements WHERE name = 'Experte';
    INSERT INTO user_achievements (user_id, achievement_id)
    VALUES (p_user_id, v_achievement_id)
    ON CONFLICT (user_id, achievement_id) DO NOTHING;
  END IF;

  -- Check "Meister" (25 species)
  IF v_species_count >= 25 THEN
    SELECT id INTO v_achievement_id FROM achievements WHERE name = 'Meister';
    INSERT INTO user_achievements (user_id, achievement_id)
    VALUES (p_user_id, v_achievement_id)
    ON CONFLICT (user_id, achievement_id) DO NOTHING;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to update user_fishdex when catch is created
CREATE OR REPLACE FUNCTION update_fishdex_on_catch()
RETURNS TRIGGER AS $$
DECLARE
  v_species_id UUID;
  v_existing_record RECORD;
BEGIN
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
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger
DROP TRIGGER IF EXISTS trigger_update_fishdex_on_catch ON catches;
CREATE TRIGGER trigger_update_fishdex_on_catch
  AFTER INSERT ON catches
  FOR EACH ROW
  EXECUTE FUNCTION update_fishdex_on_catch();

-- Grant permissions
GRANT EXECUTE ON FUNCTION check_fishdex_achievements TO authenticated;
GRANT EXECUTE ON FUNCTION update_fishdex_on_catch TO authenticated;
