import { withAuth } from "@/app/services/protected";
import supabaseAdmin from "@/app/services/supabase-admin";

export const runtime = "nodejs";

export const GET = withAuth(async (_req: Request, params: { id: string }, _user: any) => {
  try {
    const id = params.id;

    if (!id) {
      return Response.json({ error: "Club ID missing" }, { status: 400 });
    }

    const { data: club, error: clubError } = await supabaseAdmin
      .from("clubs")
      .select("*")
      .eq("id", id)
      .single();

    if (clubError) {
      return Response.json({ error: "Club not found" }, { status: 404 });
    }

    const { data: events } = await supabaseAdmin
      .from("events")
      .select("*")
      .eq("club_id", id)
      .order("event_date", { ascending: true });

    return Response.json({ club, events: events ?? [] });
  } catch (err: any) {
    console.error("❌ Get club error:", err);
    return Response.json(
      { error: err.message || "Internal server error" },
      { status: 500 }
    );
  }
});
