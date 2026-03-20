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
    const { hotelId, reason } = await req.json();
    const supabaseAdmin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });

    // Get hotel name
    const { data: hotel } = await supabaseAdmin.from("hotels").select("name").eq("id", hotelId).single();

    // Update status
    await supabaseAdmin.from("hotels").update({ subscription_status: "suspended" }).eq("id", hotelId);

    // Sign out all hotel users
    const { data: roles } = await supabaseAdmin.from("user_roles").select("user_id").eq("hotel_id", hotelId);
    if (roles) {
      for (const role of roles) {
        await supabaseAdmin.auth.admin.signOut(role.user_id, "global");
      }
    }

    // Audit log
    await supabaseAdmin.from("superadmin_audit_log").insert({
      action: "hotel_suspended",
      target_hotel_id: hotelId,
      target_hotel_name: hotel?.name || "Unknown",
      details: { reason },
    });

    return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err) {
    return new Response(JSON.stringify({ error: "Internal server error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
