import { withAuth } from "@/app/services/protected";
import supabaseAdmin from "@/app/services/supabase-admin";

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
          price
        )
      `)
      .eq("club_id", clubId)
      .order("event_date", { ascending: false })
      .order("start_time", {ascending: false});

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

    return Response.json(data, { status: 200 });

  } catch (err) {
    console.error(err);
    return Response.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
});

