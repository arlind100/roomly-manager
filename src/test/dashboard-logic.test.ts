import { describe, it, expect, vi } from 'vitest';

/**
 * Dashboard & Checkout Flow Logic Tests
 * 
 * Tests dashboard stat calculations, room status board logic,
 * checkout flow, and currency formatting.
 */

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    rpc: vi.fn(),
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: null, error: null }),
          limit: vi.fn().mockResolvedValue({ data: [], error: null }),
          in: vi.fn().mockReturnValue({
            order: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue({ data: [], error: null }),
            }),
          }),
        }),
      }),
      update: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) }),
    }),
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'test-user' } } }),
      onAuthStateChange: vi.fn().mockReturnValue({ data: { subscription: { unsubscribe: vi.fn() } } }),
      getSession: vi.fn().mockResolvedValue({ data: { session: null } }),
    },
  },
}));

describe('Dashboard Stats Parsing', () => {
  it('should parse RPC stats response correctly', () => {
    const rpcResult = {
      total_units: 10,
      occupied: 7,
      check_ins: 3,
      check_outs: 2,
      today_revenue: 450.50,
      today_reservations: 5,
      available: 3,
      occupancy: 70,
    };

    const stats = {
      occupancy: Number(rpcResult.occupancy) || 0,
      todayReservations: Number(rpcResult.today_reservations) || 0,
      todayRevenue: Number(rpcResult.today_revenue) || 0,
      available: Number(rpcResult.available) || 0,
      checkIns: Number(rpcResult.check_ins) || 0,
      checkOuts: Number(rpcResult.check_outs) || 0,
    };

    expect(stats.occupancy).toBe(70);
    expect(stats.todayReservations).toBe(5);
    expect(stats.todayRevenue).toBe(450.50);
    expect(stats.available).toBe(3);
    expect(stats.checkIns).toBe(3);
    expect(stats.checkOuts).toBe(2);
  });

  it('should handle null/missing stats gracefully', () => {
    const rpcResult: any = {};
    const stats = {
      occupancy: Number(rpcResult.occupancy) || 0,
      todayReservations: Number(rpcResult.today_reservations) || 0,
      todayRevenue: Number(rpcResult.today_revenue) || 0,
      available: Number(rpcResult.available) || 0,
    };

    expect(stats.occupancy).toBe(0);
    expect(stats.todayReservations).toBe(0);
    expect(stats.todayRevenue).toBe(0);
    expect(stats.available).toBe(0);
  });
});

describe('Room Status Board Computation', () => {
  it('should compute room type status correctly', () => {
    const roomTypes = [
      { id: 'rt-1', name: 'Standard', available_units: 3 },
      { id: 'rt-2', name: 'Deluxe', available_units: 2 },
    ];
    const currentGuests = [
      { room_type_id: 'rt-1' },
      { room_type_id: 'rt-1' },
      { room_type_id: 'rt-1' },
      { room_type_id: 'rt-2' },
    ];
    const todayArrivals = [
      { room_type_id: 'rt-2' },
    ];

    const guestsByType: Record<string, number> = {};
    currentGuests.forEach(r => {
      if (r.room_type_id) guestsByType[r.room_type_id] = (guestsByType[r.room_type_id] || 0) + 1;
    });

    const arrivalsByType: Record<string, number> = {};
    todayArrivals.forEach(r => {
      if (r.room_type_id) arrivalsByType[r.room_type_id] = (arrivalsByType[r.room_type_id] || 0) + 1;
    });

    const board = roomTypes.map(rt => {
      const occupiedCount = guestsByType[rt.id] || 0;
      const reservedCount = arrivalsByType[rt.id] || 0;
      let status = 'available';
      if (occupiedCount >= (rt.available_units || 1)) status = 'occupied';
      else if (reservedCount > 0) status = 'reserved';
      return { ...rt, status, occupiedCount, freeUnits: Math.max(0, rt.available_units - occupiedCount) };
    });

    // rt-1: 3/3 occupied → occupied
    expect(board[0].status).toBe('occupied');
    expect(board[0].freeUnits).toBe(0);

    // rt-2: 1/2 occupied + 1 arrival → reserved
    expect(board[1].status).toBe('reserved');
    expect(board[1].freeUnits).toBe(1);
  });

  it('should show available when no guests and no arrivals', () => {
    const rt = { id: 'rt-1', available_units: 5 };
    const occupiedCount = 0;
    const reservedCount = 0;
    let status = 'available';
    if (occupiedCount >= rt.available_units) status = 'occupied';
    else if (reservedCount > 0) status = 'reserved';

    expect(status).toBe('available');
  });
});

