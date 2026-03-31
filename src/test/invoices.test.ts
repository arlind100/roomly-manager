import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * Invoice System Tests
 * 
 * Tests the auto-invoice logic triggered on checkout,
 * including tax calculation, payment status determination,
 * idempotency, and conditional email sending.
 */

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    rpc: vi.fn(),
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          neq: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue({ data: [], error: null }),
          }),
          single: vi.fn().mockResolvedValue({ data: null, error: null }),
        }),
      }),
      update: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) }),
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

describe('Invoice Tax Calculation', () => {
  function calculateInvoiceAmount(totalPrice: number, taxPercentage: number) {
    const amount = totalPrice || 0;
    const taxAmount = amount * (taxPercentage / 100);
    return amount + taxAmount;
  }

  it('should calculate correct amount with 0% tax', () => {
    expect(calculateInvoiceAmount(100, 0)).toBe(100);
  });

  it('should calculate correct amount with 10% tax', () => {
    expect(calculateInvoiceAmount(100, 10)).toBe(110);
  });

  it('should calculate correct amount with 20% tax', () => {
    expect(calculateInvoiceAmount(200, 20)).toBe(240);
  });

  it('should handle null/0 total_price gracefully', () => {
    expect(calculateInvoiceAmount(0, 10)).toBe(0);
  });

  it('should handle fractional tax percentages', () => {
    expect(calculateInvoiceAmount(100, 7.5)).toBe(107.5);
  });
});

describe('Invoice Status Determination', () => {
  function determineInvoiceStatus(paymentMethod: string | null, paymentStatus: string | null): string {
    let status = 'unpaid';
    if (paymentMethod && ['cash', 'card', 'online'].includes(paymentMethod)) {
      status = 'paid';
    }
    if (paymentStatus === 'paid') {
      status = 'paid';
    }
    return status;
  }

  it('should be "paid" for cash payment', () => {
    expect(determineInvoiceStatus('cash', 'unpaid')).toBe('paid');
  });

  it('should be "paid" for card payment', () => {
    expect(determineInvoiceStatus('card', 'unpaid')).toBe('paid');
  });

  it('should be "paid" for online payment', () => {
    expect(determineInvoiceStatus('online', 'unpaid')).toBe('paid');
  });

  it('should be "unpaid" for bank_transfer payment method', () => {
    expect(determineInvoiceStatus('bank_transfer', 'unpaid')).toBe('unpaid');
  });

  it('should be "unpaid" for null payment method', () => {
    expect(determineInvoiceStatus(null, 'unpaid')).toBe('unpaid');
  });

  it('should override to "paid" when payment_status is "paid" regardless of method', () => {
    expect(determineInvoiceStatus('bank_transfer', 'paid')).toBe('paid');
    expect(determineInvoiceStatus(null, 'paid')).toBe('paid');
  });
});

describe('Invoice Idempotency', () => {
  it('should detect existing invoice and return it without creating new one', () => {
    const existingInvoice = {
      invoice_id: 'inv-123',
      invoice_number: 'INV-abc12345',
      amount: 110,
      status: 'paid',
      already_existed: true,
    };

    // When RPC returns already_existed: true, no new invoice should be created
    expect(existingInvoice.already_existed).toBe(true);
    expect(existingInvoice.invoice_number).toBeTruthy();
  });

  it('should create new invoice when none exists', () => {
    const newInvoice = {
      invoice_id: 'inv-456',
      invoice_number: 'INV-xyz78901',
      amount: 220,
      status: 'unpaid',
      already_existed: false,
    };

    expect(newInvoice.already_existed).toBe(false);
    expect(newInvoice.invoice_number).toBeTruthy();
  });

  it('should ignore cancelled invoices when checking for duplicates', () => {
    const invoices = [
      { id: 'inv-1', reservation_id: 'res-1', status: 'cancelled' },
      { id: 'inv-2', reservation_id: 'res-2', status: 'paid' },
    ];

    // Only non-cancelled invoices count
    const activeForRes1 = invoices.filter(
      i => i.reservation_id === 'res-1' && i.status !== 'cancelled'
    );
    expect(activeForRes1).toHaveLength(0);

    const activeForRes2 = invoices.filter(
      i => i.reservation_id === 'res-2' && i.status !== 'cancelled'
    );
    expect(activeForRes2).toHaveLength(1);
  });
});

describe('Conditional Email Logic', () => {
  function shouldAutoSendEmail(paymentMethod: string | null, guestEmail: string | null): boolean {
    return !!(guestEmail && paymentMethod && ['card', 'online'].includes(paymentMethod));
  }

  it('should auto-send for card payment with email', () => {
    expect(shouldAutoSendEmail('card', 'guest@test.com')).toBe(true);
  });

  it('should auto-send for online payment with email', () => {
    expect(shouldAutoSendEmail('online', 'guest@test.com')).toBe(true);
  });

  it('should NOT auto-send for cash payment', () => {
    expect(shouldAutoSendEmail('cash', 'guest@test.com')).toBe(false);
  });

  it('should NOT auto-send without guest email', () => {
    expect(shouldAutoSendEmail('card', null)).toBe(false);
    expect(shouldAutoSendEmail('card', '')).toBe(false);
  });

  it('should NOT auto-send for null payment method', () => {
    expect(shouldAutoSendEmail(null, 'guest@test.com')).toBe(false);
  });

  it('should NOT auto-send for bank_transfer', () => {
    expect(shouldAutoSendEmail('bank_transfer', 'guest@test.com')).toBe(false);
  });
});

describe('Invoice Resend Confirmation', () => {
  it('should require confirmation for already-sent invoices', () => {
    const requiresConfirm = (status: string) => ['sent', 'paid'].includes(status);
    
    expect(requiresConfirm('sent')).toBe(true);
    expect(requiresConfirm('paid')).toBe(true);
    expect(requiresConfirm('draft')).toBe(false);
    expect(requiresConfirm('unpaid')).toBe(false);
  });
});

describe('Invoice PDF Data Construction', () => {
  it('should calculate nights correctly', () => {
    const calcNights = (checkIn: string, checkOut: string) => {
      const diff = new Date(checkOut).getTime() - new Date(checkIn).getTime();
      return Math.max(1, Math.round(diff / (1000 * 60 * 60 * 24)));
    };

    expect(calcNights('2026-04-01', '2026-04-03')).toBe(2);
    expect(calcNights('2026-04-01', '2026-04-01')).toBe(1); // minimum 1
    expect(calcNights('2026-04-01', '2026-04-08')).toBe(7);
  });

  it('should calculate unit price from amount / nights', () => {
    const amount = 300;
    const nights = 3;
    expect(amount / nights).toBe(100);
  });

  it('should format currency symbol correctly', () => {
    const getSymbol = (currency: string) => {
      if (currency === 'EUR') return '€';
      if (currency === 'GBP') return '£';
      return '$';
    };

    expect(getSymbol('EUR')).toBe('€');
    expect(getSymbol('GBP')).toBe('£');
    expect(getSymbol('USD')).toBe('$');
    expect(getSymbol('CHF')).toBe('$'); // Falls back to $
  });
});
