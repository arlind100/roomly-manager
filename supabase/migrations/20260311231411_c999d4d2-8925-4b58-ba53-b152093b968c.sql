
-- Add new fields to reservations for iCal sync and conflict detection
ALTER TABLE public.reservations 
  ADD COLUMN IF NOT EXISTS ical_uid TEXT,
  ADD COLUMN IF NOT EXISTS check_in_time TEXT,
  ADD COLUMN IF NOT EXISTS check_out_time TEXT,
  ADD COLUMN IF NOT EXISTS is_conflict BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS conflict_with_reservation_id UUID,
  ADD COLUMN IF NOT EXISTS conflict_reason TEXT;

-- Add conflict_policy to hotels
ALTER TABLE public.hotels 
  ADD COLUMN IF NOT EXISTS conflict_policy TEXT NOT NULL DEFAULT 'external_priority';

-- Create ical_feeds table
CREATE TABLE public.ical_feeds (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  hotel_id UUID NOT NULL REFERENCES public.hotels(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  ical_url TEXT NOT NULL,
  room_type_id UUID REFERENCES public.room_types(id) ON DELETE SET NULL,
  sync_enabled BOOLEAN NOT NULL DEFAULT true,
  priority_level INTEGER NOT NULL DEFAULT 1,
  last_sync TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.ical_feeds ENABLE ROW LEVEL SECURITY;

-- RLS policies for ical_feeds
CREATE POLICY "Admins can manage ical_feeds" ON public.ical_feeds
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Managers can read ical_feeds" ON public.ical_feeds
  FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'manager'::app_role));

-- Update reservations status constraint to include checked_in (idempotent)
ALTER TABLE public.reservations DROP CONSTRAINT IF EXISTS reservations_status_check;
ALTER TABLE public.reservations ADD CONSTRAINT reservations_status_check 
  CHECK (status = ANY (ARRAY['pending','confirmed','cancelled','completed','checked_in']));
