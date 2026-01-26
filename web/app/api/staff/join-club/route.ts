import { withAuth } from "@/app/services/protected";
import supabaseAdmin from "@/app/services/supabase-admin";

export const runtime = "nodejs";

export const POST = withAuth(async (req: Request, _ctx: any, user: any) => {
  console.log("🔗 [STAFF] Join club request received");

  try {
    const body = await req.json().catch(() => ({}));
    const { club_token } = body;

    if (!club_token) {
      return Response.json(
        { error: "Club token is required" },
        { status: 400 }
      );
    }

    // Normalize token (uppercase, trim)
    const normalizedToken = club_token.toUpperCase().trim();

    console.log("🔍 [STAFF] Looking up club with token:", normalizedToken);

    // Fetch club by token
    const { data: club, error: clubError } = await supabaseAdmin
      .from("clubs")
      .select("id, club_name, address_text")
      .eq("club_token", normalizedToken)
      .single();

    if (clubError || !club) {
      console.error("❌ [STAFF] Club not found:", clubError);
      return Response.json(
        { error: "Invalid club token" },
        { status: 404 }
      );
    }

    console.log("✅ [STAFF] Club found:", club.club_name);

    // Check if staff record exists
    const { data: existingStaff, error: checkError } = await supabaseAdmin
      .from("staff")
      .select("id, status, club_id, post")
      .eq("id", user.id)
      .single();

    if (checkError && checkError.code !== 'PGRST116') {
      // PGRST116 = no rows found, which is fine
      console.error("❌ [STAFF] Error checking existing staff:", checkError);
      return Response.json(
        { error: "Failed to check staff status" },
        { status: 500 }
      );
    }

    // If staff already has a club
    if (existingStaff && existingStaff.club_id) {
      // Check if it's the same club
      if (existingStaff.club_id === club.id) {
        return Response.json({
          ok: true,
          message: "You are already associated with this club",
          status: existingStaff.status,
          data: {
            club_id: club.id,
            club_name: club.club_name,
            status: existingStaff.status,
            post: existingStaff.post,
          },
        });
      }

      // Staff trying to join a different club
      return Response.json(
        { 
          error: "You are already associated with another club. Please contact support to change clubs.",
        },
        { status: 400 }
      );
    }

    // Prepare upsert data
    const upsertData: any = {
      id: user.id,
      club_id: club.id,
      club_name: club.club_name,
      status: "pending",
      post: "staff", // Default post value - adjust as needed
    };

    // If updating existing staff, preserve their post if they have one
    if (existingStaff && existingStaff.post) {
      upsertData.post = existingStaff.post;
    }

    // Update or insert staff record
    const { data, error: upsertError } = await supabaseAdmin
      .from("staff")
      .upsert(upsertData, {
        onConflict: 'id'
      })
      .select()
      .single();

    if (upsertError) {
      console.error("❌ [STAFF] Failed to update staff:", upsertError);
      return Response.json(
        { error: "Failed to join club: " + upsertError.message },
        { status: 500 }
      );
    }

    console.log("✅ [STAFF] Staff joined club successfully");

    return Response.json({
      ok: true,
      message: "Successfully joined club. Waiting for approval.",
      data: {
        club_id: club.id,
        club_name: club.club_name,
        club_address: club.address_text,
        status: "pending",
        post: data.post,
      },
    });

  } catch (err: any) {
    console.error("❌ [STAFF] Join club error:", err);
    return Response.json(
      { error: err.message || "Internal server error" },
      { status: 500 }
    );
  }
});