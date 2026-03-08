
-- Add new room types
INSERT INTO room_types (hotel_id, name, description, base_price, weekend_price, max_guests, available_units, room_size, amenities, show_on_website) VALUES
('5584eba7-506a-4fd4-90bb-875749724839', 'Standard Room', 'Comfortable room with modern amenities and garden views.', 220, 280, 2, 5, '30 m²', ARRAY['Queen Bed','Garden View','WiFi','TV','Coffee Maker'], true),
('5584eba7-506a-4fd4-90bb-875749724839', 'Superior Room', 'Spacious room with premium bedding and partial ocean views.', 340, 420, 2, 4, '38 m²', ARRAY['King Bed','Partial Ocean View','Mini Bar','Rain Shower','Balcony'], true),
('5584eba7-506a-4fd4-90bb-875749724839', 'Family Suite', 'Generous suite with separate kids area and two bathrooms.', 680, 780, 5, 3, '85 m²', ARRAY['King Bed','Twin Beds','Two Bathrooms','Living Area','Kids Amenities','Pool View'], true),
('5584eba7-506a-4fd4-90bb-875749724839', 'Executive Suite', 'Business-focused suite with private office and lounge access.', 1100, 1250, 2, 2, '95 m²', ARRAY['King Bed','Private Office','Lounge Access','Butler Service','City View','Jacuzzi'], true);

-- Add more staff
INSERT INTO staff (hotel_id, name, role, email, phone, is_active) VALUES
('5584eba7-506a-4fd4-90bb-875749724839', 'Marco Bianchi', 'General Manager', 'marco.b@aureliahotel.com', '+39 06 1234 001', true),
('5584eba7-506a-4fd4-90bb-875749724839', 'Elena Rossi', 'Front Desk Supervisor', 'elena.r@aureliahotel.com', '+39 06 1234 002', true),
('5584eba7-506a-4fd4-90bb-875749724839', 'Luca Conti', 'Concierge', 'luca.c@aureliahotel.com', '+39 06 1234 003', true),
('5584eba7-506a-4fd4-90bb-875749724839', 'Sofia Moretti', 'Housekeeping Manager', 'sofia.m@aureliahotel.com', '+39 06 1234 004', true),
('5584eba7-506a-4fd4-90bb-875749724839', 'Davide Russo', 'Head Chef', 'davide.r@aureliahotel.com', '+39 06 1234 005', true),
('5584eba7-506a-4fd4-90bb-875749724839', 'Giulia Ferri', 'Spa Director', 'giulia.f@aureliahotel.com', '+39 06 1234 006', true),
('5584eba7-506a-4fd4-90bb-875749724839', 'Alessandro Ricci', 'Night Manager', 'alessandro.r@aureliahotel.com', '+39 06 1234 007', true),
('5584eba7-506a-4fd4-90bb-875749724839', 'Francesca Villa', 'Events Coordinator', 'francesca.v@aureliahotel.com', '+39 06 1234 008', true),
('5584eba7-506a-4fd4-90bb-875749724839', 'Matteo Gallo', 'Valet Supervisor', 'matteo.g@aureliahotel.com', '+39 06 1234 009', false),
('5584eba7-506a-4fd4-90bb-875749724839', 'Chiara Leone', 'Front Desk Agent', 'chiara.l@aureliahotel.com', '+39 06 1234 010', true);

