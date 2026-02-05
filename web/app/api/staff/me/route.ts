import { withAuth } from "@/app/services/protected";
import supabaseAdmin from "@/app/services/supabase-admin";

export const GET = withAuth(async (_req: Request, user: any) => {
  try {
    const { data, error } = await supabaseAdmin
      .from("staff")
      .select("*")
      .eq("id", user.id)
      .maybeSingle();

    // If no record found, return a default pending record
    if (error && error.code !== "PGRST116") {
      console.error("❌ Failed to fetch staff:", error);
      return Response.json(
        { error: error.message },
        { status: 500 }
      );
    }

    // If no staff record exists, return default pending status
    if (!data) {
      return Response.json({
        id: user.id,
        status: "pending",
        club_id: null,
        club_name: null,
      });
    }

    return Response.json(data);
  } catch (err: any) {
    console.error("❌ Staff me error:", err);
    return Response.json(
      { error: err.message || "Internal server error" },
      { status: 500 }
    );
  }
});
