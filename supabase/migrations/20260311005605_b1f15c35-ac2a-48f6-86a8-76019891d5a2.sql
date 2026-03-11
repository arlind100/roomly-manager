
-- Add a validation trigger for public reservation inserts to prevent spam/invalid data
CREATE OR REPLACE FUNCTION public.validate_reservation_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Validate required fields are not empty
  IF NEW.guest_name IS NULL OR trim(NEW.guest_name) = '' THEN
    RAISE EXCEPTION 'guest_name is required';
  END IF;

  -- Validate guest_name length
  IF length(NEW.guest_name) > 200 THEN
    RAISE EXCEPTION 'guest_name too long';
  END IF;

  -- Validate guest_email format if provided
  IF NEW.guest_email IS NOT NULL AND NEW.guest_email !~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$' THEN
    RAISE EXCEPTION 'Invalid email format';
  END IF;

  -- Validate check_in is not in the past (allow today)
  IF NEW.check_in < CURRENT_DATE THEN
    RAISE EXCEPTION 'check_in cannot be in the past';
  END IF;

  -- Validate check_out is after check_in
  IF NEW.check_out <= NEW.check_in THEN
    RAISE EXCEPTION 'check_out must be after check_in';
  END IF;

  -- Validate stay is not unreasonably long (max 90 days)
  IF (NEW.check_out - NEW.check_in) > 90 THEN
    RAISE EXCEPTION 'Stay cannot exceed 90 days';
  END IF;

  -- Validate guests_count is reasonable
  IF NEW.guests_count < 1 OR NEW.guests_count > 20 THEN
    RAISE EXCEPTION 'guests_count must be between 1 and 20';
  END IF;

  -- Validate hotel_id exists
  IF NOT EXISTS (SELECT 1 FROM public.hotels WHERE id = NEW.hotel_id) THEN
    RAISE EXCEPTION 'Invalid hotel_id';
  END IF;

  -- Validate room_type_id exists if provided
  IF NEW.room_type_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.room_types WHERE id = NEW.room_type_id AND hotel_id = NEW.hotel_id) THEN
    RAISE EXCEPTION 'Invalid room_type_id';
  END IF;

  -- Force status to pending for public inserts (belt-and-suspenders with RLS)
  NEW.status := 'pending';
  
  -- Force booking_source to website for unauthenticated inserts
  IF auth.uid() IS NULL THEN
    NEW.booking_source := 'website';
    NEW.is_external := false;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER validate_reservation_before_insert
  BEFORE INSERT ON public.reservations
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_reservation_insert();