-- 50 reservations spanning Jan 2026 – Apr 2026
INSERT INTO reservations (hotel_id, room_type_id, guest_name, guest_email, guest_phone, check_in, check_out, guests_count, status, total_price, booking_source, payment_status, special_requests, created_at) VALUES
-- PAST: January completed
('5584eba7-506a-4fd4-90bb-875749724839', '007adea4-a8f4-436e-983a-b4e8b319993f', 'John Mitchell', 'john.m@email.com', '+1 555-0101', '2026-01-05', '2026-01-08', 2, 'completed', 1350, 'website', 'paid', NULL, '2025-12-20'),
('5584eba7-506a-4fd4-90bb-875749724839', 'ddca4c8c-322f-4730-96aa-875a9d28d932', 'Maria Garcia', 'maria.g@email.com', '+34 600-111', '2026-01-06', '2026-01-10', 2, 'completed', 3400, 'website', 'paid', 'Late check-in', '2025-12-22'),
('5584eba7-506a-4fd4-90bb-875749724839', '007adea4-a8f4-436e-983a-b4e8b319993f', 'Hans Weber', 'hans.w@email.de', '+49 170-222', '2026-01-10', '2026-01-13', 1, 'completed', 1350, 'direct', 'paid', NULL, '2026-01-02'),
('5584eba7-506a-4fd4-90bb-875749724839', '564b36af-d01a-4ce1-9489-e0cf9fcf866a', 'Aisha Khan', 'aisha.k@email.com', '+971 50-333', '2026-01-12', '2026-01-16', 3, 'completed', 8800, 'phone', 'paid', 'Airport transfer needed', '2026-01-05'),
('5584eba7-506a-4fd4-90bb-875749724839', 'ddca4c8c-322f-4730-96aa-875a9d28d932', 'Pierre Dubois', 'pierre.d@email.fr', '+33 6-444', '2026-01-15', '2026-01-18', 2, 'completed', 2550, 'website', 'paid', NULL, '2026-01-08'),
('5584eba7-506a-4fd4-90bb-875749724839', '007adea4-a8f4-436e-983a-b4e8b319993f', 'Emily Brown', 'emily.b@email.com', '+1 555-0505', '2026-01-18', '2026-01-20', 2, 'cancelled', 900, 'website', 'refunded', 'Cancelled due to flight', '2026-01-10'),
('5584eba7-506a-4fd4-90bb-875749724839', '007adea4-a8f4-436e-983a-b4e8b319993f', 'Yuki Tanaka', 'yuki.t@email.jp', '+81 90-666', '2026-01-20', '2026-01-24', 2, 'completed', 1800, 'direct', 'paid', 'Vegetarian meals', '2026-01-12'),
('5584eba7-506a-4fd4-90bb-875749724839', 'ddca4c8c-322f-4730-96aa-875a9d28d932', 'Robert Anderson', 'robert.a@email.com', '+1 555-0707', '2026-01-22', '2026-01-26', 3, 'completed', 3400, 'phone', 'paid', NULL, '2026-01-15'),

-- PAST: February
('5584eba7-506a-4fd4-90bb-875749724839', '564b36af-d01a-4ce1-9489-e0cf9fcf866a', 'Sofia Andersson', 'sofia.a@email.se', '+46 70-888', '2026-02-01', '2026-02-05', 2, 'completed', 8800, 'website', 'paid', 'Champagne on arrival', '2026-01-20'),
('5584eba7-506a-4fd4-90bb-875749724839', '007adea4-a8f4-436e-983a-b4e8b319993f', 'Carlos Mendez', 'carlos.m@email.mx', '+52 55-999', '2026-02-03', '2026-02-06', 1, 'completed', 1350, 'direct', 'paid', NULL, '2026-01-25'),
('5584eba7-506a-4fd4-90bb-875749724839', 'ddca4c8c-322f-4730-96aa-875a9d28d932', 'Li Wei', 'li.w@email.cn', '+86 138-1010', '2026-02-05', '2026-02-09', 2, 'completed', 3400, 'website', 'paid', 'Chinese tea service', '2026-01-28'),
('5584eba7-506a-4fd4-90bb-875749724839', '007adea4-a8f4-436e-983a-b4e8b319993f', 'Anna Kowalski', 'anna.k@email.pl', '+48 501-1111', '2026-02-08', '2026-02-11', 2, 'completed', 1350, 'phone', 'paid', NULL, '2026-02-01'),
('5584eba7-506a-4fd4-90bb-875749724839', '007adea4-a8f4-436e-983a-b4e8b319993f', 'James Wilson', 'james.w@email.com', '+1 555-1212', '2026-02-10', '2026-02-14', 2, 'completed', 1800, 'website', 'paid', 'Anniversary trip', '2026-02-02'),
('5584eba7-506a-4fd4-90bb-875749724839', 'ddca4c8c-322f-4730-96aa-875a9d28d932', 'Fatima Al-Hassan', 'fatima.h@email.com', '+966 50-1313', '2026-02-12', '2026-02-16', 2, 'completed', 3400, 'direct', 'paid', 'Halal meals required', '2026-02-05'),
('5584eba7-506a-4fd4-90bb-875749724839', '564b36af-d01a-4ce1-9489-e0cf9fcf866a', 'Oliver Smith', 'oliver.s@email.co.uk', '+44 7700-1414', '2026-02-14', '2026-02-18', 4, 'completed', 8800, 'website', 'paid', 'Valentine special', '2026-02-06'),
('5584eba7-506a-4fd4-90bb-875749724839', '007adea4-a8f4-436e-983a-b4e8b319993f', 'Nina Petrova', 'nina.p@email.ru', '+7 916-1515', '2026-02-18', '2026-02-21', 1, 'cancelled', 1350, 'website', 'refunded', NULL, '2026-02-10'),
('5584eba7-506a-4fd4-90bb-875749724839', 'ddca4c8c-322f-4730-96aa-875a9d28d932', 'Thomas Mueller', 'thomas.m@email.de', '+49 171-1616', '2026-02-20', '2026-02-24', 2, 'completed', 3400, 'phone', 'paid', NULL, '2026-02-12'),
('5584eba7-506a-4fd4-90bb-875749724839', '007adea4-a8f4-436e-983a-b4e8b319993f', 'Priya Sharma', 'priya.s@email.in', '+91 98-1717', '2026-02-24', '2026-02-27', 2, 'completed', 1350, 'website', 'paid', 'Quiet room preferred', '2026-02-16'),

