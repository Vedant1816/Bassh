import supabaseAdmin from "@/app/services/supabase-admin";
import { withAuth } from "@/app/services/protected";

export const GET = withAuth(async (req: Request, user: { id: string }) => {
  try {
    const clubId = user.id;

    // ---- Today (date-only, timezone safe for DATE column) ----
    const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD

    const { data, error } = await supabaseAdmin
      .from("events")
      .select("id, name, dj_name, event_date, start_time")
      .eq("club_id", clubId)
      .gte("event_date", today)
      .order("event_date", { ascending: true })
      .order("start_time", { ascending: true });

    if (error) throw error;

    return Response.json({
      totalUpcomingEvents: data.length,
      topEvents: data.slice(0, 3),
    });
  } catch (err) {
    console.error(err);
    return new Response("Failed to fetch upcoming events", { status: 500 });
  }
});
