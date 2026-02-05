import { redis } from "@/lib/redis";
import supabaseAdmin from "@/app/services/supabase-admin";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q")?.toLowerCase().trim();

  console.log("🔍 [SEARCH] GET /api/search", { q });

  if (!q || q.length < 2) {
    console.log("🔍 [SEARCH] Query too short or empty, returning []");
    return Response.json({ results: [] });
  }

  const results: any[] = [];
  let clubIds: string[] = [];
  let eventIds: string[] = [];

  /* ---------- Try Redis first (with 2s timeout) ---------- */
  if (redis) {
    try {
      const redisPromise = Promise.all([
        redis.smembers(`search:club:${q}`),
        redis.smembers(`search:event:${q}`),
      ]);
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("Redis timeout")), 2000)
      );
      [clubIds, eventIds] = await Promise.race([redisPromise, timeoutPromise]);
      console.log("🔍 [SEARCH] Redis lookup", { clubIds: clubIds.length, eventIds: eventIds.length });
    } catch (err: any) {
      console.warn("🔍 [SEARCH] Redis failed, using Supabase fallback:", err?.message);
    }
  } else {
    console.log("🔍 [SEARCH] Redis not configured, using Supabase fallback");
  }

  /* ---------- If no Redis results, search directly in Supabase ---------- */
  if (clubIds.length === 0 && eventIds.length === 0) {
    const [clubsRes, eventsRes] = await Promise.all([
      supabaseAdmin
        .from("clubs")
        .select("id, club_name, address_text")
        .ilike("club_name", `%${q}%`)
        .limit(5),
      supabaseAdmin
        .from("events")
        .select("id, name, event_date, club_id")
        .ilike("name", `%${q}%`)
        .limit(5),
    ]);
    if (clubsRes.data?.length) {
      clubsRes.data.forEach((c) =>
        results.push({
          type: "club",
          id: c.id,
          name: c.club_name,
          subtitle: c.address_text,
        })
      );
      console.log("🔍 [SEARCH] Clubs (fallback):", clubsRes.data.length);
    }
    if (eventsRes.data?.length) {
      eventsRes.data.forEach((e) =>
        results.push({
          type: "event",
          id: e.id,
          name: e.name,
          date: e.event_date,
          club_id: e.club_id,
        })
      );
      console.log("🔍 [SEARCH] Events (fallback):", eventsRes.data.length);
    }
  } else {
    /* ---------- DB Fetch by Redis IDs ---------- */
    if (clubIds.length) {
      const { data } = await supabaseAdmin
        .from("clubs")
        .select("id, club_name, address_text")
        .in("id", clubIds)
        .limit(5);
      data?.forEach((c) =>
        results.push({
          type: "club",
          id: c.id,
          name: c.club_name,
          subtitle: c.address_text,
        })
      );
      console.log("🔍 [SEARCH] Clubs found:", data?.length ?? 0);
    }
    if (eventIds.length) {
      const { data } = await supabaseAdmin
        .from("events")
        .select("id, name, event_date, club_id")
        .in("id", eventIds)
        .limit(5);
      data?.forEach((e) =>
        results.push({
          type: "event",
          id: e.id,
          name: e.name,
          date: e.event_date,
          club_id: e.club_id,
        })
      );
      console.log("🔍 [SEARCH] Events found:", data?.length ?? 0);
    }
  }

  console.log("🔍 [SEARCH] Returning", { query: q, resultCount: results.length });
  return Response.json({
    query: q,
    results,
  });
}