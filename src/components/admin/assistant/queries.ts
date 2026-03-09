import { supabase } from '@/integrations/supabase/client';
import { ReservationResult, AvailabilityResult } from './types';
import { differenceInDays, format } from 'date-fns';

async function fetchReservations(filter: (query: any) => any): Promise<ReservationResult[]> {
  let query = supabase
    .from('reservations')
    .select('id, guest_name, guest_email, guest_phone, check_in, check_out, status, external_platform, room_type_id, room_types(name)')
    .order('check_in', { ascending: false });

  query = filter(query);
  const { data, error } = await query;
  if (error) throw error;

  return (data || []).map((r: any) => ({
    id: r.id,
    guest_name: r.guest_name,
    room_type_name: r.room_types?.name || '—',
    check_in: r.check_in,
    check_out: r.check_out,
    status: r.status,
    guest_email: r.guest_email,
    guest_phone: r.guest_phone,
    external_platform: r.external_platform,
  }));
}

export async function executeAction(
  actionId: string,
  input: Record<string, string>,
  hotelId?: string
): Promise<{ message: string; results?: ReservationResult[]; availabilityResults?: AvailabilityResult[] }> {
  switch (actionId) {
    case 'find-by-name': {
      const name = input.guestName;
      const results = await fetchReservations(q => q.ilike('guest_name', `%${name}%`));
      return {
        message: results.length ? `Found ${results.length} reservation(s) matching "${name}":` : `No reservations found for "${name}".`,
        results,
      };
    }

    case 'check-availability': {
      const [checkIn, checkOut] = (input.dates || '').split('|');
      if (!hotelId) return { message: 'Hotel not configured.' };

      const { data: roomTypes } = await supabase
        .from('room_types')
        .select('id, name, available_units')
        .eq('hotel_id', hotelId);

      if (!roomTypes?.length) return { message: 'No room types configured.' };

      const { data: reservations } = await supabase
        .from('reservations')
        .select('room_type_id')
        .lt('check_in', checkOut)
        .gt('check_out', checkIn)
        .neq('status', 'cancelled');

      const bookedCount: Record<string, number> = {};
      (reservations || []).forEach(r => {
        if (r.room_type_id) bookedCount[r.room_type_id] = (bookedCount[r.room_type_id] || 0) + 1;
      });

      const availabilityResults: AvailabilityResult[] = roomTypes.map(rt => ({
        room_type_id: rt.id,
        name: rt.name,
        available_units: rt.available_units,
        booked_units: bookedCount[rt.id] || 0,
        free_units: rt.available_units - (bookedCount[rt.id] || 0),
      }));

      return {
        message: `Availability for ${checkIn} → ${checkOut}:`,
        availabilityResults,
      };
    }

    case 'reservations-by-room': {
      const results = await fetchReservations(q => q.eq('room_type_id', input.roomTypeId));
      return {
        message: results.length ? `Found ${results.length} reservation(s):` : 'No reservations for this room type.',
        results,
      };
    }

    case 'reservations-between-dates': {
      const [start, end] = (input.dates || '').split('|');
      const results = await fetchReservations(q => q.gte('check_in', start).lte('check_out', end));
      return {
        message: results.length ? `Found ${results.length} reservation(s) between ${start} and ${end}:` : 'No reservations in this date range.',
        results,
      };
    }

    case 'external-reservations': {
      const results = await fetchReservations(q => q.not('external_platform', 'is', null));
      return {
        message: results.length ? `Found ${results.length} external reservation(s):` : 'No external platform reservations found.',
        results,
      };
    }

    case 'long-stays': {
      const all = await fetchReservations(q => q);
      const results = all.filter(r => differenceInDays(new Date(r.check_out), new Date(r.check_in)) > 3);
      return {
        message: results.length ? `Found ${results.length} reservation(s) longer than 3 nights:` : 'No long-stay reservations found.',
        results,
      };
    }

    case 'current-guests': {
      const today = format(new Date(), 'yyyy-MM-dd');
      const results = await fetchReservations(q => q.lte('check_in', today).gte('check_out', today).neq('status', 'cancelled'));
      return {
        message: results.length ? `${results.length} guest(s) currently staying:` : 'No guests currently in the hotel.',
        results,
      };
    }

    case 'missing-contact': {
      const all = await fetchReservations(q => q);
      const results = all.filter(r => !r.guest_email || !r.guest_phone);
      return {
        message: results.length ? `Found ${results.length} reservation(s) with missing contact info:` : 'All reservations have complete contact information.',
        results,
      };
    }

    case 'search-contact': {
      const contact = input.contact;
      const byEmail = await fetchReservations(q => q.ilike('guest_email', `%${contact}%`));
      const byPhone = await fetchReservations(q => q.ilike('guest_phone', `%${contact}%`));
      const seen = new Set<string>();
      const results = [...byEmail, ...byPhone].filter(r => {
        if (seen.has(r.id)) return false;
        seen.add(r.id);
        return true;
      });
      return {
        message: results.length ? `Found ${results.length} reservation(s) matching "${contact}":` : `No reservations found for "${contact}".`,
        results,
      };
    }

    case 'overlapping-date': {
      const date = input.date;
      const results = await fetchReservations(q => q.lte('check_in', date).gt('check_out', date));
      return {
        message: results.length ? `Found ${results.length} reservation(s) overlapping ${date}:` : `No reservations overlap with ${date}.`,
        results,
      };
    }

    default:
      return { message: 'Unknown action.' };
  }
}
