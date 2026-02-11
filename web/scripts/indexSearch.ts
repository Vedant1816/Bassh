import { redis } from "@/lib/redis";
import supabaseAdmin from "@/app/services/supabase-admin";

function prefixes(text: string) {
  const p: string[] = [];
  const t = text.toLowerCase();
  for (let i = 1; i <= t.length; i++) {
    p.push(t.slice(0, i));
  }
  return p;
}

export async function indexSearchData() {
  // 🔥 Added null safety guard (fixes TypeScript error)
  if (!redis) {
    throw new Error("Redis client is not initialized");
  }

  /* -------- Clubs -------- */
  const { data: clubs } = await supabaseAdmin
    .from("clubs")
    .select("id, club_name");

  if (clubs) {
    for (const club of clubs) {
      const pfx = prefixes(club.club_name);
      for (const p of pfx) {
        await redis.sadd(`search:club:${p}`, club.id);
      }
    }
  }

  /* -------- Events -------- */
  const { data: events } = await supabaseAdmin
    .from("events")
    .select("id, name");

  if (events) {
    for (const event of events) {
      const pfx = prefixes(event.name);
      for (const p of pfx) {
        await redis.sadd(`search:event:${p}`, event.id);
      }
    }
  }

  console.log("✅ Search index built");
}
