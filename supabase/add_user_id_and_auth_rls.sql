-- Applied via Supabase MCP (add_user_id_and_auth_rls).
-- Kept as a record of per-user RLS for saju_readings.

ALTER TABLE public.saju_readings
  ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users (id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS saju_readings_user_id_idx
  ON public.saju_readings (user_id);

DROP POLICY IF EXISTS "anon can read saju_readings" ON public.saju_readings;
DROP POLICY IF EXISTS "anon can insert saju_readings" ON public.saju_readings;
DROP POLICY IF EXISTS "anon can update saju_readings" ON public.saju_readings;
DROP POLICY IF EXISTS "anon can delete saju_readings" ON public.saju_readings;

DROP POLICY IF EXISTS "Users can read own saju_readings" ON public.saju_readings;
DROP POLICY IF EXISTS "Users can insert own saju_readings" ON public.saju_readings;
DROP POLICY IF EXISTS "Users can update own saju_readings" ON public.saju_readings;
DROP POLICY IF EXISTS "Users can delete own saju_readings" ON public.saju_readings;

CREATE POLICY "Users can read own saju_readings"
  ON public.saju_readings
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own saju_readings"
  ON public.saju_readings
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own saju_readings"
  ON public.saju_readings
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own saju_readings"
  ON public.saju_readings
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);
