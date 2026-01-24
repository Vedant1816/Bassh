import { withAuth } from "@/app/services/protected";
import supabaseAdmin from "@/app/services/supabase-admin";

export const GET = withAuth(async (_req: Request, user: any) => {
  try {
    const { data, error } = await supabaseAdmin
      .from("staff")
      .select("*")
      .eq("id", user.id)
      .single();

    if (error) {
      console.error("❌ Failed to fetch staff:", error);
      return Response.json(
        { error: error.message },
        { status: 500 }
      );
    }

    if (!data) {
      return Response.json(
        { error: "Staff record not found" },
        { status: 404 }
      );
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