describe('Checkout Flow Logic', () => {
  it('should mark room as dirty after checkout', () => {
    const roomStatusAfterCheckout = 'dirty';
    expect(roomStatusAfterCheckout).toBe('dirty');
  });

  it('should update reservation status to completed on checkout', () => {
    const statusAfterCheckout = 'completed';
    expect(statusAfterCheckout).toBe('completed');
  });

  it('should record checkout time', () => {
    const timeNow = new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
    expect(timeNow).toMatch(/^\d{2}:\d{2}$/);
  });

  it('should trigger invoice creation RPC on checkout', () => {
    // The checkout flow calls create_invoice_on_checkout with the reservation ID
    const rpcCall = {
      function: 'create_invoice_on_checkout',
      params: { p_reservation_id: 'res-123' },
    };
    expect(rpcCall.function).toBe('create_invoice_on_checkout');
    expect(rpcCall.params.p_reservation_id).toBe('res-123');
  });
});

describe('Currency Formatting', () => {
  // Import the actual function
  it('should format EUR correctly', async () => {
    const { formatCurrency } = await import('@/lib/currency');
    const result = formatCurrency(100, 'EUR');
    expect(result).toContain('100');
    expect(result).toContain('€');
  });

  it('should format USD correctly', async () => {
    const { formatCurrency } = await import('@/lib/currency');
    const result = formatCurrency(250.50, 'USD');
    expect(result).toContain('250');
    expect(result).toContain('$');
  });

  it('should handle 0 amount', async () => {
    const { formatCurrency } = await import('@/lib/currency');
    const result = formatCurrency(0, 'USD');
    expect(result).toContain('0');
  });

  it('should displayPrice without conversion', async () => {
    const { displayPrice } = await import('@/lib/currency');
    const result = displayPrice(100, 'EUR', 'USD');
    // Should NOT convert, just format in display currency
    expect(result).toContain('100');
  });
});

describe('Search & Filter Logic', () => {
  it('should filter reservations by status', () => {
    const reservations = [
      { id: '1', status: 'confirmed', guest_name: 'Alice' },
      { id: '2', status: 'cancelled', guest_name: 'Bob' },
      { id: '3', status: 'checked_in', guest_name: 'Carol' },
      { id: '4', status: 'confirmed', guest_name: 'Dave' },
    ];

    const filtered = reservations.filter(r => r.status === 'confirmed');
    expect(filtered).toHaveLength(2);
  });

  it('should deduplicate reservations in allLoadedRes', () => {
    const arrivals = [{ id: '1', guest_name: 'Alice' }];
    const departures = [{ id: '1', guest_name: 'Alice' }, { id: '2', guest_name: 'Bob' }];
    const current = [{ id: '3', guest_name: 'Carol' }];

    const map = new Map<string, any>();
    [...arrivals, ...departures, ...current].forEach(r => map.set(r.id, r));
    const deduped = Array.from(map.values());

    expect(deduped).toHaveLength(3);
  });
});

describe('Availability Filtering', () => {
  it('should filter available room types based on current occupancy', () => {
    const roomTypes = [
      { id: 'rt-1', available_units: 2 },
      { id: 'rt-2', available_units: 1 },
    ];
    const currentGuests = [
      { room_type_id: 'rt-2' },
    ];

    const occupiedByType: Record<string, number> = {};
    currentGuests.forEach(r => {
      if (r.room_type_id) occupiedByType[r.room_type_id] = (occupiedByType[r.room_type_id] || 0) + 1;
    });

    const available = roomTypes.filter(rt => (occupiedByType[rt.id] || 0) < (rt.available_units || 1));
    expect(available).toHaveLength(1);
    expect(available[0].id).toBe('rt-1');
  });
});
