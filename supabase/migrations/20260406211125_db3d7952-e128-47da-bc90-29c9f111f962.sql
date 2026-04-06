
-- ============================================
-- 1. Hotels table — new settings columns
-- ============================================
ALTER TABLE public.hotels
  ADD COLUMN IF NOT EXISTS child_pricing_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS child_price_type text NOT NULL DEFAULT 'percentage',
  ADD COLUMN IF NOT EXISTS child_price_value numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS no_show_cutoff_time text NOT NULL DEFAULT '23:00',
  ADD COLUMN IF NOT EXISTS night_audit_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS night_audit_time text NOT NULL DEFAULT '23:59',
  ADD COLUMN IF NOT EXISTS night_audit_email text;

-- ============================================
-- 2. Reservations table — children tracking
-- ============================================
ALTER TABLE public.reservations
  ADD COLUMN IF NOT EXISTS num_children integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS child_total numeric NOT NULL DEFAULT 0;

-- ============================================
-- 3. Lost & Found table
-- ============================================
CREATE TABLE IF NOT EXISTS public.lost_found_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_id uuid NOT NULL REFERENCES public.hotels(id) ON DELETE CASCADE,
  item_description text NOT NULL,
  room_id uuid REFERENCES public.rooms(id) ON DELETE SET NULL,
  found_date date NOT NULL DEFAULT CURRENT_DATE,
  found_by text NOT NULL,
  reservation_id uuid REFERENCES public.reservations(id) ON DELETE SET NULL,
  storage_location text,
  status text NOT NULL DEFAULT 'stored',
  claimed_by text,
  claimed_date date,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.lost_found_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage lost_found_items"
  ON public.lost_found_items FOR ALL TO authenticated
  USING (hotel_id IN (SELECT hotel_id FROM user_roles WHERE user_id = auth.uid()) AND has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (hotel_id IN (SELECT hotel_id FROM user_roles WHERE user_id = auth.uid()) AND has_role(auth.uid(), 'admin'::app_role));

-- ============================================
-- 4. Invoice Extras table
-- ============================================
CREATE TABLE IF NOT EXISTS public.invoice_extras (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_id uuid NOT NULL REFERENCES public.hotels(id) ON DELETE CASCADE,
  invoice_id uuid NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
  description text NOT NULL,
  quantity numeric NOT NULL DEFAULT 1,
  unit_price numeric NOT NULL,
  total numeric NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.invoice_extras ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage invoice_extras"
  ON public.invoice_extras FOR ALL TO authenticated
  USING (hotel_id IN (SELECT hotel_id FROM user_roles WHERE user_id = auth.uid()) AND has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (hotel_id IN (SELECT hotel_id FROM user_roles WHERE user_id = auth.uid()) AND has_role(auth.uid(), 'admin'::app_role));

-- ============================================
-- 5. Night Audit Logs table
-- ============================================
CREATE TABLE IF NOT EXISTS public.night_audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_id uuid NOT NULL REFERENCES public.hotels(id) ON DELETE CASCADE,
  audit_date date NOT NULL,
  generated_at timestamptz NOT NULL DEFAULT now(),
  arrivals_expected integer NOT NULL DEFAULT 0,
  arrivals_actual integer NOT NULL DEFAULT 0,
  departures_expected integer NOT NULL DEFAULT 0,
  departures_actual integer NOT NULL DEFAULT 0,
  no_shows integer NOT NULL DEFAULT 0,
  occupancy_rate numeric NOT NULL DEFAULT 0,
  revenue_today numeric NOT NULL DEFAULT 0,
  unpaid_invoices_count integer NOT NULL DEFAULT 0,
  unpaid_invoices_total numeric NOT NULL DEFAULT 0,
  rooms_by_status jsonb NOT NULL DEFAULT '{}',
  pdf_url text,
  sent_to_email text,
  UNIQUE(hotel_id, audit_date)
);

ALTER TABLE public.night_audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage night_audit_logs"
  ON public.night_audit_logs FOR ALL TO authenticated
  USING (hotel_id IN (SELECT hotel_id FROM user_roles WHERE user_id = auth.uid()) AND has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (hotel_id IN (SELECT hotel_id FROM user_roles WHERE user_id = auth.uid()) AND has_role(auth.uid(), 'admin'::app_role));

-- ============================================
-- 6. Migrate manager roles to admin
-- ============================================
UPDATE public.user_roles SET role = 'admin' WHERE role = 'manager';

-- ============================================
-- 7. Remove manager from RLS policies
-- ============================================

-- invoices: drop old policy, create admin-only
DROP POLICY IF EXISTS "Admins and managers can read invoices" ON public.invoices;
CREATE POLICY "Admins can read invoices"
  ON public.invoices FOR SELECT TO authenticated
  USING (hotel_id IN (SELECT hotel_id FROM user_roles WHERE user_id = auth.uid()) AND has_role(auth.uid(), 'admin'::app_role));

-- reservations: drop old policy, create admin-only
DROP POLICY IF EXISTS "Admins and managers can read reservations" ON public.reservations;
CREATE POLICY "Admins can read reservations"
  ON public.reservations FOR SELECT TO authenticated
  USING (hotel_id IN (SELECT hotel_id FROM user_roles WHERE user_id = auth.uid()) AND has_role(auth.uid(), 'admin'::app_role));

-- staff: drop old policy, create admin-only
DROP POLICY IF EXISTS "Admins and managers can read staff" ON public.staff;
CREATE POLICY "Admins can read staff"
  ON public.staff FOR SELECT TO authenticated
  USING (hotel_id IN (SELECT hotel_id FROM user_roles WHERE user_id = auth.uid()) AND has_role(auth.uid(), 'admin'::app_role));

-- import_logs: drop old policy, create admin-only
DROP POLICY IF EXISTS "Admins and managers can read import_logs" ON public.import_logs;
CREATE POLICY "Admins can read import_logs"
  ON public.import_logs FOR SELECT TO authenticated
  USING (hotel_id IN (SELECT hotel_id FROM user_roles WHERE user_id = auth.uid()) AND has_role(auth.uid(), 'admin'::app_role));

-- ical_feeds: drop manager read policy
DROP POLICY IF EXISTS "Managers can read ical_feeds" ON public.ical_feeds;

-- ============================================
-- 8. Update RPCs — create_reservation_if_available
-- ============================================
CREATE OR REPLACE FUNCTION public.create_reservation_if_available(
  p_hotel_id uuid, p_room_type_id uuid, p_check_in date, p_check_out date,
  p_guest_name text, p_guest_email text DEFAULT NULL, p_guest_phone text DEFAULT NULL,
  p_guests_count integer DEFAULT 1, p_total_price numeric DEFAULT NULL,
  p_booking_source text DEFAULT 'direct', p_room_id uuid DEFAULT NULL,
  p_num_children integer DEFAULT 0
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_available_units integer;
  v_max_guests integer;
  v_booked_count integer;
  v_blocked_count integer;
  v_reservation_id uuid;
  v_child_total numeric := 0;
  v_child_pricing_enabled boolean;
  v_child_price_type text;
  v_child_price_value numeric;
  v_nights integer;
  v_nightly_rate numeric;
BEGIN
  IF p_check_out <= p_check_in THEN
    RAISE EXCEPTION 'check_out must be after check_in';
  END IF;
  IF p_guest_name IS NULL OR trim(p_guest_name) = '' THEN
    RAISE EXCEPTION 'guest_name is required';
  END IF;

  SELECT available_units, max_guests INTO v_available_units, v_max_guests
  FROM room_types WHERE id = p_room_type_id AND hotel_id = p_hotel_id FOR UPDATE;

  IF NOT FOUND THEN RAISE EXCEPTION 'Room type not found for this hotel'; END IF;
  IF p_guests_count > v_max_guests THEN
    RAISE EXCEPTION 'Guest count (%) exceeds room capacity of %', p_guests_count, v_max_guests;
  END IF;

  SELECT COUNT(*) INTO v_booked_count FROM reservations
  WHERE room_type_id = p_room_type_id AND hotel_id = p_hotel_id
    AND status != 'cancelled' AND check_in < p_check_out AND check_out > p_check_in;

  SELECT COUNT(DISTINCT date) INTO v_blocked_count FROM availability_blocks
  WHERE room_type_id = p_room_type_id AND hotel_id = p_hotel_id
    AND date >= p_check_in AND date < p_check_out;

  IF v_booked_count >= v_available_units THEN
    RAISE EXCEPTION 'No availability for this room type in the selected dates. % of % units booked.', v_booked_count, v_available_units;
  END IF;
  IF v_blocked_count > 0 THEN
    RAISE EXCEPTION 'Some dates in the selected range are blocked (% blocked dates).', v_blocked_count;
  END IF;

  -- Compute child total if children pricing enabled
  IF p_num_children > 0 THEN
    SELECT child_pricing_enabled, child_price_type, child_price_value
    INTO v_child_pricing_enabled, v_child_price_type, v_child_price_value
    FROM hotels WHERE id = p_hotel_id;

    IF v_child_pricing_enabled AND v_child_price_value > 0 THEN
      v_nights := GREATEST(1, p_check_out - p_check_in);
      IF v_child_price_type = 'fixed' THEN
        v_child_total := v_child_price_value * p_num_children * v_nights;
      ELSE
        v_nightly_rate := COALESCE(p_total_price, 0) / GREATEST(1, v_nights);
        v_child_total := (v_nightly_rate * v_child_price_value / 100) * p_num_children * v_nights;
      END IF;
    END IF;
  END IF;

  INSERT INTO reservations (
    hotel_id, room_type_id, room_id, check_in, check_out,
    guest_name, guest_email, guest_phone, guests_count,
    total_price, booking_source, status, num_children, child_total
  ) VALUES (
    p_hotel_id, p_room_type_id, p_room_id, p_check_in, p_check_out,
    p_guest_name, p_guest_email, p_guest_phone, p_guests_count,
    COALESCE(p_total_price, 0) + v_child_total, p_booking_source,
    CASE WHEN p_booking_source = 'website' THEN 'pending' ELSE 'confirmed' END,
    p_num_children, v_child_total
  )
  RETURNING id INTO v_reservation_id;

  IF p_room_id IS NOT NULL THEN
    UPDATE rooms SET operational_status = 'occupied', updated_at = now()
    WHERE id = p_room_id AND hotel_id = p_hotel_id;
  END IF;

  RETURN v_reservation_id;
END;
$$;

-- ============================================
-- 9. Update RPCs — update_reservation_if_available
-- ============================================
CREATE OR REPLACE FUNCTION public.update_reservation_if_available(
  p_reservation_id uuid, p_hotel_id uuid, p_room_type_id uuid,
  p_room_id uuid DEFAULT NULL, p_check_in date DEFAULT NULL, p_check_out date DEFAULT NULL,
  p_guest_name text DEFAULT NULL, p_guest_email text DEFAULT NULL,
  p_guest_phone text DEFAULT NULL, p_guests_count integer DEFAULT NULL,
  p_total_price numeric DEFAULT NULL, p_booking_source text DEFAULT NULL,
  p_special_requests text DEFAULT NULL, p_notes text DEFAULT NULL,
  p_num_children integer DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
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
  v_final_num_children integer;
  v_child_total numeric := 0;
  v_child_pricing_enabled boolean;
  v_child_price_type text;
  v_child_price_value numeric;
  v_nights integer;
  v_nightly_rate numeric;
  v_final_total_price numeric;
BEGIN
  SELECT * INTO v_old FROM reservations
  WHERE id = p_reservation_id AND hotel_id = p_hotel_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Reservation not found'; END IF;

  v_final_check_in := COALESCE(p_check_in, v_old.check_in);
  v_final_check_out := COALESCE(p_check_out, v_old.check_out);
  v_final_room_type_id := COALESCE(p_room_type_id, v_old.room_type_id);
  v_final_guests_count := COALESCE(p_guests_count, v_old.guests_count);
  v_final_num_children := COALESCE(p_num_children, v_old.num_children);

  IF v_final_check_out <= v_final_check_in THEN
    RAISE EXCEPTION 'check_out must be after check_in';
  END IF;

  IF v_final_check_in != v_old.check_in OR v_final_check_out != v_old.check_out
     OR v_final_room_type_id != v_old.room_type_id THEN
    SELECT available_units, max_guests INTO v_available_units, v_max_guests
    FROM room_types WHERE id = v_final_room_type_id AND hotel_id = p_hotel_id FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Room type not found for this hotel'; END IF;
    IF v_final_guests_count > v_max_guests THEN
      RAISE EXCEPTION 'Guest count (%) exceeds room capacity of %', v_final_guests_count, v_max_guests;
    END IF;
    SELECT COUNT(*) INTO v_booked_count FROM reservations
    WHERE room_type_id = v_final_room_type_id AND hotel_id = p_hotel_id
      AND id != p_reservation_id AND status != 'cancelled'
      AND check_in < v_final_check_out AND check_out > v_final_check_in;
    SELECT COUNT(DISTINCT date) INTO v_blocked_count FROM availability_blocks
    WHERE room_type_id = v_final_room_type_id AND hotel_id = p_hotel_id
      AND date >= v_final_check_in AND date < v_final_check_out;
    IF v_booked_count >= v_available_units THEN
      RAISE EXCEPTION 'This change would create a booking conflict. % of % units already booked for these dates.', v_booked_count, v_available_units;
    END IF;
    IF v_blocked_count > 0 THEN
      RAISE EXCEPTION 'Some dates in the updated range are blocked (% blocked dates).', v_blocked_count;
    END IF;
  ELSE
    SELECT max_guests INTO v_max_guests FROM room_types WHERE id = v_final_room_type_id AND hotel_id = p_hotel_id;
    IF v_final_guests_count > v_max_guests THEN
      RAISE EXCEPTION 'Guest count (%) exceeds room capacity of %', v_final_guests_count, v_max_guests;
    END IF;
  END IF;

  -- Compute child total
  v_final_total_price := COALESCE(p_total_price, v_old.total_price);
  IF v_final_num_children > 0 THEN
    SELECT child_pricing_enabled, child_price_type, child_price_value
    INTO v_child_pricing_enabled, v_child_price_type, v_child_price_value
    FROM hotels WHERE id = p_hotel_id;
    IF v_child_pricing_enabled AND v_child_price_value > 0 THEN
      v_nights := GREATEST(1, v_final_check_out - v_final_check_in);
      IF v_child_price_type = 'fixed' THEN
        v_child_total := v_child_price_value * v_final_num_children * v_nights;
      ELSE
        v_nightly_rate := COALESCE(v_final_total_price, 0) / GREATEST(1, v_nights);
        v_child_total := (v_nightly_rate * v_child_price_value / 100) * v_final_num_children * v_nights;
      END IF;
    END IF;
  END IF;

  UPDATE reservations SET
    room_type_id = v_final_room_type_id,
    room_id = CASE WHEN p_room_id IS NOT NULL THEN NULLIF(p_room_id, '00000000-0000-0000-0000-000000000000') ELSE v_old.room_id END,
    check_in = v_final_check_in,
    check_out = v_final_check_out,
    guest_name = COALESCE(NULLIF(p_guest_name, ''), v_old.guest_name),
    guest_email = CASE WHEN p_guest_email IS NOT NULL THEN p_guest_email ELSE v_old.guest_email END,
    guest_phone = CASE WHEN p_guest_phone IS NOT NULL THEN p_guest_phone ELSE v_old.guest_phone END,
    guests_count = v_final_guests_count,
    total_price = COALESCE(v_final_total_price, 0) + v_child_total - COALESCE(v_old.child_total, 0),
    booking_source = COALESCE(p_booking_source, v_old.booking_source),
    special_requests = CASE WHEN p_special_requests IS NOT NULL THEN p_special_requests ELSE v_old.special_requests END,
    notes = CASE WHEN p_notes IS NOT NULL THEN p_notes ELSE v_old.notes END,
    num_children = v_final_num_children,
    child_total = v_child_total,
    updated_at = now()
  WHERE id = p_reservation_id AND hotel_id = p_hotel_id;
END;
$$;

-- ============================================
-- 10. Update get_dashboard_stats — add no_shows
-- ============================================
CREATE OR REPLACE FUNCTION public.get_dashboard_stats(p_hotel_id uuid, p_today date)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_total_units integer;
  v_occupied integer;
  v_check_ins integer;
  v_check_outs integer;
  v_today_revenue numeric;
  v_today_reservations integer;
  v_no_shows integer;
  result jsonb;
BEGIN
  SELECT COALESCE(SUM(available_units), 0) INTO v_total_units FROM room_types WHERE hotel_id = p_hotel_id;
  SELECT COUNT(*) INTO v_occupied FROM reservations
  WHERE hotel_id = p_hotel_id AND check_in <= p_today AND check_out > p_today AND status IN ('confirmed', 'checked_in');
  SELECT COUNT(*) INTO v_check_ins FROM reservations
  WHERE hotel_id = p_hotel_id AND check_in = p_today AND status = 'confirmed';
  SELECT COUNT(*) INTO v_check_outs FROM reservations
  WHERE hotel_id = p_hotel_id AND check_out = p_today AND status IN ('confirmed', 'checked_in');
  SELECT COALESCE(SUM(
    CASE WHEN total_price IS NOT NULL AND check_out > check_in
    THEN total_price / GREATEST(1, check_out - check_in) ELSE 0 END
  ), 0) INTO v_today_revenue FROM reservations
  WHERE hotel_id = p_hotel_id AND check_in <= p_today AND check_out > p_today AND status != 'cancelled';
  SELECT COUNT(*) INTO v_today_reservations FROM reservations
  WHERE hotel_id = p_hotel_id AND created_at::date = p_today;
  SELECT COUNT(*) INTO v_no_shows FROM reservations
  WHERE hotel_id = p_hotel_id AND check_in = p_today AND status = 'no_show';

  result := jsonb_build_object(
    'total_units', v_total_units, 'occupied', v_occupied,
    'check_ins', v_check_ins, 'check_outs', v_check_outs,
    'today_revenue', v_today_revenue, 'today_reservations', v_today_reservations,
    'available', GREATEST(0, v_total_units - v_occupied),
    'occupancy', CASE WHEN v_total_units > 0 THEN ROUND((v_occupied::numeric / v_total_units) * 100) ELSE 0 END,
    'no_shows', v_no_shows
  );
  RETURN result;
END;
$$;

-- ============================================
-- 11. Update get_analytics_summary — add no_shows
-- ============================================
CREATE OR REPLACE FUNCTION public.get_analytics_summary(p_hotel_id uuid, p_from date, p_to date)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_total integer; v_confirmed integer; v_cancelled integer; v_no_shows integer;
  v_revenue numeric; v_avg_booking numeric;
  v_occupied_days integer; v_total_units integer; v_days integer;
  result jsonb;
BEGIN
  v_days := GREATEST(1, p_to - p_from + 1);
  SELECT COALESCE(SUM(available_units), 0) INTO v_total_units FROM room_types WHERE hotel_id = p_hotel_id;

  SELECT COUNT(*),
         COUNT(*) FILTER (WHERE status = 'confirmed'),
         COUNT(*) FILTER (WHERE status = 'cancelled'),
         COUNT(*) FILTER (WHERE status = 'no_show')
  INTO v_total, v_confirmed, v_cancelled, v_no_shows
  FROM reservations WHERE hotel_id = p_hotel_id AND check_in >= p_from AND check_in <= p_to;

  SELECT COALESCE(SUM(total_price), 0),
         CASE WHEN COUNT(*) > 0 THEN COALESCE(SUM(total_price), 0) / COUNT(*) ELSE 0 END
  INTO v_revenue, v_avg_booking FROM reservations
  WHERE hotel_id = p_hotel_id AND check_in >= p_from AND check_in <= p_to AND status NOT IN ('cancelled', 'no_show');

  SELECT COALESCE(SUM(GREATEST(0, LEAST(check_out, p_to + 1) - GREATEST(check_in, p_from))), 0)
  INTO v_occupied_days FROM reservations
  WHERE hotel_id = p_hotel_id AND status NOT IN ('cancelled', 'no_show') AND check_in < (p_to + 1) AND check_out > p_from;

  result := jsonb_build_object(
    'total_reservations', v_total, 'confirmed', v_confirmed, 'cancelled', v_cancelled, 'no_shows', v_no_shows,
    'total_revenue', v_revenue, 'avg_booking_value', v_avg_booking,
    'occupied_room_days', v_occupied_days, 'total_room_days', v_total_units * v_days,
    'occupancy_rate', CASE WHEN v_total_units * v_days > 0 THEN ROUND((v_occupied_days::numeric / (v_total_units * v_days)) * 100) ELSE 0 END,
    'adr', CASE WHEN v_occupied_days > 0 THEN ROUND(v_revenue / v_occupied_days, 2) ELSE 0 END,
    'revpar', CASE WHEN v_total_units * v_days > 0 THEN ROUND(v_revenue / (v_total_units * v_days), 2) ELSE 0 END
  );
  RETURN result;
END;
$$;