-- PAST: Early March
('5584eba7-506a-4fd4-90bb-875749724839', 'ddca4c8c-322f-4730-96aa-875a9d28d932', 'Lucas Martin', 'lucas.m@email.fr', '+33 6-1818', '2026-03-01', '2026-03-04', 2, 'completed', 2550, 'direct', 'paid', NULL, '2026-02-20'),
('5584eba7-506a-4fd4-90bb-875749724839', '007adea4-a8f4-436e-983a-b4e8b319993f', 'Sarah Johnson', 'sarah.j@email.com', '+1 555-1919', '2026-03-02', '2026-03-06', 2, 'completed', 1800, 'website', 'paid', 'Allergic to feathers', '2026-02-22'),
('5584eba7-506a-4fd4-90bb-875749724839', '564b36af-d01a-4ce1-9489-e0cf9fcf866a', 'Ahmed Hassan', 'ahmed.h@email.com', '+20 100-2020', '2026-03-03', '2026-03-07', 3, 'completed', 8800, 'phone', 'paid', 'Business meeting setup', '2026-02-24'),
('5584eba7-506a-4fd4-90bb-875749724839', '007adea4-a8f4-436e-983a-b4e8b319993f', 'Isabella Romano', 'isabella.r@email.it', '+39 338-2121', '2026-03-05', '2026-03-07', 1, 'completed', 900, 'website', 'paid', NULL, '2026-02-26'),

-- TODAY & TOMORROW: March 8-9
('5584eba7-506a-4fd4-90bb-875749724839', 'ddca4c8c-322f-4730-96aa-875a9d28d932', 'David Kim', 'david.k@email.kr', '+82 10-2222', '2026-03-08', '2026-03-12', 2, 'confirmed', 3400, 'website', 'paid', 'Ocean view requested', '2026-03-01'),
('5584eba7-506a-4fd4-90bb-875749724839', '007adea4-a8f4-436e-983a-b4e8b319993f', 'Emma Thompson', 'emma.t@email.co.uk', '+44 7700-2323', '2026-03-08', '2026-03-10', 2, 'confirmed', 900, 'direct', 'paid', NULL, '2026-03-02'),
('5584eba7-506a-4fd4-90bb-875749724839', '564b36af-d01a-4ce1-9489-e0cf9fcf866a', 'William Chen', 'william.c@email.com', '+1 555-2424', '2026-03-08', '2026-03-13', 4, 'confirmed', 11000, 'website', 'paid', 'Personal chef for dinner', '2026-03-01'),
('5584eba7-506a-4fd4-90bb-875749724839', '007adea4-a8f4-436e-983a-b4e8b319993f', 'Camille Laurent', 'camille.l@email.fr', '+33 6-2525', '2026-03-09', '2026-03-12', 1, 'confirmed', 1350, 'phone', 'unpaid', NULL, '2026-03-04'),
('5584eba7-506a-4fd4-90bb-875749724839', 'ddca4c8c-322f-4730-96aa-875a9d28d932', 'Alex Rivera', 'alex.r@email.com', '+1 555-2626', '2026-03-09', '2026-03-11', 2, 'pending', 1700, 'website', 'unpaid', 'Late arrival ~11pm', '2026-03-07'),

