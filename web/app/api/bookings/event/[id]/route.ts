import { withAuth } from "@/app/services/protected";
import supabaseAdmin from "@/app/services/supabase-admin";

export const runtime = "nodejs";

/**
 * GET /api/bookings/event/[id]
 * Returns event basic info + ticket pricing
 */
export const GET = withAuth(
  async (_req: Request, params: { id: string }, _user: any) => {
    try {
      console.log("🔍 GET /api/bookings/event/[id] - Params received:", params);
      const eventId = params.id;

      console.log("🔍 GET /api/bookings/event/[id] - Event ID:", eventId);

      if (!eventId) {
        console.error("❌ Event ID missing");
        return Response.json(
          { error: "Event ID missing" },
          { status: 400 }
        );
      }

      /* -------- EVENT -------- */
      const { data: event, error: eventError } = await supabaseAdmin
        .from("events")
        .select("id, name, event_date, start_time, max_attendees")
        .eq("id", eventId)
        .single();

      if (eventError) {
        console.error("❌ Event fetch error:", {
          code: eventError.code,
          message: eventError.message,
          details: eventError.details,
          hint: eventError.hint,
        });
        return Response.json(
          { error: "Event not found", details: eventError.message },
          { status: 404 }
        );
      }

      if (!event) {
        console.error("❌ No event data returned for ID:", eventId);
        return Response.json(
          { error: "Event not found" },
          { status: 404 }
        );
      }

      console.log("✅ Event fetched:", event.id);

      /* -------- PRICING -------- */
      const { data: pricing, error: pricingError } = await supabaseAdmin
        .from("event_ticket_pricing")
        .select("id, label, price, stag_price, couple_price")
        .eq("event_id", eventId)
        .order("price", { ascending: true });

      if (pricingError) {
        console.error("❌ Pricing fetch error:", {
          code: pricingError.code,
          message: pricingError.message,
          details: pricingError.details,
        });
        return Response.json(
          { error: pricingError.message },
          { status: 500 }
        );
      }

      console.log("✅ Pricing fetched:", pricing?.length || 0, "tiers");

      // Get booked count for availability (using booking_status)
      const { count: bookedCount } = await supabaseAdmin
        .from("bookings")
        .select("*", { count: "exact", head: true })
        .eq("event_id", eventId)
        .eq("booking_status", "confirmed");

      const availableTickets = (event.max_attendees || 999999) - (bookedCount || 0);

      return Response.json({
        event: {
          ...event,
          available_tickets: availableTickets,
          booked_count: bookedCount || 0,
        },
        pricing: pricing ?? [],
      });
    } catch (err: any) {
      console.error("❌ Booking event fetch error:", err);
      console.error("❌ Error stack:", err.stack);
      return Response.json(
        { error: err.message || "Internal server error" },
        { status: 500 }
      );
    }
  }
);