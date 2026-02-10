-- Global shiny percentile helper (all public catches)
CREATE OR REPLACE FUNCTION public.get_species_length_percentile(
    species_name TEXT,
    percentile_value DOUBLE PRECISION DEFAULT 0.95
)
RETURNS TABLE (
    threshold_length DOUBLE PRECISION,
    sample_size BIGINT
)
LANGUAGE SQL
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT
        percentile_cont(percentile_value) WITHIN GROUP (ORDER BY length) AS threshold_length,
        COUNT(*)::BIGINT AS sample_size
    FROM public.catches
    WHERE species ILIKE species_name;
$$;

REVOKE ALL ON FUNCTION public.get_species_length_percentile(TEXT, DOUBLE PRECISION) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_species_length_percentile(TEXT, DOUBLE PRECISION) TO authenticated;
