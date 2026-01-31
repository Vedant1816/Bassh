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

    // Fetch active discounts for the event
    const { data: discounts, error } = await supabaseAdmin
      .from("discounts")
      .select("*")
      .eq("event_id", event_id)
      .eq("is_active", true)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("❌ [BACKEND] Database error:", error.message);
      return Response.json(
        { error: "Failed to fetch discounts", details: error.message },
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