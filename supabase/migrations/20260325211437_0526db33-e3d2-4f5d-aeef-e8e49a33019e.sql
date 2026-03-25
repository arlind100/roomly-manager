
-- Cancel the duplicate invoice (keep the first one)
UPDATE invoices SET status = 'cancelled' WHERE id = '7641bde2-c093-495b-8a32-172ca20203aa';

-- Now create the unique partial index
CREATE UNIQUE INDEX IF NOT EXISTS idx_invoices_unique_reservation
ON invoices (reservation_id)
WHERE reservation_id IS NOT NULL AND status != 'cancelled';

-- Performance indexes
CREATE INDEX IF NOT EXISTS idx_reservations_hotel_status ON reservations (hotel_id, status);
CREATE INDEX IF NOT EXISTS idx_reservations_hotel_dates ON reservations (hotel_id, check_in, check_out);
CREATE INDEX IF NOT EXISTS idx_reservations_room_type_dates ON reservations (room_type_id, check_in, check_out) WHERE status != 'cancelled';
CREATE INDEX IF NOT EXISTS idx_rooms_hotel_id ON rooms (hotel_id);
CREATE INDEX IF NOT EXISTS idx_rooms_hotel_type ON rooms (hotel_id, room_type_id);
CREATE INDEX IF NOT EXISTS idx_staff_hotel_id ON staff (hotel_id);
CREATE INDEX IF NOT EXISTS idx_invoices_hotel_id ON invoices (hotel_id);
CREATE INDEX IF NOT EXISTS idx_room_types_hotel_id ON room_types (hotel_id);
CREATE INDEX IF NOT EXISTS idx_availability_blocks_lookup ON availability_blocks (room_type_id, hotel_id, date);
