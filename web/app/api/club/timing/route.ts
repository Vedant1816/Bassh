import { withAuth } from "@/app/services/protected";
import supabaseAdmin from "@/app/services/supabase-admin";

export const POST = withAuth(
  async (req: Request, user: { id: string }) => {
    try {
      const body = await req.json();

      const { opening_hours, notes } = body;

      if (!opening_hours || !Array.isArray(opening_hours)) {
        return Response.json(
          { error: "Invalid or missing opening_hours" },
          { status: 400 }
        );
      }

      const { error } = await supabaseAdmin
        .from("clubs")
        .update({
          opening_hours,
          notes: notes ?? null
        })
        .eq("id", user.id);

      if (error) {
        console.error("Supabase error:", error);
        return Response.json(
          { error: "Failed to update club information" },
          { status: 500 }
        );
      }

      return Response.json(
        { success: true },
        { status: 200 }
      );
    } catch (err) {
      console.error("API error:", err);
      return Response.json(
        { error: "Something went wrong" },
        { status: 500 }
      );
    }
  }
);

export const GET = withAuth(
  async (req: Request, user: { id: string }) => {
    try {
      const { data, error } = await supabaseAdmin
        .from("clubs")
        .select("opening_hours, notes")
        .eq("id", user.id)
        .single();

      if (error) {
        console.error("Supabase GET error:", error);
        return Response.json(
          { error: "Failed to fetch club information" },
          { status: 500 }
        );
      }

      return Response.json(
        {
          opening_hours: data.opening_hours ?? [],
          notes: data.notes ?? ""
        },
        { status: 200 }
      );
    } catch (err) {
      console.error("API GET error:", err);
      return Response.json(
        { error: "Something went wrong" },
        { status: 500 }
      );
    }
  }
);
