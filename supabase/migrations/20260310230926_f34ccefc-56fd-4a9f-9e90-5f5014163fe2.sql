
-- 1. Enable RLS on import_logs (was missing)
ALTER TABLE public.import_logs ENABLE ROW LEVEL SECURITY;

-- 2. Tighten SELECT on reservations: only admin/manager
DROP POLICY IF EXISTS "Authenticated can read reservations" ON public.reservations;
CREATE POLICY "Admins and managers can read reservations"
  ON public.reservations FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager'));

-- 3. Tighten SELECT on invoices: only admin/manager
DROP POLICY IF EXISTS "Authenticated can read invoices" ON public.invoices;
CREATE POLICY "Admins and managers can read invoices"
  ON public.invoices FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager'));

-- 4. Tighten SELECT on staff: only admin/manager
DROP POLICY IF EXISTS "Authenticated can read staff" ON public.staff;
CREATE POLICY "Admins and managers can read staff"
  ON public.staff FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager'));

-- 5. Tighten SELECT on import_logs: only admin/manager
DROP POLICY IF EXISTS "Authenticated can read import_logs" ON public.import_logs;
CREATE POLICY "Admins and managers can read import_logs"
  ON public.import_logs FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager'));
