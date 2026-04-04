import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

function escapeICalText(text: string): string {
  return text
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\n/g, "\\n");
}

function formatDateIcal(dateStr: string): string {
  return dateStr.replace(/-/g, "");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const pathParts = url.pathname.split("/").filter(Boolean);
    const token =
      pathParts[pathParts.length - 1] === "ical-export"
        ? url.searchParams.get("token")
        : pathParts[pathParts.length - 1];

    if (!token) {
      return new Response("Missing token", { status: 400 });
    }

    // Optional room_type_id filter for per-listing OTA feeds
    const roomTypeId = url.searchParams.get("room_type_id");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Look up hotel by ical_token
    const { data: hotel, error: hotelError } = await supabase
      .from("hotels")
      .select("id, name")
      .eq("ical_token", token)
      .single();

    if (hotelError || !hotel) {
      return new Response("Not found", { status: 404 });
    }

    // Build query — future-only, exclude completed/cancelled
    const today = new Date().toISOString().split("T")[0];
    let query = supabase
      .from("reservations")
      .select("id, check_in, check_out, guest_name, reservation_code, room_id, rooms(room_number), room_types(name), room_type_id")
      .eq("hotel_id", hotel.id)
      .in("status", ["confirmed", "checked_in"])
      .gt("check_out", today)  // Future-only: exclude past stays
      .order("check_in", { ascending: true });

    // Per-room-type filtering for OTA listings
    if (roomTypeId) {
      query = query.eq("room_type_id", roomTypeId);
    }

    const { data: reservations, error: resError } = await query;

    if (resError) {
      return new Response("Error fetching reservations", { status: 500 });
    }

    const now = new Date();
    const dtstamp =
      now.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");

    // Build calendar name based on filter
    let calName = `${escapeICalText(hotel.name)} - Reservations`;
    if (roomTypeId) {
      const rtName = reservations?.[0]
        ? (reservations[0] as any).room_types?.name
        : null;
      if (rtName) {
        calName = `${escapeICalText(hotel.name)} - ${escapeICalText(rtName)}`;
      }
    }

    const ical: string[] = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//Roomly//Hotel PMS//EN",
      "CALSCALE:GREGORIAN",
      "METHOD:PUBLISH",
      `X-WR-CALNAME:${calName}`,
      "X-WR-TIMEZONE:UTC",
      // Tell OTAs to refresh every 15 minutes
      "REFRESH-INTERVAL;VALUE=DURATION:PT15M",
      "X-PUBLISHED-TTL:PT15M",
    ];

    for (const res of reservations || []) {
      const roomNumber = (res as any).rooms?.room_number || "Unassigned";
      const roomTypeName = (res as any).room_types?.name || "";
      const summary = `Booked - Room ${roomNumber}`;
      const description = `Ref: ${res.reservation_code}\\nGuest: ${escapeICalText(res.guest_name)}${roomTypeName ? `\\nType: ${escapeICalText(roomTypeName)}` : ""}`;

      ical.push(
        "BEGIN:VEVENT",
        `UID:${res.id}@roomly`,
        `DTSTAMP:${dtstamp}`,
        `DTSTART;VALUE=DATE:${formatDateIcal(res.check_in)}`,
        `DTEND;VALUE=DATE:${formatDateIcal(res.check_out)}`,
        `SUMMARY:${escapeICalText(summary)}`,
        `DESCRIPTION:${description}`,
        "STATUS:CONFIRMED",
        "TRANSP:OPAQUE",
        "END:VEVENT"
      );
    }

    ical.push("END:VCALENDAR");

    return new Response(ical.join("\r\n"), {
      headers: {
        ...corsHeaders,
        "Content-Type": "text/calendar; charset=utf-8",
        "Content-Disposition": 'attachment; filename="calendar.ics"',
        "Cache-Control": "no-cache, no-store, must-revalidate",
        "Pragma": "no-cache",
        "Expires": "0",
      },
    });
  } catch (e) {
    return new Response("Internal error", { status: 500 });
  }
});
