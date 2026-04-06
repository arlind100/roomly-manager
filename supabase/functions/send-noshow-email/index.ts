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
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: authHeader } },
    });

    const { to_email, guest_name, reservation_code, check_in, room_type_name, hotel_name, hotel_email } = await req.json();

    const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
    if (!RESEND_API_KEY || !to_email) {
      return new Response(JSON.stringify({ error: 'Missing config or email' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
        <h1 style="color: #1e293b; font-size: 20px;">${hotel_name}</h1>
        <div style="background: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; padding: 24px; margin: 20px 0;">
          <p style="margin: 0 0 12px; color: #991b1b; font-weight: 600;">No-Show Notice</p>
          <p style="margin: 0; color: #64748b; font-size: 14px;">Dear ${guest_name},</p>
          <p style="margin: 12px 0 0; color: #64748b; font-size: 14px;">
            We noticed you did not check in for your reservation <strong>${reservation_code}</strong> scheduled for ${check_in}${room_type_name ? ` (${room_type_name})` : ''}.
          </p>
          <p style="margin: 12px 0 0; color: #64748b; font-size: 14px;">
            Your reservation has been marked as a no-show. If you believe this is an error, please contact us.
          </p>
        </div>
        ${hotel_email ? `<p style="color: #64748b; font-size: 13px;">Contact: ${hotel_email}</p>` : ''}
        <p style="color: #94a3b8; font-size: 11px;">This is an automated notification from ${hotel_name}.</p>
      </div>
    `;

    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: `${hotel_name} <${Deno.env.get('SENDER_EMAIL') || 'onboarding@resend.dev'}>`,
        to: [to_email],
        subject: `No-Show Notice — ${reservation_code}`,
        html,
      }),
    });

    return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (err) {
    return new Response(JSON.stringify({ error: 'Internal server error' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
