
-- Add import-related columns to reservations
ALTER TABLE public.reservations
  ADD COLUMN IF NOT EXISTS external_reservation_id text,
  ADD COLUMN IF NOT EXISTS external_platform text,
  ADD COLUMN IF NOT EXISTS import_batch_id text,
  ADD COLUMN IF NOT EXISTS imported_at timestamptz,
  ADD COLUMN IF NOT EXISTS is_external boolean NOT NULL DEFAULT false;

-- Create import_logs table
CREATE TABLE public.import_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  import_batch_id text NOT NULL,
  filename text NOT NULL,
  imported_by uuid REFERENCES auth.users(id),
  imported_at timestamptz NOT NULL DEFAULT now(),
  records_imported integer NOT NULL DEFAULT 0,
  duplicates_detected integer NOT NULL DEFAULT 0,
  conflicts_detected integer NOT NULL DEFAULT 0,
  errors integer NOT NULL DEFAULT 0,
  hotel_id uuid REFERENCES public.hotels(id) NOT NULL
);

-- RLS for import_logs
CREATE POLICY "Admins can manage import_logs" ON public.import_logs FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Authenticated can read import_logs" ON public.import_logs FOR SELECT USING (true);
