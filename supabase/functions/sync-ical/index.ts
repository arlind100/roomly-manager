import { createClient } from "https://esm.sh/@supabase/supabase-js@2.98.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface ICalEvent {
  uid: string;
  dtstart: string;
  dtend: string;
  summary: string;
}

function parseICS(text: string): ICalEvent[] {
  const events: ICalEvent[] = [];
  const blocks = text.split("BEGIN:VEVENT");
  for (let i = 1; i < blocks.length; i++) {
    const block = blocks[i].split("END:VEVENT")[0];
    const uid = extractField(block, "UID");
    const dtstart = extractField(block, "DTSTART");
    const dtend = extractField(block, "DTEND");
    const summary = extractField(block, "SUMMARY");
    if (uid && dtstart && dtend) {
      events.push({
        uid,
        dtstart: parseICalDate(dtstart),
        dtend: parseICalDate(dtend),
        summary: summary || "External Booking",
      });
    }
  }
  return events;
}

function extractField(block: string, field: string): string {
  // Handle properties with parameters like DTSTART;VALUE=DATE:20260315
  const regex = new RegExp(`^${field}[;:](.*)$`, "mi");
  const match = block.match(regex);
  if (!match) return "";
  let value = match[1].trim();
  // If there are parameters, get the value after the last colon
  if (value.includes(":")) {
    value = value.split(":").pop()!.trim();
  }
  // Unfold continuation lines
  return value.replace(/\r?\n[ \t]/g, "");
}

function parseICalDate(dateStr: string): string {
  // Handles YYYYMMDD and YYYYMMDDTHHmmssZ formats → YYYY-MM-DD
  const clean = dateStr.replace(/[^0-9T]/g, "");
  if (clean.length >= 8) {
    return `${clean.slice(0, 4)}-${clean.slice(4, 6)}-${clean.slice(6, 8)}`;
  }
  return dateStr;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Validate auth if provided (manual sync), otherwise allow scheduled calls
    let isAuthenticated = false;
    if (authHeader?.startsWith("Bearer ")) {
      const userClient = createClient(supabaseUrl, anonKey, {
        global: { headers: { Authorization: authHeader } },
      });
      const token = authHeader.replace("Bearer ", "");
      const { data, error } = await userClient.auth.getUser(token);
      if (!error && data?.user) {
        isAuthenticated = true;
      }
    }

    // Use service role for DB operations
    const supabase = createClient(supabaseUrl, serviceKey);

    const body = await req.json().catch(() => ({}));
    const feedId = body.feed_id; // Optional: sync specific feed

    // If a specific feed_id is provided, require authentication
    if (feedId && !isAuthenticated) {
      return new Response(JSON.stringify({ error: "Authentication required for manual sync" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch feeds to sync
    let feedQuery = supabase
      .from("ical_feeds")
      .select("*, room_types(name, available_units)")
      .eq("sync_enabled", true);

    if (feedId) {
      feedQuery = feedQuery.eq("id", feedId);
    }

    const { data: feeds, error: feedError } = await feedQuery;
    if (feedError) throw feedError;
    if (!feeds || feeds.length === 0) {
      return new Response(
        JSON.stringify({ message: "No feeds to sync", synced: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const results: Array<{
      feed_id: string;
      feed_name: string;
      imported: number;
      updated: number;
      skipped: number;
      conflicts: number;
      errors: string[];
    }> = [];

    for (const feed of feeds) {
      const feedResult = {
        feed_id: feed.id,
        feed_name: feed.name,
        imported: 0,
        updated: 0,
        skipped: 0,
        conflicts: 0,
        errors: [] as string[],
      };

      try {
        // Fetch the ICS file
        const icsResponse = await fetch(feed.ical_url);
        if (!icsResponse.ok) {
          feedResult.errors.push(
            `Failed to fetch: ${icsResponse.status} ${icsResponse.statusText}`
          );
          results.push(feedResult);
          continue;
        }

        const icsText = await icsResponse.text();
        const events = parseICS(icsText);

        for (const event of events) {
          try {
            // Check if reservation with this ical_uid already exists
            const { data: existing } = await supabase
              .from("reservations")
              .select("id, check_in, check_out, status")
              .eq("ical_uid", event.uid)
              .eq("hotel_id", feed.hotel_id)
              .maybeSingle();

            if (existing) {
              // Update if dates changed
              if (
                existing.check_in !== event.dtstart ||
                existing.check_out !== event.dtend
              ) {
                await supabase
                  .from("reservations")
                  .update({
                    check_in: event.dtstart,
                    check_out: event.dtend,
                    guest_name: event.summary,
                    updated_at: new Date().toISOString(),
                  })
                  .eq("id", existing.id);
                feedResult.updated++;
              } else {
                feedResult.skipped++;
              }
              continue;
            }

            // Check for conflicts
            const { data: overlapping } = await supabase
              .from("reservations")
              .select("id, guest_name, booking_source")
              .eq("room_type_id", feed.room_type_id)
              .eq("hotel_id", feed.hotel_id)
              .neq("status", "cancelled")
              .lt("check_in", event.dtend)
              .gt("check_out", event.dtstart);

            const maxUnits = feed.room_types?.available_units || 1;
            const hasConflict =
              overlapping && overlapping.length >= maxUnits;

            // Create the reservation
            const { data: newRes, error: insertError } = await supabase
              .from("reservations")
              .insert({
                hotel_id: feed.hotel_id,
                room_type_id: feed.room_type_id,
                guest_name: event.summary,
                check_in: event.dtstart,
                check_out: event.dtend,
                guests_count: 1,
                status: "confirmed",
                booking_source: "ical",
                is_external: true,
                external_platform: feed.name,
                ical_uid: event.uid,
                is_conflict: hasConflict || false,
                conflict_with_reservation_id: hasConflict
                  ? overlapping![0].id
                  : null,
                conflict_reason: hasConflict
                  ? "external_booking_overlap"
                  : null,
              })
              .select("id")
              .single();

            if (insertError) {
              feedResult.errors.push(
                `Event ${event.uid}: ${insertError.message}`
              );
              continue;
            }

            feedResult.imported++;

            // If conflict, also mark the existing reservation
            if (hasConflict && newRes) {
              for (const existing of overlapping!) {
                await supabase
                  .from("reservations")
                  .update({
                    is_conflict: true,
                    conflict_with_reservation_id: newRes.id,
                    conflict_reason: "external_booking_overlap",
                  })
                  .eq("id", existing.id);
              }
              feedResult.conflicts++;
            }
          } catch (eventErr) {
            feedResult.errors.push(
              `Event ${event.uid}: ${String(eventErr)}`
            );
          }
        }

        // Update last_sync
        await supabase
          .from("ical_feeds")
          .update({
            last_sync: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq("id", feed.id);
      } catch (feedErr) {
        feedResult.errors.push(String(feedErr));
      }

      results.push(feedResult);
    }

    return new Response(JSON.stringify({ results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
