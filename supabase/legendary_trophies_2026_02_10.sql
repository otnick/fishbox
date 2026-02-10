-- Legendary trophy helper (largest catch per species)
CREATE OR REPLACE FUNCTION public.get_species_max_length(
    species_name TEXT
)
RETURNS TABLE (
    max_length DOUBLE PRECISION,
    sample_size BIGINT
)
LANGUAGE SQL
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT
        MAX(length) AS max_length,
        COUNT(*)::BIGINT AS sample_size
    FROM public.catches
    WHERE species ILIKE species_name;
$$;

REVOKE ALL ON FUNCTION public.get_species_max_length(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_species_max_length(TEXT) TO authenticated;
