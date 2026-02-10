-- Global shiny rank helper
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
