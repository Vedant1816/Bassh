import { NextRequest } from "next/server";
import supabaseAdmin from "@/app/services/supabase-admin";
import { withAuth } from "@/app/services/protected";

export const POST = withAuth(async (req:Request, user:any) => {
  try {
    const body = await req.json();

    const {
      name,
      dj_name,
      dj_instagram,
      event_date,
      start_time,
      max_attendees,
      pricing, 
    } = body;

    /*  Basic validation */
    if (!name || !event_date || !start_time) {
      return Response.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    /* Insert event */
    const { data: event, error: eventError } =
      await supabaseAdmin
        .from("events")
        .insert({
          club_id: user.id, 
          name,
          dj_name,
          dj_instagram,
          event_date,
          start_time,
          max_attendees,
        })
        .select()
        .single();

    if (eventError) {
        if (eventError.code === "23505") {
    return Response.json(
      {
        error: "You already have an event with this name. Please choose a different name.",
      },
      { status: 409 }
    );
  }
      return Response.json(
        { error: eventError.message },
        { status: 400 }
      );
    }

    /* Insert ticket pricing*/
    if (Array.isArray(pricing) && pricing.length > 0) {
      const pricingRows = pricing.map((tier: any) => ({
        event_id: event.id,
        label: tier.label,
        price: tier.price,
      }));

      const { error: pricingError } =
        await supabaseAdmin
          .from("event_ticket_pricing")
          .insert(pricingRows);

      if (pricingError) {
        return Response.json(
          { error: pricingError.message },
          { status: 400 }
        );
      }
    }

    return Response.json(
      { event },
      { status: 201 }
    );

  } catch (err) {
    console.error("CREATE EVENT ERROR:", err);
    return Response.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
});
export const runtime = "nodejs";

/** Haversine distance in km between two lat/lng points */
function distanceKm(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export async function GET(req: NextRequest) {
  console.log("📋 [EVENTS] Get all events request");

  try {
    const { searchParams } = new URL(req.url);
    const lat = searchParams.get("lat") ? Number(searchParams.get("lat")) : null;
    const lng = searchParams.get("lng") ? Number(searchParams.get("lng")) : null;
    const radiusKm = searchParams.get("radius_km") ? Number(searchParams.get("radius_km")) : 30;

    // Fetch all events with club details including lat/lng for radius filter
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
          address_text,
          latitude,
          longitude
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

    let allEvents = events || [];

    // Filter by radius when lat/lng provided (default 30 km)
    if (lat != null && lng != null && !Number.isNaN(lat) && !Number.isNaN(lng)) {
      allEvents = allEvents.filter((event: any) => {
        const club = event.clubs;
        if (!club || club.latitude == null || club.longitude == null) return false;
        const d = distanceKm(lat, lng, club.latitude, club.longitude);
        return d <= radiusKm;
      });
      console.log(`✅ [EVENTS] Filtered to ${allEvents.length} events within ${radiusKm} km`);
    } else {
      console.log(`✅ [EVENTS] Fetched ${allEvents.length} events (no lat/lng, no radius filter)`);
    }

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