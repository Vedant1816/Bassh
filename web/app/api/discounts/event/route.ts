import { NextRequest } from "next/server";
import supabaseAdmin from "@/app/services/supabase-admin";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  console.log("🔄 [BACKEND] GET /api/discounts/event - Request received");

  try {
    const { searchParams } = new URL(req.url);
    const event_id = searchParams.get("event_id");

    console.log("🔄 [BACKEND] Event ID:", event_id);

    if (!event_id) {
      console.error("❌ [BACKEND] Missing event_id parameter");
      return Response.json(
        { error: "event_id parameter is required" },
        { status: 400 }
      );
    }

    console.log("🔍 [BACKEND] Fetching discounts for event:", event_id);

    // Step 1: Get all discount_ids from discounts_events junction table
    const { data: discountLinks, error: linksError } = await supabaseAdmin
      .from("discount_events")
      .select("discount_id")
      .eq("event_id", event_id);

    if (linksError) {
      console.error("❌ [BACKEND] Error fetching discount links:", linksError.message);
      return Response.json(
        { error: "Failed to fetch discount links", details: linksError.message },
        { status: 500 }
      );
    }

    console.log(`🔗 [BACKEND] Found ${discountLinks?.length || 0} discount links`);

    // If no discounts linked to this event, return empty array
    if (!discountLinks || discountLinks.length === 0) {
      console.log("ℹ️ [BACKEND] No discounts linked to this event");
      return Response.json({
        success: true,
        discounts: [],
        count: 0,
      });
    }

    // Step 2: Extract discount_ids
    const discountIds = discountLinks.map((link) => link.discount_id);
    console.log("🔍 [BACKEND] Discount IDs to fetch:", discountIds);

    // Step 3: Fetch full discount details from discounts table
    const { data: discounts, error: discountsError } = await supabaseAdmin
      .from("discounts")
      .select("*")
      .in("id", discountIds)
      .eq("is_active", true)
      .order("created_at", { ascending: false });

    if (discountsError) {
      console.error("❌ [BACKEND] Error fetching discounts:", discountsError.message);
      return Response.json(
        { error: "Failed to fetch discounts", details: discountsError.message },
        { status: 500 }
      );
    }

    console.log(`✅ [BACKEND] Found ${discounts?.length || 0} active discounts`);

    return Response.json({
      success: true,
      discounts: discounts || [],
      count: discounts?.length || 0,
    });
  } catch (err: any) {
    console.error("❌ [BACKEND] Error fetching event discounts:", err.message);
    console.error("❌ [BACKEND] Error stack:", err.stack);
    return Response.json(
      { error: err.message || "Failed to fetch discounts" },
      { status: 500 }
    );
  }
}