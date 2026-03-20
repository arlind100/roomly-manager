
-- Add subscription/platform columns to hotels table
ALTER TABLE hotels ADD COLUMN IF NOT EXISTS subscription_plan TEXT DEFAULT 'starter';
ALTER TABLE hotels ADD COLUMN IF NOT EXISTS subscription_status TEXT DEFAULT 'trial';
ALTER TABLE hotels ADD COLUMN IF NOT EXISTS monthly_price DECIMAL(10,2) DEFAULT 89.00;
ALTER TABLE hotels ADD COLUMN IF NOT EXISTS trial_ends_at TIMESTAMPTZ;
ALTER TABLE hotels ADD COLUMN IF NOT EXISTS subscription_paid_until TIMESTAMPTZ;
ALTER TABLE hotels ADD COLUMN IF NOT EXISTS created_by_superadmin BOOLEAN DEFAULT false;
ALTER TABLE hotels ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMPTZ;
ALTER TABLE hotels ADD COLUMN IF NOT EXISTS superadmin_notes TEXT;

-- Create billing_records table
CREATE TABLE IF NOT EXISTS billing_records (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  hotel_id UUID REFERENCES hotels(id) ON DELETE CASCADE,
  amount DECIMAL(10,2) NOT NULL,
  currency TEXT DEFAULT 'EUR',
  payment_method TEXT,
  payment_date DATE NOT NULL,
  period_start DATE,
  period_end DATE,
  status TEXT DEFAULT 'paid' CHECK (status IN ('paid', 'pending', 'failed', 'refunded')),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create superadmin_audit_log table
CREATE TABLE IF NOT EXISTS superadmin_audit_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  action TEXT NOT NULL,
  target_hotel_id UUID REFERENCES hotels(id) ON DELETE SET NULL,
  target_hotel_name TEXT,
  details JSONB,
  performed_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS on billing_records
ALTER TABLE billing_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "hotel_admins_own_billing" ON billing_records
  FOR SELECT TO authenticated USING (
    hotel_id IN (
      SELECT hotel_id FROM user_roles WHERE user_id = auth.uid()
    )
  );

-- RLS on superadmin_audit_log - no client access
ALTER TABLE superadmin_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "no_client_access_audit_log" ON superadmin_audit_log
  FOR ALL USING (false);
