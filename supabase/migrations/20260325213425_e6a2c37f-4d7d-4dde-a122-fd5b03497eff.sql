-- Atomic reservation creation function
-- Locks room_type row to prevent race conditions, checks availability, then inserts
CREATE OR REPLACE FUNCTION public.create_reservation_if_available(
  p_hotel_id uuid,
  p_room_type_id uuid,
  p_check_in date,
  p_check_out date,
  p_guest_name text,
  p_guest_email text DEFAULT NULL,
  p_guest_phone text DEFAULT NULL,
  p_guests_count integer DEFAULT 1,
  p_total_price numeric DEFAULT NULL,
  p_booking_source text DEFAULT 'direct',
  p_room_id uuid DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_available_units integer;
  v_booked_count integer;
  v_blocked_count integer;
  v_reservation_id uuid;
BEGIN
  -- Validate inputs
  IF p_check_out <= p_check_in THEN
    RAISE EXCEPTION 'check_out must be after check_in';
  END IF;

  IF p_guest_name IS NULL OR trim(p_guest_name) = '' THEN
    RAISE EXCEPTION 'guest_name is required';
  END IF;

  -- Lock the room_type row to serialize concurrent bookings
  SELECT available_units INTO v_available_units
  FROM room_types
  WHERE id = p_room_type_id AND hotel_id = p_hotel_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Room type not found for this hotel';
  END IF;

  -- Count overlapping non-cancelled reservations
  SELECT COUNT(*) INTO v_booked_count
  FROM reservations
  WHERE room_type_id = p_room_type_id
    AND hotel_id = p_hotel_id
    AND status != 'cancelled'
    AND check_in < p_check_out
    AND check_out > p_check_in;

  -- Count blocked dates in the range
  SELECT COUNT(DISTINCT date) INTO v_blocked_count
  FROM availability_blocks
  WHERE room_type_id = p_room_type_id
    AND hotel_id = p_hotel_id
    AND date >= p_check_in
    AND date < p_check_out;

  -- Check availability
  IF v_booked_count >= v_available_units THEN
    RAISE EXCEPTION 'No availability for this room type in the selected dates. % of % units booked.', v_booked_count, v_available_units;
  END IF;

  IF v_blocked_count > 0 THEN
    RAISE EXCEPTION 'Some dates in the selected range are blocked (% blocked dates).', v_blocked_count;
  END IF;

  -- Insert the reservation
  INSERT INTO reservations (
    hotel_id, room_type_id, room_id, check_in, check_out,
    guest_name, guest_email, guest_phone, guests_count,
    total_price, booking_source, status
  ) VALUES (
    p_hotel_id, p_room_type_id, p_room_id, p_check_in, p_check_out,
    p_guest_name, p_guest_email, p_guest_phone, p_guests_count,
    p_total_price, p_booking_source, 
    CASE WHEN p_booking_source = 'website' THEN 'pending' ELSE 'confirmed' END
  )
  RETURNING id INTO v_reservation_id;

  -- If room_id provided, mark room as occupied
  IF p_room_id IS NOT NULL THEN
    UPDATE rooms SET operational_status = 'occupied', updated_at = now()
    WHERE id = p_room_id AND hotel_id = p_hotel_id;
  END IF;

  RETURN v_reservation_id;
END;
$$;