-- Checking out today/tomorrow
('5584eba7-506a-4fd4-90bb-875749724839', '007adea4-a8f4-436e-983a-b4e8b319993f', 'Michael Park', 'michael.p@email.com', '+1 555-2727', '2026-03-05', '2026-03-08', 2, 'confirmed', 1350, 'website', 'paid', NULL, '2026-02-28'),
('5584eba7-506a-4fd4-90bb-875749724839', 'ddca4c8c-322f-4730-96aa-875a9d28d932', 'Laura Svensson', 'laura.s@email.se', '+46 73-2828', '2026-03-06', '2026-03-09', 2, 'confirmed', 2550, 'direct', 'paid', NULL, '2026-03-01'),

-- FUTURE: Mid-Late March
('5584eba7-506a-4fd4-90bb-875749724839', '007adea4-a8f4-436e-983a-b4e8b319993f', 'Rachel Green', 'rachel.g@email.com', '+1 555-2929', '2026-03-12', '2026-03-15', 2, 'confirmed', 1350, 'website', 'paid', NULL, '2026-03-05'),
('5584eba7-506a-4fd4-90bb-875749724839', 'ddca4c8c-322f-4730-96aa-875a9d28d932', 'Marco Fontana', 'marco.f@email.it', '+39 340-3030', '2026-03-14', '2026-03-18', 3, 'confirmed', 3400, 'phone', 'unpaid', 'Family celebration', '2026-03-06'),
('5584eba7-506a-4fd4-90bb-875749724839', '564b36af-d01a-4ce1-9489-e0cf9fcf866a', 'Catherine Blanc', 'catherine.b@email.fr', '+33 6-3131', '2026-03-15', '2026-03-20', 2, 'confirmed', 11000, 'website', 'paid', 'Honeymoon package', '2026-03-07'),
('5584eba7-506a-4fd4-90bb-875749724839', '007adea4-a8f4-436e-983a-b4e8b319993f', 'Kenji Yamamoto', 'kenji.y@email.jp', '+81 80-3232', '2026-03-18', '2026-03-21', 1, 'pending', 1350, 'website', 'unpaid', NULL, '2026-03-08'),
('5584eba7-506a-4fd4-90bb-875749724839', '007adea4-a8f4-436e-983a-b4e8b319993f', 'Olga Ivanova', 'olga.i@email.ru', '+7 903-3333', '2026-03-20', '2026-03-23', 2, 'pending', 1350, 'direct', 'unpaid', 'Non-smoking room', '2026-03-08'),
('5584eba7-506a-4fd4-90bb-875749724839', 'ddca4c8c-322f-4730-96aa-875a9d28d932', 'Daniel Costa', 'daniel.c@email.br', '+55 11-3434', '2026-03-22', '2026-03-26', 2, 'confirmed', 3400, 'website', 'paid', NULL, '2026-03-08'),
('5584eba7-506a-4fd4-90bb-875749724839', '007adea4-a8f4-436e-983a-b4e8b319993f', 'Eva Lindberg', 'eva.l@email.se', '+46 70-3535', '2026-03-25', '2026-03-28', 2, 'pending', 1350, 'phone', 'unpaid', NULL, '2026-03-08'),

