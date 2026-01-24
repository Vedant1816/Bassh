import { withAuth } from "@/app/services/protected";
import supabaseAdmin from "@/app/services/supabase-admin";

export const runtime = "nodejs";

export const GET = withAuth(
  async (
    _req: Request,
    params: { id: string },
    _user: any
  ) => {
    try {
      const id = params.id;

      if (!id) {
        return Response.json(
          { error: "Club ID missing" },
          { status: 400 }
        );
      }

      const { data, error } = await supabaseAdmin
        .from("clubs")
        .select("id, club_name")
        .eq("id", id)
        .single();

      if (error || !data) {
        return Response.json(
          { error: "Club not found" },
          { status: 404 }
        );
      }

      return Response.json(data);
    } catch (err: any) {
      console.error("❌ Get club error:", err);
      return Response.json(
        { error: err.message || "Internal server error" },
        { status: 500 }
      );
    }
  }
);
