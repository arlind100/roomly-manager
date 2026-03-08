
-- Add show_on_website column to room_types
ALTER TABLE public.room_types ADD COLUMN show_on_website boolean NOT NULL DEFAULT true;

-- Seed room types for the existing hotel
INSERT INTO public.room_types (hotel_id, name, description, base_price, weekend_price, max_guests, available_units, room_size, amenities, image_url, show_on_website)
VALUES
  ('5584eba7-506a-4fd4-90bb-875749724839', 'Deluxe Room', 'Elegant comfort with premium furnishings, marble bath, and city views.', 450, 520, 2, 8, '45 m²', ARRAY['King Bed','City View','Marble Bath','Mini Bar','Room Service'], '/assets/room-deluxe.jpg', true),
  ('5584eba7-506a-4fd4-90bb-875749724839', 'Grand Suite', 'Expansive oceanfront suite with separate living area and panoramic views.', 850, 950, 3, 4, '78 m²', ARRAY['King Bed','Ocean View','Living Room','Butler Service','Private Terrace'], '/assets/room-suite.jpg', true),
  ('5584eba7-506a-4fd4-90bb-875749724839', 'Presidential Penthouse', 'The pinnacle of luxury — a private penthouse with skyline panorama and bespoke service.', 2200, 2500, 4, 2, '150 m²', ARRAY['Master Suite','360° Views','Private Dining','Personal Chef','Chauffeur'], '/assets/room-penthouse.jpg', true);

-- Seed staff
INSERT INTO public.staff (hotel_id, name, role, email, phone, is_active)
VALUES
  ('5584eba7-506a-4fd4-90bb-875749724839', 'Marie Laurent', 'General Manager', 'marie@aureliagrand.com', '+377 98 06 00 01', true),
  ('5584eba7-506a-4fd4-90bb-875749724839', 'Jean-Pierre Dubois', 'Front Desk Manager', 'jp@aureliagrand.com', '+377 98 06 00 02', true),
  ('5584eba7-506a-4fd4-90bb-875749724839', 'Sofia Rossi', 'Head Housekeeper', 'sofia@aureliagrand.com', '+377 98 06 00 03', true),
  ('5584eba7-506a-4fd4-90bb-875749724839', 'Alexandre Martin', 'Executive Chef', 'alex@aureliagrand.com', '+377 98 06 00 04', true),
  ('5584eba7-506a-4fd4-90bb-875749724839', 'Isabella Santos', 'Spa Director', 'isabella@aureliagrand.com', '+377 98 06 00 05', true);

