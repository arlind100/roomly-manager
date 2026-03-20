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
    const [headerB64, payloadB64, sigB64] = token.split(".");
    const payload = JSON.parse(atob(payloadB64.replace(/-/g, "+").replace(/_/g, "/")));
    if (payload.role !== "superadmin" || payload.exp < Math.floor(Date.now() / 1000)) return false;
    const secret = Deno.env.get("SUPERADMIN_JWT_SECRET")!;
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
    const { hotelId, hotelName } = await req.json();
    const supabaseAdmin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });

    // Get hotel to verify name match
    const { data: hotel } = await supabaseAdmin.from("hotels").select("name").eq("id", hotelId).single();
    if (!hotel || hotel.name !== hotelName) {
      return new Response(JSON.stringify({ error: "Hotel name does not match" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Get users to delete
    const { data: roles } = await supabaseAdmin.from("user_roles").select("user_id").eq("hotel_id", hotelId);

    // Delete related data (cascade handles most, but be thorough)
    await supabaseAdmin.from("billing_records").delete().eq("hotel_id", hotelId);
    await supabaseAdmin.from("invoices").delete().eq("hotel_id", hotelId);
    await supabaseAdmin.from("reservations").delete().eq("hotel_id", hotelId);
    await supabaseAdmin.from("rooms").delete().eq("hotel_id", hotelId);
    await supabaseAdmin.from("room_types").delete().eq("hotel_id", hotelId);
    await supabaseAdmin.from("staff").delete().eq("hotel_id", hotelId);
    await supabaseAdmin.from("pricing_overrides").delete().eq("hotel_id", hotelId);
    await supabaseAdmin.from("availability_blocks").delete().eq("hotel_id", hotelId);
    await supabaseAdmin.from("ical_feeds").delete().eq("hotel_id", hotelId);
    await supabaseAdmin.from("import_logs").delete().eq("hotel_id", hotelId);
    await supabaseAdmin.from("user_roles").delete().eq("hotel_id", hotelId);
    await supabaseAdmin.from("hotels").delete().eq("id", hotelId);

    // Delete auth users
    if (roles) {
      for (const role of roles) {
        await supabaseAdmin.auth.admin.deleteUser(role.user_id);
      }
    }

    // Audit log
    await supabaseAdmin.from("superadmin_audit_log").insert({
      action: "hotel_deleted",
      target_hotel_name: hotelName,
      details: { hotelId },
    });

    return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch {
    return new Response(JSON.stringify({ error: "Internal server error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
