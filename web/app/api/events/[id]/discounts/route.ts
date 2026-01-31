import { NextRequest } from "next/server";
import supabaseAdmin from "@/app/services/supabase-admin";

export const runtime = "nodejs";

export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  try {
    const { id: eventId } = await ctx.params;
    if (!eventId) {
      return Response.json({ error: "Event ID missing" }, { status: 400 });
    }
    console.log("🎟️ [DISCOUNTS] Fetch discounts for event:", eventId);

    // Get event details to determine day of week
    const { data: event, error: eventError } = await supabaseAdmin
      .from("events")
      .select("event_date, name")
      .eq("id", eventId)
      .single();

    if (eventError || !event) {
      return Response.json({ error: "Event not found" }, { status: 404 });
    }

    // Calculate day of week (0 = Sunday, 1 = Monday, ..., 6 = Saturday)
    // Convert to format: 1=Mon, 2=Tue, 3=Wed, 4=Thu, 5=Fri, 6=Sat, 7=Sun
    const eventDate = new Date(event.event_date);
    const dayOfWeek = eventDate.getDay(); // 0-6 (Sun-Sat)
    const eventDayNumber = dayOfWeek === 0 ? 7 : dayOfWeek;

    console.log("📅 [DISCOUNTS] Event day of week:", eventDayNumber);

    // Fetch active discounts for this event
    const { data: discounts, error: discountsError } = await supabaseAdmin
      .from("discounts")
      .select("*")
      .eq("event_id", eventId)
      .eq("is_active", true)
      .lte("start_date", event.event_date)
      .gte("end_date", event.event_date);

    if (discountsError) {
      console.error("❌ [DISCOUNTS] Error fetching discounts:", discountsError);
      return Response.json(
        { error: "Failed to fetch discounts" },
        { status: 500 }
      );
    }

    // Filter discounts by applicable days
    const applicableDiscounts = (discounts || []).filter((discount) => {
      // If applicable_days is null or empty, discount applies to all days
      if (!discount.applicable_days || discount.applicable_days.length === 0) {
        return true;
      }

      // Check if event day is in applicable_days array
      return discount.applicable_days.includes(eventDayNumber);
    });

    console.log(`✅ [DISCOUNTS] Found ${applicableDiscounts.length} applicable discounts`);

    return Response.json({
      event_day: eventDayNumber,
      discounts: applicableDiscounts,
    });
  } catch (err: any) {
    console.error("❌ [DISCOUNTS] Error:", err);
    return Response.json(
      { error: err.message || "Internal server error" },
      { status: 500 }
    );
  }
}