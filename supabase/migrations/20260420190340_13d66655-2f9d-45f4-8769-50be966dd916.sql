DROP POLICY "Anyone can insert checks" ON public.checks;
-- Inserts only via edge function with service_role (bypasses RLS)