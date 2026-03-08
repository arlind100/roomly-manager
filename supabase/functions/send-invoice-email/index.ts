const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { to_email, guest_name, invoice_number, amount, currency, hotel_name, pdf_base64 } = await req.json();

    const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
    if (!RESEND_API_KEY) {
      return new Response(JSON.stringify({ error: 'RESEND_API_KEY not configured' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const sym = currency === 'EUR' ? '€' : '$';

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: `${hotel_name} <onboarding@resend.dev>`,
        to: [to_email],
        subject: `Invoice ${invoice_number} — ${hotel_name}`,
        html: `
          <div style="font-family: 'Helvetica Neue', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
            <h1 style="color: #1e293b; font-size: 24px; margin-bottom: 8px;">${hotel_name}</h1>
            <p style="color: #64748b; font-size: 14px; margin-bottom: 30px;">Invoice ${invoice_number}</p>
            <div style="background: #f8fafc; border-radius: 8px; padding: 24px; margin-bottom: 24px;">
              <p style="margin: 0 0 8px; color: #334155;">Dear ${guest_name},</p>
              <p style="margin: 0; color: #64748b; font-size: 14px;">Please find your invoice attached as a PDF document.</p>
            </div>
            <div style="background: #1e293b; color: white; border-radius: 8px; padding: 20px; text-align: center; margin-bottom: 24px;">
              <p style="margin: 0 0 4px; font-size: 14px; opacity: 0.8;">Total Amount</p>
              <p style="margin: 0; font-size: 28px; font-weight: bold;">${sym}${Number(amount).toFixed(2)}</p>
            </div>
            <p style="color: #94a3b8; font-size: 12px; text-align: center;">This is an automated email from ${hotel_name}.</p>
          </div>
        `,
        attachments: pdf_base64 ? [{
          filename: `${invoice_number}.pdf`,
          content: pdf_base64,
          content_type: 'application/pdf',
        }] : undefined,
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      return new Response(JSON.stringify({ error: data.message || 'Failed to send email' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    return new Response(JSON.stringify({ success: true, id: data.id }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
