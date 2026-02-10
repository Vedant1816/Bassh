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
        .select("id, event_id, label, stag_price, couple_price, created_at")
        .eq("event_id", id)
        .order("stag_price", { ascending: true, nullsFirst: false });

      if (pricingError) {
        console.error("❌ Pricing fetch error:", pricingError);
      }

      /* ---------------- GUEST LIST (from guests table) ---------------- */
      // Only fetch approved guests for the public list
      const { data: approvedGuests, error: approvedError } = await supabaseAdmin
        .from("guests")
        .select(`
          id,
          user_id,
          created_at,
          status,
          bookings (
            participants
          )
        `)
        .eq("event_id", id)
        .eq("status", "approved")
        .order("created_at", { ascending: false })
        .limit(100);

      if (approvedError) {
        console.error("❌ Approved guests fetch error:", approvedError);
      }

      const guestList: any[] = [];
      (approvedGuests || []).forEach((g: any) => {
        const participant = g.bookings?.participants?.[0] || {};
        guestList.push({
          id: g.id,
          user_id: g.user_id,
          created_at: g.created_at,
          name: participant.name || "Guest",
          age: participant.age || null,
          gender: participant.gender || null,
          email: participant.email || null,
        });
      });

      // Fetch count of all applications or just approved? 
      // User said "approved only approved one can acces guest list"
      // Let's get total approved count for the badge/display
      const { count: totalApproved, error: countError } = await supabaseAdmin
        .from("guests")
        .select("*", { count: "exact", head: true })
        .eq("event_id", id)
        .eq("status", "approved");

      if (countError) console.error("❌ Count error:", countError);

      const totalGuests = totalApproved || 0;


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
          ...(Array.isArray(data.clubs) ? (data.clubs[0] as any) : (data.clubs as any)),
          phone_number: (Array.isArray(data.clubs) ? (data.clubs[0] as any)?.phone_number : (data.clubs as any)?.phone_number) || null,
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