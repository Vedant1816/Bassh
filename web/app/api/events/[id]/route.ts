import { withAuth } from "@/app/services/protected";
import supabaseAdmin from "@/app/services/supabase-admin";

export const runtime = "nodejs";

export const GET = withAuth(
  async (_req: Request, params: { id: string }, _user: any) => {
    try {
      console.log("🔍 GET /api/events/[id] - Params received:", params);
      const id = params.id;

      console.log("🔍 GET /api/events/[id] - Event ID:", id);

      if (!id) {
        console.error("❌ Event ID missing");
        return Response.json(
          { error: "Event ID missing" },
          { status: 400 }
        );
      }

      /* ---------------- EVENT + CLUB (with phone) ---------------- */

      const { data, error } = await supabaseAdmin
        .from("events")
        .select(`
          id,
          name,
          categories,
          about,
          age_limit,
          terms_and_conditions,
          event_date,
          start_time,
          dj_name,
          dj_image_url,
          banner_image_url,
          club_id,
          max_attendees,
          clubs (
            id,
            club_name,
            address_text,
            latitude,
            longitude,
            guest_count,
            phone_number
          )
        `)
        .eq("id", id)
        .single();

      if (error) {
        console.error("❌ Event fetch error:", {
          code: error.code,
          message: error.message,
          details: error.details,
          hint: error.hint,
        });
        return Response.json(
          { error: "Event not found", details: error.message },
          { status: 404 }
        );
      }

      if (!data) {
        console.error("❌ No event data returned for ID:", id);
        return Response.json(
          { error: "Event not found" },
          { status: 404 }
        );
      }

      /* ---------------- PRICING ---------------- */

      const { data: pricing, error: pricingError } = await supabaseAdmin
        .from("event_ticket_pricing")
        .select("*")
        .eq("event_id", id)
        .order("price", { ascending: true });

      if (pricingError) {
        console.error("❌ Pricing fetch error:", pricingError);
      }

      /* ---------------- BOOKINGS FOR GUEST LIST ---------------- */

      const { data: bookings, error: bookingsError } = await supabaseAdmin
        .from("bookings")
        .select("id, user_id, participants, created_at, booking_status")
        .eq("event_id", id)
        .eq("booking_status", "confirmed")
        .order("created_at", { ascending: false })
        .limit(100);

      if (bookingsError) {
        console.error("❌ Bookings fetch error:", bookingsError);
      }

      console.log("📋 Bookings found:", bookings?.length || 0);

      // Log all bookings with participants
      console.log("────────────────────────────────────────");
      console.log("📋 BOOKINGS WITH PARTICIPANTS:");
      console.log("────────────────────────────────────────");
      (bookings || []).forEach((booking: any, bookingIndex: number) => {
        console.log(`\n📌 Booking ${bookingIndex + 1}:`);
        console.log(`   ID: ${booking.id}`);
        console.log(`   User ID: ${booking.user_id}`);
        console.log(`   Status: ${booking.booking_status}`);
        console.log(`   Created: ${booking.created_at}`);
        console.log(`   Participants:`, JSON.stringify(booking.participants, null, 2));
      });
      console.log("────────────────────────────────────────");

      // Build guest list from participants in each booking
      const guestList: any[] = [];
      let totalGuests = 0;

      (bookings || []).forEach((booking: any) => {
        const participants = booking.participants;

        if (Array.isArray(participants) && participants.length > 0) {
          // participants is an array: [{ name, age, email, gender }, ...]
          participants.forEach((participant: any, index: number) => {
            totalGuests++;
            guestList.push({
              id: `${booking.id}-${index}`,
              booking_id: booking.id,
              user_id: booking.user_id,
              created_at: booking.created_at,
              name: participant.name || "Guest",
              age: participant.age || null,
              gender: participant.gender || null,
              email: participant.email || null,
            });
          });
        } else {
          // Fallback: count as 1 guest
          totalGuests++;
          guestList.push({
            id: booking.id,
            booking_id: booking.id,
            user_id: booking.user_id,
            created_at: booking.created_at,
            name: "Guest",
            age: null,
            gender: null,
            email: null,
          });
        }
      });

      console.log("✅ Total guests calculated:", totalGuests);
      console.log("✅ Guest list entries:", guestList.length);

      // Calculate available tickets
      const maxAttendees = data.max_attendees || 100; // Default to 100 if not set
      const availableTickets = Math.max(0, maxAttendees - totalGuests);

      console.log("✅ Max attendees:", maxAttendees);
      console.log("✅ Available tickets:", availableTickets);

      return Response.json({
        event: {
          id: data.id,
          name: data.name,
          categories: data.categories || [],
          about: data.about,
          age_limit: data.age_limit,
          terms_and_conditions: data.terms_and_conditions,
          event_date: data.event_date,
          start_time: data.start_time,
          dj_name: data.dj_name,
          dj_image_url: data.dj_image_url,
          banner_image_url: data.banner_image_url,
          max_attendees: maxAttendees,
          available_tickets: availableTickets,
        },
        club: {
          ...data.clubs,
          phone_number: data.clubs?.phone_number || null,
        },
        pricing: pricing ?? [],
        guestList: guestList.slice(0, 50),
        totalGuests: totalGuests,
      });
    } catch (err: any) {
      console.error("❌ Get event error:", err);
      return Response.json(
        { error: err.message || "Internal server error" },
        { status: 500 }
      );
    }
  }
);