import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
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

    const body = await req.json();
    const { bookmark_type, event_id, club_id } = body;

    if (
      (bookmark_type === "event" && !event_id) ||
      (bookmark_type === "club" && !club_id)
    ) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }

    const { data: existing } = await supabase
      .from("bookmarks")
      .select("id")
      .eq("user_id", user.id)
      .eq("bookmark_type", bookmark_type)
      .eq(bookmark_type === "event" ? "event_id" : "club_id",
          bookmark_type === "event" ? event_id : club_id)
      .maybeSingle();

    if (existing) {
      return NextResponse.json({ success: true });
    }

    const { error } = await supabase.from("bookmarks").insert({
      user_id: user.id,
      bookmark_type,
      event_id: bookmark_type === "event" ? event_id : null,
      club_id: bookmark_type === "club" ? club_id : null,
    });

    if (error) throw error;

    return NextResponse.json({ success: true }, { status: 201 });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
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

    const body = await req.json();
    const { bookmark_type, event_id, club_id } = body;

    const query = supabase
      .from("bookmarks")
      .delete()
      .eq("user_id", user.id)
      .eq("bookmark_type", bookmark_type);

    bookmark_type === "event"
      ? query.eq("event_id", event_id)
      : query.eq("club_id", club_id);

    const { error } = await query;
    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}