import { withAuth } from "@/app/services/protected";
import supabaseAdmin from "@/app/services/supabase-admin";

export const runtime = "nodejs";

export const GET = withAuth(async (req: Request, _ctx: any, user: any) => {
  console.log("📊 [STAFF] Get status request received");

  try {
    // Fetch staff record
    const { data: staff, error } = await supabaseAdmin
      .from("staff")
      .select("id, club_id, club_name, status, post, created_at, updated_at")
      .eq("id", user.id)
      .single();

    if (error && error.code !== 'PGRST116') {
      // PGRST116 = no rows found
      console.error("❌ [STAFF] Error fetching staff:", error);
      return Response.json(
        { error: "Failed to fetch staff status" },
        { status: 500 }
      );
    }

    // Staff record doesn't exist
    if (!staff) {
      return Response.json({
        staff: null,
        message: "No club association found",
      });
    }

    console.log("✅ [STAFF] Status retrieved:", staff.status);

    return Response.json({
      staff: {
        id: staff.id,
        club_id: staff.club_id,
        club_name: staff.club_name,
        status: staff.status,
        post: staff.post,
        created_at: staff.created_at,
        updated_at: staff.updated_at,
      },
    });

  } catch (err: any) {
    console.error("❌ [STAFF] Get status error:", err);
    return Response.json(
      { error: err.message || "Internal server error" },
      { status: 500 }
    );
  }
});