-- Helper to remove deleted catches from pinned arrays
CREATE OR REPLACE FUNCTION public.remove_pinned_catch(catch_id UUID)
RETURNS VOID
LANGUAGE SQL
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.profiles
  SET pinned_catch_ids = array_remove(pinned_catch_ids, catch_id)
  WHERE pinned_catch_ids @> ARRAY[catch_id];
$$;

REVOKE ALL ON FUNCTION public.remove_pinned_catch(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.remove_pinned_catch(UUID) TO service_role;
