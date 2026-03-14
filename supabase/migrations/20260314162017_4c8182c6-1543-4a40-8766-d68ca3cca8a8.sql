
-- Create rooms table for individual room management
CREATE TABLE public.rooms (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  hotel_id UUID NOT NULL REFERENCES public.hotels(id) ON DELETE CASCADE,
  room_type_id UUID NOT NULL REFERENCES public.room_types(id) ON DELETE CASCADE,
  room_number TEXT NOT NULL,
  floor TEXT,
  operational_status TEXT NOT NULL DEFAULT 'available',
  cleaning_started_at TIMESTAMP WITH TIME ZONE,
  cleaning_expected_done_at TIMESTAMP WITH TIME ZONE,
  notes TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(hotel_id, room_number)
);

-- Add cleaning_duration_minutes to hotels
ALTER TABLE public.hotels ADD COLUMN IF NOT EXISTS cleaning_duration_minutes INTEGER NOT NULL DEFAULT 120;

-- Add room_id to reservations (which specific room is assigned)
ALTER TABLE public.reservations ADD COLUMN IF NOT EXISTS room_id UUID REFERENCES public.rooms(id);

-- RLS for rooms
ALTER TABLE public.rooms ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read rooms" ON public.rooms FOR SELECT TO public USING (true);
CREATE POLICY "Admins can manage rooms" ON public.rooms FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Staff can update room status" ON public.rooms FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'staff'::app_role));
