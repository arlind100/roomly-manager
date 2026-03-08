
-- Fix: Make reservation insert require authenticated or allow anon with proper check
-- The public booking form needs anon insert, so we keep it but scope it to pending status only
DROP POLICY "Authenticated can insert reservations" ON public.reservations;
CREATE POLICY "Anyone can insert pending reservations" ON public.reservations 
  FOR INSERT WITH CHECK (status = 'pending');
