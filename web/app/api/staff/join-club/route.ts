import { withAuth } from "@/app/services/protected";
import supabaseAdmin from "@/app/services/supabase-admin";

export const POST = withAuth(async (req: Request, user: any) => {
  try {
    const body = await req.json().catch(() => ({}));
    const { club_id } = body;

    if (!club_id) {
      return Response.json(
        { error: "club_id is required" },
        { status: 400 }
      );
    }

    // Fetch club_name from clubs table
    const { data: club, error: clubError } = await supabaseAdmin
      .from("clubs")
      .select("club_name")
      .eq("id", club_id)
      .single();

    if (clubError || !club) {
      return Response.json(
        { error: "Club not found" },
        { status: 404 }
      );
    }

    // Update staff table
    const { data, error: updateError } = await supabaseAdmin
      .from("staff")
      .update({
        club_id,
        club_name: club.club_name,
        status: "pending",
      })
      .eq("id", user.id)
      .select()
      .single();

    if (updateError) {
      console.error("❌ Failed to update staff:", updateError);
      return Response.json(
        { error: updateError.message },
        { status: 500 }
      );
    }

    return Response.json({ ok: true, data });
  } catch (err: any) {
    console.error("❌ Join club error:", err);
    return Response.json(
      { error: err.message || "Internal server error" },
      { status: 500 }
    );
  }
});
