import { NextRequest } from "next/server";
import supabaseAdmin from "@/app/services/supabase-admin";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  console.log("🔄 [BACKEND] GET /api/discounts/club - Request received");

  try {
    const { searchParams } = new URL(req.url);
    const club_id = searchParams.get("club_id");

    console.log("🔄 [BACKEND] Club ID:", club_id);

    if (!club_id) {
      console.error("❌ [BACKEND] Missing club_id parameter");
      return Response.json(
        { error: "club_id parameter is required" },
        { status: 400 }
      );
    }

    console.log("🔍 [BACKEND] Fetching discounts for club:", club_id);

    // Fetch active discounts for the club
    const { data: discounts, error } = await supabaseAdmin
      .from("discounts")
      .select("*")
      .eq("club_id", club_id)
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
    console.error("❌ [BACKEND] Error fetching club discounts:", err.message);
    console.error("❌ [BACKEND] Error stack:", err.stack);
    return Response.json(
      { error: err.message || "Failed to fetch discounts" },
      { status: 500 }
    );
  }
}