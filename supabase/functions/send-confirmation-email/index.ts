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
    // Authenticate caller
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace('Bearer ', '');
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const userId = claimsData.claims.sub;

    // Check admin role
    const { data: isAdmin } = await supabase.rpc('has_role', { _user_id: userId, _role: 'admin' });
    if (!isAdmin) {
      return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const {
      to_email, guest_name, reservation_code, check_in, check_out,
      room_type_name, guests_count, total_price, currency, hotel_name,
      hotel_email, hotel_phone, hotel_address,
    } = await req.json();

    const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
    if (!RESEND_API_KEY) {
      return new Response(
        JSON.stringify({ error: 'RESEND_API_KEY not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!to_email) {
      return new Response(
        JSON.stringify({ error: 'No guest email provided' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const sym = currency === 'EUR' ? '€' : '$';
    const priceDisplay = total_price ? `${sym}${Number(total_price).toFixed(2)}` : 'N/A';

    const html = `
      <div style="font-family: 'Helvetica Neue', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px; background: #ffffff;">
        <div style="text-align: center; margin-bottom: 32px;">
          <h1 style="color: #1e293b; font-size: 24px; margin: 0 0 4px;">${hotel_name || 'Hotel'}</h1>
          <p style="color: #64748b; font-size: 14px; margin: 0;">Reservation Confirmation</p>
        </div>

        <div style="background: #f8fafc; border-radius: 8px; padding: 24px; margin-bottom: 24px;">
          <p style="margin: 0 0 12px; color: #334155; font-size: 16px;">Dear ${guest_name},</p>
          <p style="margin: 0; color: #64748b; font-size: 14px; line-height: 1.6;">
            Your reservation has been <strong style="color: #16a34a;">confirmed</strong>. Here are the details:
          </p>
        </div>

        <div style="border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden; margin-bottom: 24px;">
          <div style="background: #1e293b; color: white; padding: 16px 20px; text-align: center;">
            <p style="margin: 0 0 4px; font-size: 12px; opacity: 0.8; text-transform: uppercase; letter-spacing: 1px;">Reservation Code</p>
            <p style="margin: 0; font-size: 22px; font-weight: bold; letter-spacing: 2px;">${reservation_code}</p>
          </div>
          <div style="padding: 20px;">
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 8px 0; color: #64748b; font-size: 13px;">Check-in</td>
                <td style="padding: 8px 0; color: #1e293b; font-size: 13px; text-align: right; font-weight: 500;">${check_in}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #64748b; font-size: 13px;">Check-out</td>
                <td style="padding: 8px 0; color: #1e293b; font-size: 13px; text-align: right; font-weight: 500;">${check_out}</td>
              </tr>
              ${room_type_name ? `<tr>
                <td style="padding: 8px 0; color: #64748b; font-size: 13px;">Room Type</td>
                <td style="padding: 8px 0; color: #1e293b; font-size: 13px; text-align: right; font-weight: 500;">${room_type_name}</td>
              </tr>` : ''}
              <tr>
                <td style="padding: 8px 0; color: #64748b; font-size: 13px;">Guests</td>
                <td style="padding: 8px 0; color: #1e293b; font-size: 13px; text-align: right; font-weight: 500;">${guests_count}</td>
              </tr>
              ${total_price ? `<tr style="border-top: 1px solid #e2e8f0;">
                <td style="padding: 12px 0 8px; color: #1e293b; font-size: 14px; font-weight: 600;">Total</td>
                <td style="padding: 12px 0 8px; color: #1e293b; font-size: 14px; text-align: right; font-weight: 600;">${priceDisplay}</td>
              </tr>` : ''}
            </table>
          </div>
        </div>

        ${hotel_email || hotel_phone ? `
        <div style="background: #f8fafc; border-radius: 8px; padding: 16px 20px; margin-bottom: 24px;">
          <p style="margin: 0 0 8px; color: #334155; font-size: 13px; font-weight: 600;">Contact Us</p>
          ${hotel_email ? `<p style="margin: 0 0 4px; color: #64748b; font-size: 13px;">Email: ${hotel_email}</p>` : ''}
          ${hotel_phone ? `<p style="margin: 0 0 4px; color: #64748b; font-size: 13px;">Phone: ${hotel_phone}</p>` : ''}
          ${hotel_address ? `<p style="margin: 0; color: #64748b; font-size: 13px;">${hotel_address}</p>` : ''}
        </div>` : ''}

        <p style="color: #94a3b8; font-size: 11px; text-align: center;">This is an automated confirmation from ${hotel_name || 'Hotel'}.</p>
      </div>
    `;

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: `${hotel_name || 'Hotel'} <${Deno.env.get('SENDER_EMAIL') || 'onboarding@resend.dev'}>`,
        to: [to_email],
        subject: `Reservation Confirmed — ${reservation_code}`,
        html,
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      return new Response(
        JSON.stringify({ error: data.message || 'Failed to send email' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ success: true, id: data.id }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
