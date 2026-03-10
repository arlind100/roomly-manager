
-- Add payment_method column to reservations for walk-in bookings
ALTER TABLE public.reservations ADD COLUMN IF NOT EXISTS payment_method text DEFAULT NULL;
