-- Rate limit public reservation inserts: max 5 per email per 10 minutes, max 20 per hotel per 10 minutes
CREATE OR REPLACE FUNCTION public.rate_limit_public_reservations()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_recent_count integer;
BEGIN
  -- Only rate-limit unauthenticated (public portal) inserts
  IF auth.uid() IS NOT NULL THEN
    RETURN NEW;
  END IF;

  -- Count recent reservations from same email in last 10 minutes
  IF NEW.guest_email IS NOT NULL AND NEW.guest_email != '' THEN
    SELECT COUNT(*) INTO v_recent_count
    FROM reservations
    WHERE guest_email = NEW.guest_email
      AND created_at > (now() - interval '10 minutes');

    IF v_recent_count >= 5 THEN
      RAISE EXCEPTION 'Too many booking attempts. Please try again later.';
    END IF;
  END IF;

  -- Also rate-limit by hotel_id (max 20 public bookings per 10 minutes per hotel)
  SELECT COUNT(*) INTO v_recent_count
  FROM reservations
  WHERE hotel_id = NEW.hotel_id
    AND booking_source = 'website'
    AND created_at > (now() - interval '10 minutes');

  IF v_recent_count >= 20 THEN
    RAISE EXCEPTION 'Booking system is busy. Please try again in a few minutes.';
  END IF;

  RETURN NEW;
END;
$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_rate_limit_public_reservations') THEN
    CREATE TRIGGER trg_rate_limit_public_reservations
      BEFORE INSERT ON reservations
      FOR EACH ROW
      EXECUTE FUNCTION rate_limit_public_reservations();
  END IF;
END;
$$;