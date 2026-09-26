import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import type { Booking } from '@/types/database.types';
import { useCreateBooking } from './useCreateBooking';

const mocks = vi.hoisted(() => {
  const single = vi.fn();
  const select = vi.fn(() => ({ single }));
  const insert = vi.fn(() => ({ select }));
  const from = vi.fn(() => ({ insert }));
  return { single, select, insert, from };
});

vi.mock('@/lib/supabaseClient', () => ({
  supabase: { from: mocks.from },
}));

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({
    session: { user: { id: 'user-1' } },
  }),
}));

const created: Booking = {
  id: 'b-1',
  booking_number: 'CF-2026-0042',
  caftan_id: 'c-1',
  customer_id: 'user-1',
  start_date: '2026-10-01',
  end_date: '2026-10-03',
  total_price: 2400,
  status: 'pending',
  deposit_status: 'unpaid',
  customer_notes: '',
  rental_period: '[2026-10-01,2026-10-04)',
  created_at: '2026-09-26T10:00:00Z',
  updated_at: '2026-09-26T10:00:00Z',
};

describe('useCreateBooking', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.select.mockReturnValue({ single: mocks.single });
    mocks.insert.mockReturnValue({ select: mocks.select });
    mocks.from.mockReturnValue({ insert: mocks.insert });
  });

  it('inserts the booking and returns the created row', async () => {
    mocks.single.mockResolvedValue({ data: created, error: null });
    const { result } = renderHook(() => useCreateBooking());

    let outcome: { booking: Booking | null; errorKey: string | null } | undefined;
    await act(async () => {
      outcome = await result.current.createBooking({
        caftanId: 'c-1',
        startDate: '2026-10-01',
        endDate: '2026-10-03',
        customerNotes: '',
      });
    });

    expect(outcome?.booking).toEqual(created);
    expect(outcome?.errorKey).toBeNull();
    expect(mocks.from).toHaveBeenCalledWith('bookings');
    expect(mocks.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        caftan_id: 'c-1',
        customer_id: 'user-1',
        start_date: '2026-10-01',
        end_date: '2026-10-03',
        total_price: 0, // real total is computed by the server trigger
      })
    );
    expect(result.current.submitting).toBe(false);
  });

  it('maps the overlap exclusion violation to the friendly error key', async () => {
    mocks.single.mockResolvedValue({
      data: null,
      error: {
        code: '23P01',
        message: 'conflicting key value violates exclusion constraint "no_overlapping_active_bookings"',
      },
    });
    const { result } = renderHook(() => useCreateBooking());

    let outcome: { booking: Booking | null; errorKey: string | null } | undefined;
    await act(async () => {
      outcome = await result.current.createBooking({
        caftanId: 'c-1',
        startDate: '2026-10-01',
        endDate: '2026-10-03',
        customerNotes: '',
      });
    });

    expect(outcome?.booking).toBeNull();
    expect(outcome?.errorKey).toBe('booking.error_overlap');
  });
});
