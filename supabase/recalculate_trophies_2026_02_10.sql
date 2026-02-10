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
