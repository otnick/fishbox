-- Admin settings table for Shiny tuning
CREATE TABLE IF NOT EXISTS public.admin_settings (
    id SMALLINT PRIMARY KEY DEFAULT 1,
    shiny_lucky_chance NUMERIC NOT NULL DEFAULT 0.02,
    shiny_percentile NUMERIC NOT NULL DEFAULT 0.95,
    shiny_min_history INTEGER NOT NULL DEFAULT 8,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

INSERT INTO public.admin_settings (id)
VALUES (1)
ON CONFLICT (id) DO NOTHING;

ALTER TABLE public.admin_settings ENABLE ROW LEVEL SECURITY;

-- Authenticated users can read settings
DROP POLICY IF EXISTS "Authenticated can view admin settings" ON public.admin_settings;
CREATE POLICY "Authenticated can view admin settings"
    ON public.admin_settings FOR SELECT
    USING (auth.role() = 'authenticated');

-- Only admins can update settings
DROP POLICY IF EXISTS "Admins can update admin settings" ON public.admin_settings;
CREATE POLICY "Admins can update admin settings"
    ON public.admin_settings FOR UPDATE
    USING ((auth.jwt() -> 'app_metadata' ->> 'is_admin') = 'true');

DROP POLICY IF EXISTS "Admins can insert admin settings" ON public.admin_settings;
CREATE POLICY "Admins can insert admin settings"
    ON public.admin_settings FOR INSERT
    WITH CHECK ((auth.jwt() -> 'app_metadata' ->> 'is_admin') = 'true');

DROP TRIGGER IF EXISTS set_admin_settings_updated_at ON public.admin_settings;
CREATE TRIGGER set_admin_settings_updated_at
    BEFORE UPDATE ON public.admin_settings
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();
