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

      /* ---------------- EVENT + CLUB ---------------- */

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
          clubs (
            id,
            club_name,
            address_text,
            latitude,
            longitude,
            guest_count
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

      console.log("✅ Event fetched successfully:", data.id);

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
        },
        club: data.clubs,
        pricing: pricing ?? [],
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