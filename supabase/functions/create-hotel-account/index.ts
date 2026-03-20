import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

async function verifySuperadmin(req: Request): Promise<boolean> {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) return false;
  const token = authHeader.replace("Bearer ", "");
  try {
    const [, payloadB64] = token.split(".");
    const payload = JSON.parse(atob(payloadB64.replace(/-/g, "+").replace(/_/g, "/")));
    if (payload.role !== "superadmin" || payload.exp < Math.floor(Date.now() / 1000)) return false;
    // Verify signature
    const secret = Deno.env.get("SUPERADMIN_JWT_SECRET")!;
    const [headerB64, , sigB64] = token.split(".");
    const data = `${headerB64}.${payloadB64}`;
    const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["verify"]);
    const sig = Uint8Array.from(atob(sigB64.replace(/-/g, "+").replace(/_/g, "/")), c => c.charCodeAt(0));
    return await crypto.subtle.verify("HMAC", key, sig, new TextEncoder().encode(data));
  } catch { return false; }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  if (!(await verifySuperadmin(req))) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  try {
    const body = await req.json();
    const { hotelName, city, country, contactEmail, phone, description, websiteUrl, plan, monthlyPrice, subscriptionStatus, trialEndsAt, numberOfRooms, currency, checkInTime, checkOutTime, taxPercentage, cleaningDuration, generatedPassword } = body;

    if (!hotelName || !city || !contactEmail || !generatedPassword) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const supabaseAdmin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });

    // Check email uniqueness
    const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
    const emailExists = existingUsers?.users?.some(u => u.email === contactEmail);
    if (emailExists) {
      return new Response(JSON.stringify({ error: "Email already in use" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Create hotel
    const address = [city, country].filter(Boolean).join(", ");
    const { data: hotel, error: hotelError } = await supabaseAdmin.from("hotels").insert({
      name: hotelName,
      address,
      email: contactEmail,
      phone: phone || null,
      currency: currency || "EUR",
      check_in_time: checkInTime || "14:00",
      check_out_time: checkOutTime || "11:00",
      tax_percentage: taxPercentage ?? 10,
      cleaning_duration_minutes: cleaningDuration || 30,
      subscription_plan: plan || "starter",
      subscription_status: subscriptionStatus || "trial",
      monthly_price: monthlyPrice || 89,
      trial_ends_at: trialEndsAt || null,
      created_by_superadmin: true,
      superadmin_notes: description || null,
    }).select().single();

    if (hotelError) {
      return new Response(JSON.stringify({ error: "Failed to create hotel: " + hotelError.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Create auth user
    const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: contactEmail,
      password: generatedPassword,
      email_confirm: true,
      user_metadata: { full_name: hotelName + " Admin" },
    });

    if (authError) {
      // Cleanup hotel if user creation fails
      await supabaseAdmin.from("hotels").delete().eq("id", hotel.id);
      return new Response(JSON.stringify({ error: "Failed to create user: " + authError.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Assign admin role
    await supabaseAdmin.from("user_roles").insert({
      user_id: authUser.user.id,
      role: "admin",
      hotel_id: hotel.id,
    });

    // Log to audit
    await supabaseAdmin.from("superadmin_audit_log").insert({
      action: "hotel_created",
      target_hotel_id: hotel.id,
      target_hotel_name: hotelName,
      details: { plan, subscriptionStatus, contactEmail, city, country },
    });

    return new Response(JSON.stringify({ hotel_id: hotel.id, user_id: authUser.user.id }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err) {
    return new Response(JSON.stringify({ error: "Internal server error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
