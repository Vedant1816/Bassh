import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SERVICE_ROLE_KEY!
);

export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user } } = await supabase.auth.getUser(token);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const bookmarkType = searchParams.get("bookmark_type") ?? "all";
    const limit = Math.min(Number(searchParams.get("limit") ?? 50), 100);
    const offset = Number(searchParams.get("offset") ?? 0);
    const ascending = searchParams.get("sort") === "oldest";

    let baseQuery = supabase
      .from("bookmarks")
      .select(
        `
        id,
        bookmark_type,
        created_at,
        events:event_id (
          id,
          name,
          event_name,
          event_date,
          start_time,
          end_time,
          banner_image_url,
          clubs:club_id (
            id,
            club_name,
            address_text
          )
        ),
        clubs:club_id (
          id,
          club_name,
          address_text,
          banner_image_url,
          latitude,
          longitude,
          rating
        )
      `,
        { count: "exact" }
      )
      .eq("user_id", user.id)
      .order("created_at", { ascending })
      .range(offset, offset + limit - 1);

    if (bookmarkType !== "all") {
      baseQuery = baseQuery.eq("bookmark_type", bookmarkType);
    }

    const { data, count, error } = await baseQuery;
    if (error) throw error;

    const bookmarks = (data ?? []).map((b: any) => ({
      id: b.id,
      bookmark_type: b.bookmark_type,
      created_at: b.created_at,
      event: b.events
        ? {
            id: b.events.id,
            name: b.events.name || b.events.event_name,
            event_date: b.events.event_date,
            start_time: b.events.start_time,
            end_time: b.events.end_time,
            banner_image_url: b.events.banner_image_url,
            club: b.events.clubs,
          }
        : null,
      club: b.clubs ?? null,
    }));

    return NextResponse.json({
      success: true,
      bookmarks,
      count: bookmarks.length,
      total: count ?? 0,
      has_more: offset + limit < (count ?? 0),
    });
  } catch (err: any) {
    console.error(err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}