-- Seed sample reservations (using subqueries for room_type_id)
INSERT INTO public.reservations (hotel_id, guest_name, guest_email, guest_phone, room_type_id, check_in, check_out, guests_count, status, payment_status, total_price, booking_source, special_requests)
VALUES
  ('5584eba7-506a-4fd4-90bb-875749724839', 'Alexander Sterling', 'alexander@example.com', '+1 555 100 0001',
   (SELECT id FROM public.room_types WHERE name = 'Grand Suite' AND hotel_id = '5584eba7-506a-4fd4-90bb-875749724839' LIMIT 1),
   '2026-03-10', '2026-03-14', 2, 'confirmed', 'paid', 3400, 'direct', 'Late check-in requested'),
  ('5584eba7-506a-4fd4-90bb-875749724839', 'Emma Beaumont', 'emma@example.com', '+44 7700 900001',
   (SELECT id FROM public.room_types WHERE name = 'Deluxe Room' AND hotel_id = '5584eba7-506a-4fd4-90bb-875749724839' LIMIT 1),
   '2026-03-12', '2026-03-15', 1, 'confirmed', 'paid', 1350, 'website', NULL),
  ('5584eba7-506a-4fd4-90bb-875749724839', 'Robert Chen', 'robert@example.com', '+86 138 0001 0001',
   (SELECT id FROM public.room_types WHERE name = 'Presidential Penthouse' AND hotel_id = '5584eba7-506a-4fd4-90bb-875749724839' LIMIT 1),
   '2026-03-15', '2026-03-20', 3, 'pending', 'unpaid', 11000, 'direct', 'Anniversary celebration, champagne on arrival'),
  ('5584eba7-506a-4fd4-90bb-875749724839', 'Claire Fontaine', 'claire@example.com', '+33 6 12 34 56 78',
   (SELECT id FROM public.room_types WHERE name = 'Deluxe Room' AND hotel_id = '5584eba7-506a-4fd4-90bb-875749724839' LIMIT 1),
   '2026-03-08', '2026-03-10', 2, 'completed', 'paid', 900, 'website', NULL),
  ('5584eba7-506a-4fd4-90bb-875749724839', 'Marcus Williams', 'marcus@example.com', '+1 555 200 0002',
   (SELECT id FROM public.room_types WHERE name = 'Grand Suite' AND hotel_id = '5584eba7-506a-4fd4-90bb-875749724839' LIMIT 1),
   '2026-03-20', '2026-03-22', 2, 'pending', 'unpaid', 1700, 'direct', NULL),
  ('5584eba7-506a-4fd4-90bb-875749724839', 'Yuki Tanaka', 'yuki@example.com', '+81 90 1234 5678',
   (SELECT id FROM public.room_types WHERE name = 'Deluxe Room' AND hotel_id = '5584eba7-506a-4fd4-90bb-875749724839' LIMIT 1),
   '2026-03-25', '2026-03-28', 1, 'cancelled', 'refunded', 1350, 'website', 'Hypoallergenic pillows');

-- Seed pricing overrides
INSERT INTO public.pricing_overrides (hotel_id, room_type_id, start_date, end_date, price, label)
VALUES
  ('5584eba7-506a-4fd4-90bb-875749724839',
   (SELECT id FROM public.room_types WHERE name = 'Deluxe Room' AND hotel_id = '5584eba7-506a-4fd4-90bb-875749724839' LIMIT 1),
   '2026-04-01', '2026-04-15', 550, 'Easter Season'),
  ('5584eba7-506a-4fd4-90bb-875749724839',
   (SELECT id FROM public.room_types WHERE name = 'Grand Suite' AND hotel_id = '5584eba7-506a-4fd4-90bb-875749724839' LIMIT 1),
   '2026-07-01', '2026-08-31', 1100, 'Summer Peak');

-- Seed invoices linked to reservations
INSERT INTO public.invoices (hotel_id, reservation_id, amount, status, issued_at, due_at)
VALUES
  ('5584eba7-506a-4fd4-90bb-875749724839',
   (SELECT id FROM public.reservations WHERE guest_name = 'Alexander Sterling' LIMIT 1),
   3400, 'paid', now(), now() + interval '30 days'),
  ('5584eba7-506a-4fd4-90bb-875749724839',
   (SELECT id FROM public.reservations WHERE guest_name = 'Emma Beaumont' LIMIT 1),
   1350, 'paid', now(), now() + interval '30 days'),
  ('5584eba7-506a-4fd4-90bb-875749724839',
   (SELECT id FROM public.reservations WHERE guest_name = 'Robert Chen' LIMIT 1),
   11000, 'draft', NULL, NULL);

-- Seed availability blocks
INSERT INTO public.availability_blocks (hotel_id, room_type_id, date, reason)
VALUES
  ('5584eba7-506a-4fd4-90bb-875749724839',
   (SELECT id FROM public.room_types WHERE name = 'Deluxe Room' AND hotel_id = '5584eba7-506a-4fd4-90bb-875749724839' LIMIT 1),
   '2026-03-18', 'Maintenance - plumbing repair'),
  ('5584eba7-506a-4fd4-90bb-875749724839',
   (SELECT id FROM public.room_types WHERE name = 'Deluxe Room' AND hotel_id = '5584eba7-506a-4fd4-90bb-875749724839' LIMIT 1),
   '2026-03-19', 'Maintenance - plumbing repair');
