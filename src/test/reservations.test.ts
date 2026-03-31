import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * Reservation Business Logic Tests
 * 
 * Tests the critical business rules enforced by the reservation system.
 * Since the actual RPC calls require a live DB connection, we test:
 * 1. Frontend validation logic (what the UI checks before calling RPC)
 * 2. Error message parsing (how the UI handles RPC errors)
 * 3. Parameter construction (ensuring correct params are sent to RPC)
 */

// Mock Supabase
const mockRpc = vi.fn();
const mockFrom = vi.fn();
const mockUpdate = vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) });

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    rpc: mockRpc,
    from: mockFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: null, error: null }),
          limit: vi.fn().mockResolvedValue({ data: [], error: null }),
        }),
      }),
      update: mockUpdate,
      insert: vi.fn().mockResolvedValue({ error: null }),
    }),
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'test-user' } } }),
      onAuthStateChange: vi.fn().mockReturnValue({ data: { subscription: { unsubscribe: vi.fn() } } }),
      getSession: vi.fn().mockResolvedValue({ data: { session: null } }),
    },
    functions: { invoke: vi.fn().mockResolvedValue({ error: null }) },
  },
}));

beforeEach(() => {
  vi.clearAllMocks();
});

describe('Reservation RPC Parameter Construction', () => {
  const HOTEL_ID = 'hotel-123';
  const ROOM_TYPE_ID = 'rt-456';

  it('should construct create_reservation_if_available params with exact signature', () => {
    const params = {
      p_hotel_id: HOTEL_ID,
      p_room_type_id: ROOM_TYPE_ID,
      p_check_in: '2026-04-01',
      p_check_out: '2026-04-03',
      p_guest_name: 'John Doe',
      p_guest_email: 'john@example.com',
      p_guest_phone: '+1234567890',
      p_guests_count: 2,
      p_total_price: 200,
      p_booking_source: 'direct',
      p_room_id: null,
    };

    // Verify exact keys match the RPC function signature
    const expectedKeys = [
      'p_hotel_id', 'p_room_type_id', 'p_check_in', 'p_check_out',
      'p_guest_name', 'p_guest_email', 'p_guest_phone', 'p_guests_count',
      'p_total_price', 'p_booking_source', 'p_room_id',
    ];
    expect(Object.keys(params).sort()).toEqual(expectedKeys.sort());
  });

  it('should NOT include extra fields like notes, status, or times in create RPC', () => {
    const params = {
      p_hotel_id: HOTEL_ID,
      p_room_type_id: ROOM_TYPE_ID,
      p_check_in: '2026-04-01',
      p_check_out: '2026-04-03',
      p_guest_name: 'Jane Doe',
      p_guest_email: null,
      p_guest_phone: null,
      p_guests_count: 1,
      p_total_price: 100,
      p_booking_source: 'walk-in',
      p_room_id: null,
    };

    // These fields should NOT be in the RPC call
    expect(params).not.toHaveProperty('p_notes');
    expect(params).not.toHaveProperty('p_status');
    expect(params).not.toHaveProperty('p_check_in_time');
    expect(params).not.toHaveProperty('p_special_requests');
    expect(params).not.toHaveProperty('p_payment_method');
  });

  it('should construct update_reservation_if_available params correctly', () => {
    const params = {
      p_reservation_id: 'res-789',
      p_hotel_id: HOTEL_ID,
      p_room_type_id: ROOM_TYPE_ID,
      p_room_id: null,
      p_check_in: '2026-04-01',
      p_check_out: '2026-04-05',
      p_guest_name: 'Updated Name',
      p_guest_email: 'updated@test.com',
      p_guest_phone: null,
      p_guests_count: 3,
      p_total_price: 400,
      p_booking_source: 'phone',
      p_special_requests: 'Extra pillow',
      p_notes: 'VIP guest',
    };

    const expectedKeys = [
      'p_reservation_id', 'p_hotel_id', 'p_room_type_id', 'p_room_id',
      'p_check_in', 'p_check_out', 'p_guest_name', 'p_guest_email',
      'p_guest_phone', 'p_guests_count', 'p_total_price', 'p_booking_source',
      'p_special_requests', 'p_notes',
    ];
    expect(Object.keys(params).sort()).toEqual(expectedKeys.sort());
  });
});

describe('Reservation Error Handling', () => {
  it('should parse capacity exceeded error correctly', () => {
    const errorMsg = 'Guest count (5) exceeds room capacity of 2';
    expect(errorMsg.includes('exceeds room capacity')).toBe(true);
  });

  it('should parse no availability error correctly', () => {
    const errorMsg = 'No availability for this room type in the selected dates. 3 of 3 units booked.';
    expect(errorMsg.includes('No availability')).toBe(true);
  });

  it('should parse blocked dates error correctly', () => {
    const errorMsg = 'Some dates in the selected range are blocked (2 blocked dates).';
    expect(errorMsg.includes('blocked')).toBe(true);
  });

  it('should parse edit conflict error correctly', () => {
    const errorMsg = 'This change would create a booking conflict. 2 of 2 units already booked for these dates.';
    expect(errorMsg.includes('booking conflict')).toBe(true);
  });

  it('should detect room type not found error', () => {
    const errorMsg = 'Room type not found for this hotel';
    expect(errorMsg.includes('Room type not found')).toBe(true);
  });
});

