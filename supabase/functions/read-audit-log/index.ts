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
    const url = new URL(req.url);
    const page = parseInt(url.searchParams.get("page") || "0");
    const pageSize = parseInt(url.searchParams.get("pageSize") || "50");
    const actionFilter = url.searchParams.get("action") || null;
    const hotelId = url.searchParams.get("hotelId") || null;
    const limit = url.searchParams.get("limit") || null;

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false } }
    );

    let query = supabaseAdmin
      .from("superadmin_audit_log")
      .select("*", { count: "exact" })
      .order("performed_at", { ascending: false });

    if (actionFilter) query = query.eq("action", actionFilter);
    if (hotelId) query = query.eq("target_hotel_id", hotelId);

    if (limit) {
      query = query.limit(parseInt(limit));
    } else {
      const from = page * pageSize;
      query = query.range(from, from + pageSize - 1);
    }

    const { data, count, error } = await query;
    if (error) throw error;

    return new Response(JSON.stringify({ data: data || [], total: count || 0 }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
