
-- 1. Update create_reservation_if_available to enforce guest capacity
CREATE OR REPLACE FUNCTION public.create_reservation_if_available(
  p_hotel_id uuid, p_room_type_id uuid, p_check_in date, p_check_out date,
  p_guest_name text, p_guest_email text DEFAULT NULL, p_guest_phone text DEFAULT NULL,
  p_guests_count integer DEFAULT 1, p_total_price numeric DEFAULT NULL,
  p_booking_source text DEFAULT 'direct', p_room_id uuid DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_available_units integer;
  v_max_guests integer;
  v_booked_count integer;
  v_blocked_count integer;
  v_reservation_id uuid;
BEGIN
  IF p_check_out <= p_check_in THEN
    RAISE EXCEPTION 'check_out must be after check_in';
  END IF;
  IF p_guest_name IS NULL OR trim(p_guest_name) = '' THEN
    RAISE EXCEPTION 'guest_name is required';
  END IF;

  -- Lock the room_type row to serialize concurrent bookings
  SELECT available_units, max_guests INTO v_available_units, v_max_guests
  FROM room_types
  WHERE id = p_room_type_id AND hotel_id = p_hotel_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Room type not found for this hotel';
  END IF;

  -- Enforce guest capacity
  IF p_guests_count > v_max_guests THEN
    RAISE EXCEPTION 'Guest count (%) exceeds room capacity of %', p_guests_count, v_max_guests;
  END IF;

  -- Count overlapping non-cancelled reservations
  SELECT COUNT(*) INTO v_booked_count
  FROM reservations
  WHERE room_type_id = p_room_type_id AND hotel_id = p_hotel_id
    AND status != 'cancelled' AND check_in < p_check_out AND check_out > p_check_in;

  -- Count blocked dates
  SELECT COUNT(DISTINCT date) INTO v_blocked_count
  FROM availability_blocks
  WHERE room_type_id = p_room_type_id AND hotel_id = p_hotel_id
    AND date >= p_check_in AND date < p_check_out;

  IF v_booked_count >= v_available_units THEN
    RAISE EXCEPTION 'No availability for this room type in the selected dates. % of % units booked.', v_booked_count, v_available_units;
  END IF;
  IF v_blocked_count > 0 THEN
    RAISE EXCEPTION 'Some dates in the selected range are blocked (% blocked dates).', v_blocked_count;
  END IF;

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

  IF p_room_id IS NOT NULL THEN
    UPDATE rooms SET operational_status = 'occupied', updated_at = now()
    WHERE id = p_room_id AND hotel_id = p_hotel_id;
  END IF;

  RETURN v_reservation_id;
END;
$function$;

-- 2. Create update_reservation_if_available RPC for conflict-safe edits
CREATE OR REPLACE FUNCTION public.update_reservation_if_available(
  p_reservation_id uuid,
  p_hotel_id uuid,
  p_room_type_id uuid,
  p_room_id uuid DEFAULT NULL,
  p_check_in date DEFAULT NULL,
  p_check_out date DEFAULT NULL,
  p_guest_name text DEFAULT NULL,
  p_guest_email text DEFAULT NULL,
  p_guest_phone text DEFAULT NULL,
  p_guests_count integer DEFAULT NULL,
  p_total_price numeric DEFAULT NULL,
  p_booking_source text DEFAULT NULL,
  p_special_requests text DEFAULT NULL,
  p_notes text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_old reservations%ROWTYPE;
  v_available_units integer;
  v_max_guests integer;
  v_booked_count integer;
  v_blocked_count integer;
  v_final_check_in date;
  v_final_check_out date;
  v_final_room_type_id uuid;
  v_final_guests_count integer;
BEGIN
  -- Get the existing reservation (locked)
  SELECT * INTO v_old FROM reservations
  WHERE id = p_reservation_id AND hotel_id = p_hotel_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Reservation not found';
  END IF;

  -- Determine final values
  v_final_check_in := COALESCE(p_check_in, v_old.check_in);
  v_final_check_out := COALESCE(p_check_out, v_old.check_out);
  v_final_room_type_id := COALESCE(p_room_type_id, v_old.room_type_id);
  v_final_guests_count := COALESCE(p_guests_count, v_old.guests_count);

  IF v_final_check_out <= v_final_check_in THEN
    RAISE EXCEPTION 'check_out must be after check_in';
  END IF;

  -- If dates or room type changed, re-validate availability
  IF v_final_check_in != v_old.check_in OR v_final_check_out != v_old.check_out
     OR v_final_room_type_id != v_old.room_type_id THEN

    SELECT available_units, max_guests INTO v_available_units, v_max_guests
    FROM room_types
    WHERE id = v_final_room_type_id AND hotel_id = p_hotel_id
    FOR UPDATE;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Room type not found for this hotel';
    END IF;

    IF v_final_guests_count > v_max_guests THEN
      RAISE EXCEPTION 'Guest count (%) exceeds room capacity of %', v_final_guests_count, v_max_guests;
    END IF;

    -- Count overlapping reservations EXCLUDING current one
    SELECT COUNT(*) INTO v_booked_count
    FROM reservations
    WHERE room_type_id = v_final_room_type_id AND hotel_id = p_hotel_id
      AND id != p_reservation_id
      AND status != 'cancelled'
      AND check_in < v_final_check_out AND check_out > v_final_check_in;

    SELECT COUNT(DISTINCT date) INTO v_blocked_count
    FROM availability_blocks
    WHERE room_type_id = v_final_room_type_id AND hotel_id = p_hotel_id
      AND date >= v_final_check_in AND date < v_final_check_out;

    IF v_booked_count >= v_available_units THEN
      RAISE EXCEPTION 'This change would create a booking conflict. % of % units already booked for these dates.', v_booked_count, v_available_units;
    END IF;
    IF v_blocked_count > 0 THEN
      RAISE EXCEPTION 'Some dates in the updated range are blocked (% blocked dates).', v_blocked_count;
    END IF;
  ELSE
    -- Even if dates didn't change, still validate guest capacity
    SELECT max_guests INTO v_max_guests
    FROM room_types WHERE id = v_final_room_type_id AND hotel_id = p_hotel_id;
    IF v_final_guests_count > v_max_guests THEN
      RAISE EXCEPTION 'Guest count (%) exceeds room capacity of %', v_final_guests_count, v_max_guests;
    END IF;
  END IF;

  -- Perform the update
  UPDATE reservations SET
    room_type_id = v_final_room_type_id,
    room_id = CASE WHEN p_room_id IS NOT NULL THEN NULLIF(p_room_id, '00000000-0000-0000-0000-000000000000') ELSE v_old.room_id END,
    check_in = v_final_check_in,
    check_out = v_final_check_out,
    guest_name = COALESCE(NULLIF(p_guest_name, ''), v_old.guest_name),
    guest_email = CASE WHEN p_guest_email IS NOT NULL THEN p_guest_email ELSE v_old.guest_email END,
    guest_phone = CASE WHEN p_guest_phone IS NOT NULL THEN p_guest_phone ELSE v_old.guest_phone END,
    guests_count = v_final_guests_count,
    total_price = COALESCE(p_total_price, v_old.total_price),
    booking_source = COALESCE(p_booking_source, v_old.booking_source),
    special_requests = CASE WHEN p_special_requests IS NOT NULL THEN p_special_requests ELSE v_old.special_requests END,
    notes = CASE WHEN p_notes IS NOT NULL THEN p_notes ELSE v_old.notes END,
    updated_at = now()
  WHERE id = p_reservation_id AND hotel_id = p_hotel_id;
END;
$function$;
