CREATE OR REPLACE FUNCTION public.create_invoice_on_checkout(p_reservation_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_res reservations%ROWTYPE;
  v_user_hotel_id uuid;
  v_existing_inv record;
  v_new_inv record;
  v_amount numeric;
  v_tax_pct numeric;
  v_tax_amount numeric;
  v_final_amount numeric;
  v_inv_status text;
BEGIN
  SELECT hotel_id INTO v_user_hotel_id
  FROM user_roles
  WHERE user_id = auth.uid()
  LIMIT 1;

  IF v_user_hotel_id IS NULL THEN
    RAISE EXCEPTION 'Unauthorized: no hotel association found';
  END IF;

  SELECT * INTO v_res
  FROM reservations
  WHERE id = p_reservation_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Reservation not found';
  END IF;

  IF v_res.hotel_id != v_user_hotel_id THEN
    RAISE EXCEPTION 'Unauthorized: reservation belongs to a different hotel';
  END IF;

  SELECT id, invoice_number, amount, status, created_at
  INTO v_existing_inv
  FROM invoices
  WHERE reservation_id = p_reservation_id
    AND status != 'cancelled'
  LIMIT 1;

  IF FOUND THEN
    RETURN jsonb_build_object(
      'invoice_id', v_existing_inv.id,
      'invoice_number', v_existing_inv.invoice_number,
      'amount', v_existing_inv.amount,
      'status', v_existing_inv.status,
      'already_existed', true
    );
  END IF;

  v_amount := COALESCE(v_res.total_price, 0);

  SELECT COALESCE(tax_percentage, 0) INTO v_tax_pct
  FROM hotels WHERE id = v_res.hotel_id;

  v_tax_amount := v_amount * (v_tax_pct / 100);
  v_final_amount := v_amount + v_tax_amount;

  IF v_res.payment_method IN ('cash', 'card', 'online') THEN
    v_inv_status := 'paid';
  ELSE
    v_inv_status := 'unpaid';
  END IF;

  IF v_res.payment_status = 'paid' THEN
    v_inv_status := 'paid';
  END IF;

  INSERT INTO invoices (
    hotel_id, reservation_id, amount, status, issued_at
  ) VALUES (
    v_res.hotel_id, p_reservation_id, v_final_amount, v_inv_status, now()
  )
  RETURNING id, invoice_number, amount, status, created_at
  INTO v_new_inv;

  RETURN jsonb_build_object(
    'invoice_id', v_new_inv.id,
    'invoice_number', v_new_inv.invoice_number,
    'amount', v_new_inv.amount,
    'status', v_new_inv.status,
    'already_existed', false
  );
END;
$$;