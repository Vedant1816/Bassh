import { NextRequest } from "next/server";
import supabaseAdmin from "@/app/services/supabase-admin";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  console.log("📋 [EVENTS] Get all events request");

  try {
    // Fetch all events with club details
    const { data: events, error, count } = await supabaseAdmin
      .from("events")
      .select(`
        id,
        name,
        club_id,
        event_date,
        start_time,
        banner_image_url,
        dj_name,
        dj_instagram,
        about,
        age_limit,
        max_attendees,
        categories,
        created_at,
        clubs!events_club_id_fkey (
          club_name,
          address_text
        )
      `, { count: 'exact' })
      .order("event_date", { ascending: true })
      .order("start_time", { ascending: true });

    if (error) {
      console.error("❌ [EVENTS] Failed to fetch events:", error);
      console.error("❌ [EVENTS] Error details:", error.message);
      return Response.json(
        { error: "Failed to fetch events", details: error.message },
        { status: 500 }
      );
    }

    console.log(`✅ [EVENTS] Fetched ${events?.length || 0} events (total: ${count})`);
    console.log("✅ [EVENTS] Events:", events);

    // Optional: Filter out past events
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const allEvents = events || [];
    
    // Return all events (including past ones for now)
    // If you want only upcoming events, uncomment below:
    /*
    const upcomingEvents = allEvents.filter((event) => {
      const eventDate = new Date(event.event_date);
      eventDate.setHours(0, 0, 0, 0);
      return eventDate >= today;
    });
    */

    return Response.json({
      events: allEvents,
      total: allEvents.length,
    });

  } catch (err: any) {
    console.error("❌ [EVENTS] Get events error:", err);
    console.error("❌ [EVENTS] Error stack:", err.stack);
    return Response.json(
      { error: err.message || "Internal server error" },
      { status: 500 }
    );
  }
}