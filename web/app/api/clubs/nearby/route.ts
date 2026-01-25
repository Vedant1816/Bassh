import { withAuth } from "@/app/services/protected";
import supabaseAdmin from "@/app/services/supabase-admin";

export const runtime = "nodejs";

/**
 * GET /api/clubs/nearby?lat=..&lng=..
 */
export const GET = withAuth(async (req: Request) => {
  try {
    const { searchParams } = new URL(req.url);

    const lat = Number(searchParams.get("lat"));
    const lng = Number(searchParams.get("lng"));

    if (!lat || !lng) {
      return Response.json(
        { error: "lat and lng are required" },
        { status: 400 }
      );
    }

    const { data, error } = await supabaseAdmin.rpc("get_nearby_clubs", {
      user_lat: lat,
      user_lng: lng,
    });

    if (error) {
      console.error("❌ get_nearby_clubs error:", error);
      return Response.json(
        { error: error.message },
        { status: 500 }
      );
    }

    return Response.json(data || []);
  } catch (err) {
    console.error("❌ /clubs/nearby error:", err);
    return Response.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
});