
-- Drop the old trigger (it may or may not exist)
DROP TRIGGER IF EXISTS validate_reservation_before_insert ON public.reservations;
DROP TRIGGER IF EXISTS validate_reservation_insert_trigger ON public.reservations;

-- Replace the function with admin-aware version
CREATE OR REPLACE FUNCTION public.validate_reservation_insert()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
  IF NEW.guest_email IS NOT NULL AND NEW.guest_email != '' AND NEW.guest_email !~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$' THEN
    RAISE EXCEPTION 'Invalid email format';
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

  -- For authenticated admin/manager users, allow any status they set
  -- For unauthenticated (public portal) users, force pending + website source
  IF auth.uid() IS NULL THEN
    -- Public portal insert
    NEW.status := 'pending';
    NEW.booking_source := 'website';
    NEW.is_external := false;
    -- Public inserts cannot have past check-in dates
    IF NEW.check_in < CURRENT_DATE THEN
      RAISE EXCEPTION 'check_in cannot be in the past';
    END IF;
  ELSE
    -- Authenticated user (admin/manager) - allow the status they set
    -- Only validate check_in not in past for non-walk-in bookings
    IF NEW.booking_source != 'walk-in' AND NEW.check_in < CURRENT_DATE THEN
      RAISE EXCEPTION 'check_in cannot be in the past';
    END IF;
  END IF;

  RETURN NEW;
END;
$function$;

-- Recreate the trigger
CREATE TRIGGER validate_reservation_before_insert
  BEFORE INSERT ON public.reservations
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_reservation_insert();
