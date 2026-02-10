import supabaseAdmin from "@/app/services/supabase-admin";
import { withAuth } from "@/app/services/protected";

export const GET = withAuth(async (req: Request, user: any) => {
  try {
    const { searchParams } = new URL(req.url);
    const limitParam = searchParams.get("limit");
    const search = searchParams.get("search");
    const clubId = user.id;

    let query = supabaseAdmin
      .from("events")
      .select(`
        *,
        event_ticket_pricing (
          id,
          label,
          stag_price,
          couple_price
        )
      `)
      .eq("club_id", clubId)
      .order("event_date", { ascending: false })
      .order("start_time", { ascending: false });

    if (search && search.trim() !== "") {
      query = query.ilike("name", `%${search.trim()}%`);
    }

    if (limitParam) {
      query = query.limit(Number(limitParam));
    }

    const { data, error } = await query;

    if (error) {
      return Response.json({ error: error.message }, { status: 500 });
    }

    const now = new Date();

    const sorted = [...data].sort((a, b) => {
      const aDate = new Date(`${a.event_date}T${a.start_time}`);
      const bDate = new Date(`${b.event_date}T${b.start_time}`);

      const aIsFuture = aDate >= now;
      const bIsFuture = bDate >= now;

      // Future events first
      if (aIsFuture && !bIsFuture) return -1;
      if (!aIsFuture && bIsFuture) return 1;

      // Both future → closest first
      if (aIsFuture && bIsFuture) {
        return aDate.getTime() - bDate.getTime();
      }

      // Both past → most recent first
      return bDate.getTime() - aDate.getTime();
    });

    return Response.json(sorted, { status: 200 });

  } catch (err) {
    console.error(err);
    return Response.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
});
