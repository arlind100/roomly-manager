-- Fix RLS to properly isolate hotel data by hotel_id

-- RESERVATIONS
DROP POLICY IF EXISTS "Admins can manage reservations" ON reservations;
CREATE POLICY "Admins can manage reservations" ON reservations
  FOR ALL TO authenticated
  USING (
    hotel_id IN (SELECT hotel_id FROM user_roles WHERE user_id = auth.uid())
    AND has_role(auth.uid(), 'admin'::app_role)
  );

DROP POLICY IF EXISTS "Admins and managers can read reservations" ON reservations;
CREATE POLICY "Admins and managers can read reservations" ON reservations
  FOR SELECT TO authenticated
  USING (
    hotel_id IN (SELECT hotel_id FROM user_roles WHERE user_id = auth.uid())
    AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role))
  );

-- ROOMS
DROP POLICY IF EXISTS "Admins can manage rooms" ON rooms;
CREATE POLICY "Admins can manage rooms" ON rooms
  FOR ALL TO authenticated
  USING (
    hotel_id IN (SELECT hotel_id FROM user_roles WHERE user_id = auth.uid())
    AND has_role(auth.uid(), 'admin'::app_role)
  );

DROP POLICY IF EXISTS "Staff can update room status" ON rooms;
CREATE POLICY "Staff can update room status" ON rooms
  FOR UPDATE TO authenticated
  USING (
    hotel_id IN (SELECT hotel_id FROM user_roles WHERE user_id = auth.uid())
    AND has_role(auth.uid(), 'staff'::app_role)
  );

-- ROOM_TYPES
DROP POLICY IF EXISTS "Admins can manage room types" ON room_types;
CREATE POLICY "Admins can manage room types" ON room_types
  FOR ALL TO authenticated
  USING (
    hotel_id IN (SELECT hotel_id FROM user_roles WHERE user_id = auth.uid())
    AND has_role(auth.uid(), 'admin'::app_role)
  );

-- INVOICES
DROP POLICY IF EXISTS "Admins can manage invoices" ON invoices;
CREATE POLICY "Admins can manage invoices" ON invoices
  FOR ALL TO authenticated
  USING (
    hotel_id IN (SELECT hotel_id FROM user_roles WHERE user_id = auth.uid())
    AND has_role(auth.uid(), 'admin'::app_role)
  );

DROP POLICY IF EXISTS "Admins and managers can read invoices" ON invoices;
CREATE POLICY "Admins and managers can read invoices" ON invoices
  FOR SELECT TO authenticated
  USING (
    hotel_id IN (SELECT hotel_id FROM user_roles WHERE user_id = auth.uid())
    AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role))
  );

-- STAFF
DROP POLICY IF EXISTS "Admins can manage staff" ON staff;
CREATE POLICY "Admins can manage staff" ON staff
  FOR ALL TO authenticated
  USING (
    hotel_id IN (SELECT hotel_id FROM user_roles WHERE user_id = auth.uid())
    AND has_role(auth.uid(), 'admin'::app_role)
  );

DROP POLICY IF EXISTS "Admins and managers can read staff" ON staff;
CREATE POLICY "Admins and managers can read staff" ON staff
  FOR SELECT TO authenticated
  USING (
    hotel_id IN (SELECT hotel_id FROM user_roles WHERE user_id = auth.uid())
    AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role))
  );

-- AVAILABILITY_BLOCKS
DROP POLICY IF EXISTS "Admins can manage availability" ON availability_blocks;
CREATE POLICY "Admins can manage availability" ON availability_blocks
  FOR ALL TO authenticated
  USING (
    hotel_id IN (SELECT hotel_id FROM user_roles WHERE user_id = auth.uid())
    AND has_role(auth.uid(), 'admin'::app_role)
  );

-- PRICING_OVERRIDES
DROP POLICY IF EXISTS "Admins can manage pricing" ON pricing_overrides;
CREATE POLICY "Admins can manage pricing" ON pricing_overrides
  FOR ALL TO authenticated
  USING (
    hotel_id IN (SELECT hotel_id FROM user_roles WHERE user_id = auth.uid())
    AND has_role(auth.uid(), 'admin'::app_role)
  );

-- ICAL_FEEDS
DROP POLICY IF EXISTS "Admins can manage ical_feeds" ON ical_feeds;
CREATE POLICY "Admins can manage ical_feeds" ON ical_feeds
  FOR ALL TO authenticated
  USING (
    hotel_id IN (SELECT hotel_id FROM user_roles WHERE user_id = auth.uid())
    AND has_role(auth.uid(), 'admin'::app_role)
  );

DROP POLICY IF EXISTS "Managers can read ical_feeds" ON ical_feeds;
CREATE POLICY "Managers can read ical_feeds" ON ical_feeds
  FOR SELECT TO authenticated
  USING (
    hotel_id IN (SELECT hotel_id FROM user_roles WHERE user_id = auth.uid())
    AND has_role(auth.uid(), 'manager'::app_role)
  );

-- IMPORT_LOGS
DROP POLICY IF EXISTS "Admins can manage import_logs" ON import_logs;
CREATE POLICY "Admins can manage import_logs" ON import_logs
  FOR ALL TO authenticated
  USING (
    hotel_id IN (SELECT hotel_id FROM user_roles WHERE user_id = auth.uid())
    AND has_role(auth.uid(), 'admin'::app_role)
  );

DROP POLICY IF EXISTS "Admins and managers can read import_logs" ON import_logs;
CREATE POLICY "Admins and managers can read import_logs" ON import_logs
  FOR SELECT TO authenticated
  USING (
    hotel_id IN (SELECT hotel_id FROM user_roles WHERE user_id = auth.uid())
    AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role))
  );

-- HOTELS: scope admin management to own hotel only
DROP POLICY IF EXISTS "Admins can manage hotels" ON hotels;
CREATE POLICY "Admins can manage hotels" ON hotels
  FOR ALL TO authenticated
  USING (
    id IN (SELECT hotel_id FROM user_roles WHERE user_id = auth.uid())
    AND has_role(auth.uid(), 'admin'::app_role)
  );