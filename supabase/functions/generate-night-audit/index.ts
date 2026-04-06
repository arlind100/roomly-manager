import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, serviceKey);

    const { hotel_id, audit_date } = await req.json();
    if (!hotel_id || !audit_date) {
      return new Response(JSON.stringify({ error: 'hotel_id and audit_date required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Fetch hotel
    const { data: hotel } = await supabase.from('hotels').select('*').eq('id', hotel_id).single();
    if (!hotel) {
      return new Response(JSON.stringify({ error: 'Hotel not found' }), {
        status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Arrivals expected (confirmed for this date)
    const { count: arrivalsExpected } = await supabase.from('reservations')
      .select('id', { count: 'exact', head: true })
      .eq('hotel_id', hotel_id).eq('check_in', audit_date).in('status', ['confirmed', 'checked_in', 'no_show']);

    // Arrivals actual (checked in on this date)
    const { count: arrivalsActual } = await supabase.from('reservations')
      .select('id', { count: 'exact', head: true })
      .eq('hotel_id', hotel_id).eq('check_in', audit_date).eq('status', 'checked_in');

    // Departures expected
    const { count: departuresExpected } = await supabase.from('reservations')
      .select('id', { count: 'exact', head: true })
      .eq('hotel_id', hotel_id).eq('check_out', audit_date).in('status', ['confirmed', 'checked_in', 'completed']);

    // Departures actual
    const { count: departuresActual } = await supabase.from('reservations')
      .select('id', { count: 'exact', head: true })
      .eq('hotel_id', hotel_id).eq('check_out', audit_date).eq('status', 'completed');

    // No-shows
    const { count: noShows } = await supabase.from('reservations')
      .select('id', { count: 'exact', head: true })
      .eq('hotel_id', hotel_id).eq('check_in', audit_date).eq('status', 'no_show');

    // Occupancy
    const { data: totalUnitsData } = await supabase.from('room_types')
      .select('available_units').eq('hotel_id', hotel_id);
    const totalUnits = (totalUnitsData || []).reduce((s: number, rt: any) => s + (rt.available_units || 0), 0);

    const { count: occupied } = await supabase.from('reservations')
      .select('id', { count: 'exact', head: true })
      .eq('hotel_id', hotel_id).lte('check_in', audit_date).gt('check_out', audit_date)
      .in('status', ['confirmed', 'checked_in']);

    const occupancyRate = totalUnits > 0 ? Math.round(((occupied || 0) / totalUnits) * 100) : 0;

    // Revenue for the day
    const { data: dayRes } = await supabase.from('reservations')
      .select('total_price, check_in, check_out')
      .eq('hotel_id', hotel_id).lte('check_in', audit_date).gt('check_out', audit_date)
      .neq('status', 'cancelled');
    const revenueToday = (dayRes || []).reduce((s: number, r: any) => {
      const nights = Math.max(1, Math.ceil((new Date(r.check_out).getTime() - new Date(r.check_in).getTime()) / 86400000));
      return s + ((Number(r.total_price) || 0) / nights);
    }, 0);

    // Unpaid invoices
    const { data: unpaidInvs } = await supabase.from('invoices')
      .select('amount').eq('hotel_id', hotel_id).in('status', ['unpaid', 'draft', 'sent']);
    const unpaidCount = unpaidInvs?.length || 0;
    const unpaidTotal = (unpaidInvs || []).reduce((s: number, i: any) => s + (Number(i.amount) || 0), 0);

    // Rooms by status
    const { data: roomsData } = await supabase.from('rooms')
      .select('operational_status').eq('hotel_id', hotel_id).eq('is_active', true);
    const roomsByStatus: Record<string, number> = {};
    (roomsData || []).forEach((r: any) => {
      roomsByStatus[r.operational_status] = (roomsByStatus[r.operational_status] || 0) + 1;
    });

    const auditEmail = hotel.night_audit_email || hotel.email;

    // Upsert audit log
    const { data: auditLog, error: upsertError } = await supabase.from('night_audit_logs')
      .upsert({
        hotel_id, audit_date,
        generated_at: new Date().toISOString(),
        arrivals_expected: arrivalsExpected || 0,
        arrivals_actual: arrivalsActual || 0,
        departures_expected: departuresExpected || 0,
        departures_actual: departuresActual || 0,
        no_shows: noShows || 0,
        occupancy_rate: occupancyRate,
        revenue_today: Math.round(revenueToday * 100) / 100,
        unpaid_invoices_count: unpaidCount,
        unpaid_invoices_total: Math.round(unpaidTotal * 100) / 100,
        rooms_by_status: roomsByStatus,
        sent_to_email: auditEmail,
      }, { onConflict: 'hotel_id,audit_date' })
      .select()
      .single();

    if (upsertError) {
      return new Response(JSON.stringify({ error: upsertError.message }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Send email if configured
    if (auditEmail) {
      const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
      if (RESEND_API_KEY) {
        const sym = hotel.currency === 'EUR' ? '€' : hotel.currency === 'GBP' ? '£' : '$';
        const html = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2 style="color: #1e293b;">Night Audit Report — ${audit_date}</h2>
            <p style="color: #64748b;">${hotel.name}</p>
            <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
              <tr><td style="padding: 8px; border-bottom: 1px solid #e2e8f0; color: #64748b;">Arrivals</td><td style="padding: 8px; border-bottom: 1px solid #e2e8f0; font-weight: 600;">${arrivalsActual || 0} / ${arrivalsExpected || 0}</td></tr>
              <tr><td style="padding: 8px; border-bottom: 1px solid #e2e8f0; color: #64748b;">Departures</td><td style="padding: 8px; border-bottom: 1px solid #e2e8f0; font-weight: 600;">${departuresActual || 0} / ${departuresExpected || 0}</td></tr>
              <tr><td style="padding: 8px; border-bottom: 1px solid #e2e8f0; color: #64748b;">No-Shows</td><td style="padding: 8px; border-bottom: 1px solid #e2e8f0; font-weight: 600;">${noShows || 0}</td></tr>
              <tr><td style="padding: 8px; border-bottom: 1px solid #e2e8f0; color: #64748b;">Occupancy</td><td style="padding: 8px; border-bottom: 1px solid #e2e8f0; font-weight: 600;">${occupancyRate}%</td></tr>
              <tr><td style="padding: 8px; border-bottom: 1px solid #e2e8f0; color: #64748b;">Revenue Today</td><td style="padding: 8px; border-bottom: 1px solid #e2e8f0; font-weight: 600;">${sym}${revenueToday.toFixed(2)}</td></tr>
              <tr><td style="padding: 8px; color: #64748b;">Unpaid Invoices</td><td style="padding: 8px; font-weight: 600;">${unpaidCount} (${sym}${unpaidTotal.toFixed(2)})</td></tr>
            </table>
            <p style="color: #94a3b8; font-size: 12px;">Generated automatically by Roomly</p>
          </div>
        `;

        await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            from: `${hotel.name} <${Deno.env.get('SENDER_EMAIL') || 'onboarding@resend.dev'}>`,
            to: [auditEmail],
            subject: `Night Audit Report — ${audit_date} — ${hotel.name}`,
            html,
          }),
        });
      }
    }

    return new Response(JSON.stringify({ success: true, audit: auditLog }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
