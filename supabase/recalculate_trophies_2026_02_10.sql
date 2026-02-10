-- Recalculate trophy catches based on current admin settings
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
  ranked AS (
    SELECT
      c.id,
      c.species,
      c.length,
      COUNT(*) OVER (PARTITION BY c.species) AS sample_size,
      ROW_NUMBER() OVER (PARTITION BY c.species ORDER BY c.length DESC, c.date ASC, c.id ASC) AS rn
    FROM public.catches c
  ),
  legendary_reset AS (
    UPDATE public.catches c
    SET is_shiny = false,
        shiny_reason = NULL
    WHERE c.shiny_reason = 'legendary'
    RETURNING c.id
  ),
  legendary AS (
    UPDATE public.catches c
    SET is_shiny = true,
        shiny_reason = 'legendary'
    FROM ranked r
    CROSS JOIN settings s
    WHERE c.id = r.id
      AND r.rn = 1
      AND r.sample_size >= s.shiny_min_history
    RETURNING c.id
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
      AND (c.shiny_reason IS DISTINCT FROM 'legendary')
    RETURNING c.id
  )
  SELECT COUNT(*)::INTEGER FROM updated;
$$;

REVOKE ALL ON FUNCTION public.recalculate_trophy_shinies() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.recalculate_trophy_shinies() TO service_role;
