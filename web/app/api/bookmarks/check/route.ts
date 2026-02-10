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
        const bookmark_type = searchParams.get("bookmark_type");
        const event_id = searchParams.get("event_id");
        const club_id = searchParams.get("club_id");

        if (!bookmark_type) {
            return NextResponse.json({ error: "bookmark_type is required" }, { status: 400 });
        }

        if (
            (bookmark_type === "event" && !event_id) ||
            (bookmark_type === "club" && !club_id)
        ) {
            return NextResponse.json({ error: "Invalid parameters" }, { status: 400 });
        }

        // Build the query to check if bookmark exists
        let query = supabase
            .from("bookmarks")
            .select("id")
            .eq("user_id", user.id)
            .eq("bookmark_type", bookmark_type);

        if (bookmark_type === "event") {
            query = query.eq("event_id", event_id);
        } else {
            query = query.eq("club_id", club_id);
        }

        const { data: existing, error } = await query.maybeSingle();

        if (error) {
            console.error("Error checking bookmark:", error);
            return NextResponse.json({ error: "Server error" }, { status: 500 });
        }

        return NextResponse.json({ bookmarked: !!existing });
    } catch (err) {
        console.error(err);
        return NextResponse.json({ error: "Server error" }, { status: 500 });
    }
}
