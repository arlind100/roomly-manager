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
  const regex = new RegExp(`^${field}[;:](.*)$`, "mi");
  const match = block.match(regex);
  if (!match) return "";
  let value = match[1].trim();
  if (value.includes(":")) {
    value = value.split(":").pop()!.trim();
  }
  return value.replace(/\r?\n[ \t]/g, "");
}

function parseICalDate(dateStr: string): string {
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

    // Validate auth if provided (manual sync)
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

    const supabase = createClient(supabaseUrl, serviceKey);
    const body = await req.json().catch(() => ({}));
    const feedId = body.feed_id;

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
      cancelled: number;
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
        cancelled: 0,
        errors: [] as string[],
      };

      let syncStatus = "success";

      try {
        // Fetch the ICS file with timeout
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 30000); // 30s timeout
        
        let icsResponse: Response;
        try {
          icsResponse = await fetch(feed.ical_url, { signal: controller.signal });
        } catch (fetchErr) {
          clearTimeout(timeoutId);
          const msg = fetchErr instanceof DOMException && fetchErr.name === "AbortError"
            ? "Feed URL timed out after 30 seconds"
            : `Failed to fetch feed: ${String(fetchErr)}`;
          feedResult.errors.push(msg);
          syncStatus = "error";
          await updateFeedSyncStatus(supabase, feed.id, syncStatus, feedResult);
          results.push(feedResult);
          continue;
        }
        clearTimeout(timeoutId);

        if (!icsResponse.ok) {
          feedResult.errors.push(
            `HTTP ${icsResponse.status}: ${icsResponse.statusText}`
          );
          syncStatus = "error";
          await updateFeedSyncStatus(supabase, feed.id, syncStatus, feedResult);
          results.push(feedResult);
          continue;
        }

        const contentType = icsResponse.headers.get("content-type") || "";
        const icsText = await icsResponse.text();

        // Validate it's actually an iCal file
        if (!icsText.includes("BEGIN:VCALENDAR")) {
          feedResult.errors.push("Response is not a valid iCal file");
          syncStatus = "error";
          await updateFeedSyncStatus(supabase, feed.id, syncStatus, feedResult);
          results.push(feedResult);
          continue;
        }

        const events = parseICS(icsText);
        const feedUids = new Set(events.map(e => e.uid));

        // === CANCELLATION DETECTION ===
        // Find reservations imported from this feed that are no longer in the iCal
        const { data: existingFromFeed } = await supabase
          .from("reservations")
          .select("id, ical_uid, status")
          .eq("hotel_id", feed.hotel_id)
          .eq("external_platform", feed.name)
          .eq("booking_source", "ical")
          .in("status", ["confirmed", "checked_in"])
          .not("ical_uid", "is", null);

        if (existingFromFeed) {
          for (const existing of existingFromFeed) {
            if (existing.ical_uid && !feedUids.has(existing.ical_uid)) {
              // This UID was removed from the feed — cancel it
              const { error: cancelErr } = await supabase
                .from("reservations")
                .update({
                  status: "cancelled",
                  notes: `Auto-cancelled: removed from ${feed.name} iCal feed on ${new Date().toISOString().split("T")[0]}`,
                  updated_at: new Date().toISOString(),
                })
                .eq("id", existing.id);

              if (!cancelErr) {
                feedResult.cancelled++;
              } else {
                feedResult.errors.push(`Cancel ${existing.ical_uid}: ${cancelErr.message}`);
              }
            }
          }
        }

        // === IMPORT / UPDATE EVENTS ===
        for (const event of events) {
          try {
            // Validate dates
            const checkIn = new Date(event.dtstart);
            const checkOut = new Date(event.dtend);
            if (isNaN(checkIn.getTime()) || isNaN(checkOut.getTime())) {
              feedResult.errors.push(`Event ${event.uid}: Invalid dates`);
              continue;
            }
            if (checkOut <= checkIn) {
              feedResult.errors.push(`Event ${event.uid}: check_out must be after check_in`);
              continue;
            }
            // Skip very old events (more than 1 year ago)
            const oneYearAgo = new Date();
            oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
            if (checkOut < oneYearAgo) {
              feedResult.skipped++;
              continue;
            }

            // Check if reservation with this ical_uid already exists
            const { data: existing } = await supabase
              .from("reservations")
              .select("id, check_in, check_out, status")
              .eq("ical_uid", event.uid)
              .eq("hotel_id", feed.hotel_id)
              .maybeSingle();

            if (existing) {
              // Skip if cancelled manually (don't resurrect)
              if (existing.status === "cancelled") {
                feedResult.skipped++;
                continue;
              }

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
              for (const ex of overlapping!) {
                await supabase
                  .from("reservations")
                  .update({
                    is_conflict: true,
                    conflict_with_reservation_id: newRes.id,
                    conflict_reason: "external_booking_overlap",
                  })
                  .eq("id", ex.id);
              }
              feedResult.conflicts++;
            }
          } catch (eventErr) {
            feedResult.errors.push(
              `Event ${event.uid}: ${String(eventErr)}`
            );
          }
        }

        if (feedResult.errors.length > 0 && (feedResult.imported > 0 || feedResult.updated > 0)) {
          syncStatus = "partial";
        } else if (feedResult.errors.length > 0) {
          syncStatus = "error";
        }

        // Update feed sync status
        await updateFeedSyncStatus(supabase, feed.id, syncStatus, feedResult);
      } catch (feedErr) {
        feedResult.errors.push(String(feedErr));
        syncStatus = "error";
        await updateFeedSyncStatus(supabase, feed.id, syncStatus, feedResult);
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

async function updateFeedSyncStatus(
  supabase: any,
  feedId: string,
  status: string,
  result: { imported: number; updated: number; cancelled: number; errors: string[] }
) {
  await supabase
    .from("ical_feeds")
    .update({
      last_sync: new Date().toISOString(),
      last_sync_status: status,
      last_sync_errors: result.errors.slice(0, 10), // Cap stored errors
      last_sync_imported: result.imported,
      last_sync_updated: result.updated,
      last_sync_cancelled: result.cancelled,
      updated_at: new Date().toISOString(),
    })
    .eq("id", feedId);
}