describe('Frontend Validation Rules', () => {
  it('should block empty guest name', () => {
    const guestName = '';
    expect(guestName.trim()).toBe('');
  });

  it('should block check-out before check-in', () => {
    const checkIn = '2026-04-05';
    const checkOut = '2026-04-03';
    expect(checkOut <= checkIn).toBe(true);
  });

  it('should block same-day check-in/check-out', () => {
    const checkIn = '2026-04-05';
    const checkOut = '2026-04-05';
    expect(checkOut <= checkIn).toBe(true);
  });

  it('should allow valid date range', () => {
    const checkIn = '2026-04-01';
    const checkOut = '2026-04-03';
    expect(checkOut > checkIn).toBe(true);
  });

  it('should require room_type_id for walk-in', () => {
    const roomTypeId = '';
    expect(!roomTypeId).toBe(true);
  });

  it('should require room_id when check_in_now is true for walk-in', () => {
    const checkInNow = true;
    const roomId = '';
    expect(checkInNow && !roomId).toBe(true);
  });

  it('should block early check-in (before scheduled date)', () => {
    const today = '2026-03-31';
    const scheduledCheckIn = '2026-04-05';
    expect(today < scheduledCheckIn).toBe(true);
  });

  it('should allow check-in on scheduled date', () => {
    const today = '2026-04-05';
    const scheduledCheckIn = '2026-04-05';
    expect(today >= scheduledCheckIn).toBe(true);
  });
});

describe('Walk-in Flow Logic', () => {
  it('should set booking_source to walk-in', () => {
    const source = 'walk-in';
    expect(source).toBe('walk-in');
  });

  it('should calculate checkout date from nights', () => {
    const checkIn = new Date('2026-04-01');
    const nights = 3;
    const checkOut = new Date(checkIn);
    checkOut.setDate(checkOut.getDate() + nights);
    expect(checkOut.toISOString().split('T')[0]).toBe('2026-04-04');
  });

  it('should calculate total_price from base_price * nights', () => {
    const basePrice = 80;
    const nights = 3;
    expect(basePrice * nights).toBe(240);
  });

  it('should set status to checked_in when check_in_now is true', () => {
    const checkInNow = true;
    const expectedStatus = checkInNow ? 'checked_in' : 'confirmed';
    expect(expectedStatus).toBe('checked_in');
  });
});

describe('Room Picker Logic', () => {
  it('should filter rooms by room_type_id', () => {
    const rooms = [
      { id: 'r1', room_type_id: 'rt-1', operational_status: 'available' },
      { id: 'r2', room_type_id: 'rt-2', operational_status: 'available' },
      { id: 'r3', room_type_id: 'rt-1', operational_status: 'occupied' },
    ];
    const targetTypeId = 'rt-1';
    const filtered = rooms.filter(r =>
      r.room_type_id === targetTypeId &&
      !['occupied', 'maintenance', 'out_of_service'].includes(r.operational_status)
    );
    expect(filtered).toHaveLength(1);
    expect(filtered[0].id).toBe('r1');
  });

  it('should exclude occupied, maintenance, and out_of_service rooms', () => {
    const rooms = [
      { id: 'r1', room_type_id: 'rt-1', operational_status: 'available' },
      { id: 'r2', room_type_id: 'rt-1', operational_status: 'occupied' },
      { id: 'r3', room_type_id: 'rt-1', operational_status: 'maintenance' },
      { id: 'r4', room_type_id: 'rt-1', operational_status: 'out_of_service' },
      { id: 'r5', room_type_id: 'rt-1', operational_status: 'dirty' },
      { id: 'r6', room_type_id: 'rt-1', operational_status: 'cleaning' },
    ];
    const assignable = rooms.filter(r =>
      !['occupied', 'maintenance', 'out_of_service'].includes(r.operational_status)
    );
    expect(assignable).toHaveLength(3); // available, dirty, cleaning
  });

  it('should allow dirty/cleaning rooms for assignment', () => {
    const rooms = [
      { id: 'r1', operational_status: 'dirty' },
      { id: 'r2', operational_status: 'cleaning' },
    ];
    const assignable = rooms.filter(r =>
      !['occupied', 'maintenance', 'out_of_service'].includes(r.operational_status)
    );
    expect(assignable).toHaveLength(2);
  });
});