-- FUTURE: April
('5584eba7-506a-4fd4-90bb-875749724839', 'ddca4c8c-322f-4730-96aa-875a9d28d932', 'Mohammed Ali', 'mohammed.a@email.com', '+971 55-3636', '2026-04-01', '2026-04-05', 2, 'confirmed', 3400, 'website', 'paid', 'VIP guest', '2026-03-05'),
('5584eba7-506a-4fd4-90bb-875749724839', '564b36af-d01a-4ce1-9489-e0cf9fcf866a', 'Victoria Bell', 'victoria.b@email.co.uk', '+44 7711-3737', '2026-04-02', '2026-04-06', 4, 'confirmed', 8800, 'direct', 'paid', 'Birthday celebration', '2026-03-06'),
('5584eba7-506a-4fd4-90bb-875749724839', '007adea4-a8f4-436e-983a-b4e8b319993f', 'Henrik Johansson', 'henrik.j@email.se', '+46 73-3838', '2026-04-05', '2026-04-08', 1, 'pending', 1350, 'website', 'unpaid', NULL, '2026-03-08'),
('5584eba7-506a-4fd4-90bb-875749724839', '007adea4-a8f4-436e-983a-b4e8b319993f', 'Mia Rossi', 'mia.r@email.it', '+39 333-3939', '2026-04-08', '2026-04-12', 2, 'pending', 1800, 'website', 'unpaid', 'Ground floor if possible', '2026-03-08'),
('5584eba7-506a-4fd4-90bb-875749724839', 'ddca4c8c-322f-4730-96aa-875a9d28d932', 'Oscar Petersen', 'oscar.p@email.dk', '+45 20-4040', '2026-04-10', '2026-04-14', 3, 'confirmed', 3400, 'phone', 'unpaid', NULL, '2026-03-07'),
('5584eba7-506a-4fd4-90bb-875749724839', '564b36af-d01a-4ce1-9489-e0cf9fcf866a', 'Isabelle Morel', 'isabelle.m@email.fr', '+33 7-4141', '2026-04-12', '2026-04-16', 2, 'confirmed', 8800, 'website', 'paid', 'Spa package included', '2026-03-06'),
('5584eba7-506a-4fd4-90bb-875749724839', '007adea4-a8f4-436e-983a-b4e8b319993f', 'Leo Fischer', 'leo.f@email.de', '+49 172-4242', '2026-04-15', '2026-04-18', 2, 'pending', 1350, 'direct', 'unpaid', NULL, '2026-03-08'),
('5584eba7-506a-4fd4-90bb-875749724839', 'ddca4c8c-322f-4730-96aa-875a9d28d932', 'Zara Patel', 'zara.p@email.in', '+91 99-4343', '2026-04-18', '2026-04-22', 2, 'pending', 3400, 'website', 'unpaid', 'Vegan meals', '2026-03-08'),
('5584eba7-506a-4fd4-90bb-875749724839', '007adea4-a8f4-436e-983a-b4e8b319993f', 'Noah Williams', 'noah.w@email.com', '+1 555-4444', '2026-04-20', '2026-04-23', 2, 'pending', 1350, 'website', 'unpaid', NULL, '2026-03-08'),
('5584eba7-506a-4fd4-90bb-875749724839', '564b36af-d01a-4ce1-9489-e0cf9fcf866a', 'Elena Voronova', 'elena.v@email.ru', '+7 926-4545', '2026-04-22', '2026-04-27', 3, 'confirmed', 11000, 'phone', 'paid', 'Private dining each evening', '2026-03-07'),
('5584eba7-506a-4fd4-90bb-875749724839', 'ddca4c8c-322f-4730-96aa-875a9d28d932', 'Benjamin Taylor', 'ben.t@email.com', '+1 555-4646', '2026-04-25', '2026-04-28', 2, 'pending', 2550, 'website', 'unpaid', NULL, '2026-03-08'),
('5584eba7-506a-4fd4-90bb-875749724839', '007adea4-a8f4-436e-983a-b4e8b319993f', 'Amara Okafor', 'amara.o@email.ng', '+234 80-4747', '2026-04-28', '2026-04-30', 1, 'pending', 900, 'direct', 'unpaid', NULL, '2026-03-08');
