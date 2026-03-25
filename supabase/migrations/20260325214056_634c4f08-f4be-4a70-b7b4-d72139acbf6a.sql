-- Missing indexes (some already exist, using IF NOT EXISTS)
CREATE INDEX IF NOT EXISTS idx_reservations_hotel_id ON reservations (hotel_id);
CREATE INDEX IF NOT EXISTS idx_reservations_hotel_created ON reservations (hotel_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_reservations_room_type ON reservations (room_type_id);
CREATE INDEX IF NOT EXISTS idx_reservations_checkin ON reservations (hotel_id, check_in);
CREATE INDEX IF NOT EXISTS idx_reservations_checkout ON reservations (hotel_id, check_out);
CREATE INDEX IF NOT EXISTS idx_invoices_reservation ON invoices (reservation_id);
CREATE INDEX IF NOT EXISTS idx_pricing_overrides_lookup ON pricing_overrides (hotel_id, room_type_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_user ON user_roles (user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_hotel ON user_roles (hotel_id);

-- Reservation audit log table
CREATE TABLE IF NOT EXISTS public.reservation_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reservation_id uuid NOT NULL,
  hotel_id uuid NOT NULL,
  user_id uuid,
  action text NOT NULL,
  changes jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_audit_reservation ON reservation_audit_log (reservation_id);
CREATE INDEX idx_audit_hotel ON reservation_audit_log (hotel_id, created_at DESC);

ALTER TABLE reservation_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Hotel admins can read own audit log"
  ON reservation_audit_log FOR SELECT TO authenticated
  USING (hotel_id IN (SELECT hotel_id FROM user_roles WHERE user_id = auth.uid()));

CREATE POLICY "No direct client inserts on audit log"
  ON reservation_audit_log FOR INSERT TO authenticated
  WITH CHECK (false);

-- Trigger to auto-log reservation changes
CREATE OR REPLACE FUNCTION log_reservation_changes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO reservation_audit_log (reservation_id, hotel_id, user_id, action, changes)
    VALUES (NEW.id, NEW.hotel_id, auth.uid(), 'created', to_jsonb(NEW));
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO reservation_audit_log (reservation_id, hotel_id, user_id, action, changes)
    VALUES (NEW.id, NEW.hotel_id, auth.uid(), 
      CASE 
        WHEN NEW.status = 'cancelled' AND OLD.status != 'cancelled' THEN 'cancelled'
        WHEN NEW.status = 'checked_in' AND OLD.status != 'checked_in' THEN 'checked_in'
        WHEN NEW.status = 'completed' AND OLD.status != 'completed' THEN 'completed'
        ELSE 'updated'
      END,
      jsonb_build_object('old', to_jsonb(OLD), 'new', to_jsonb(NEW))
    );
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_reservation_audit
  AFTER INSERT OR UPDATE ON reservations
  FOR EACH ROW EXECUTE FUNCTION log_reservation_changes();

-- Dashboard stats RPC - replaces fetching 2000 rows
CREATE OR REPLACE FUNCTION get_dashboard_stats(p_hotel_id uuid, p_today date)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_total_units integer;
  v_occupied integer;
  v_check_ins integer;
  v_check_outs integer;
  v_today_revenue numeric;
  v_today_reservations integer;
  result jsonb;
BEGIN
  SELECT COALESCE(SUM(available_units), 0) INTO v_total_units
  FROM room_types WHERE hotel_id = p_hotel_id;

  SELECT COUNT(*) INTO v_occupied
  FROM reservations
  WHERE hotel_id = p_hotel_id AND check_in <= p_today AND check_out > p_today
    AND status IN ('confirmed', 'checked_in');

  SELECT COUNT(*) INTO v_check_ins
  FROM reservations
  WHERE hotel_id = p_hotel_id AND check_in = p_today AND status = 'confirmed';

  SELECT COUNT(*) INTO v_check_outs
  FROM reservations
  WHERE hotel_id = p_hotel_id AND check_out = p_today AND status IN ('confirmed', 'checked_in');

  SELECT COALESCE(SUM(
    CASE WHEN total_price IS NOT NULL AND check_out > check_in 
    THEN total_price / GREATEST(1, check_out - check_in) ELSE 0 END
  ), 0) INTO v_today_revenue
  FROM reservations
  WHERE hotel_id = p_hotel_id AND check_in <= p_today AND check_out > p_today
    AND status != 'cancelled';

  SELECT COUNT(*) INTO v_today_reservations
  FROM reservations
  WHERE hotel_id = p_hotel_id AND created_at::date = p_today;

  result := jsonb_build_object(
    'total_units', v_total_units,
    'occupied', v_occupied,
    'check_ins', v_check_ins,
    'check_outs', v_check_outs,
    'today_revenue', v_today_revenue,
    'today_reservations', v_today_reservations,
    'available', GREATEST(0, v_total_units - v_occupied),
    'occupancy', CASE WHEN v_total_units > 0 THEN ROUND((v_occupied::numeric / v_total_units) * 100) ELSE 0 END
  );
  RETURN result;
END;
$$;

-- Analytics aggregation RPC
CREATE OR REPLACE FUNCTION get_analytics_summary(p_hotel_id uuid, p_from date, p_to date)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_total integer;
  v_confirmed integer;
  v_cancelled integer;
  v_revenue numeric;
  v_avg_booking numeric;
  v_occupied_days integer;
  v_total_units integer;
  v_days integer;
  result jsonb;
BEGIN
  v_days := GREATEST(1, p_to - p_from + 1);

  SELECT COALESCE(SUM(available_units), 0) INTO v_total_units
  FROM room_types WHERE hotel_id = p_hotel_id;

  SELECT COUNT(*), 
         COUNT(*) FILTER (WHERE status = 'confirmed'),
         COUNT(*) FILTER (WHERE status = 'cancelled')
  INTO v_total, v_confirmed, v_cancelled
  FROM reservations
  WHERE hotel_id = p_hotel_id AND check_in >= p_from AND check_in <= p_to;

  SELECT COALESCE(SUM(total_price), 0), 
         CASE WHEN COUNT(*) > 0 THEN COALESCE(SUM(total_price), 0) / COUNT(*) ELSE 0 END
  INTO v_revenue, v_avg_booking
  FROM reservations
  WHERE hotel_id = p_hotel_id AND check_in >= p_from AND check_in <= p_to AND status != 'cancelled';

  SELECT COALESCE(SUM(
    GREATEST(0, LEAST(check_out, p_to + 1) - GREATEST(check_in, p_from))
  ), 0) INTO v_occupied_days
  FROM reservations
  WHERE hotel_id = p_hotel_id AND status != 'cancelled'
    AND check_in < (p_to + 1) AND check_out > p_from;

  result := jsonb_build_object(
    'total_reservations', v_total,
    'confirmed', v_confirmed,
    'cancelled', v_cancelled,
    'total_revenue', v_revenue,
    'avg_booking_value', v_avg_booking,
    'occupied_room_days', v_occupied_days,
    'total_room_days', v_total_units * v_days,
    'occupancy_rate', CASE WHEN v_total_units * v_days > 0 
      THEN ROUND((v_occupied_days::numeric / (v_total_units * v_days)) * 100) ELSE 0 END,
    'adr', CASE WHEN v_occupied_days > 0 THEN ROUND(v_revenue / v_occupied_days, 2) ELSE 0 END,
    'revpar', CASE WHEN v_total_units * v_days > 0 THEN ROUND(v_revenue / (v_total_units * v_days), 2) ELSE 0 END
  );
  RETURN result;
END;
$$;