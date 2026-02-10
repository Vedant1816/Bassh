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

    const { data: discounts } = await supabaseAdmin
      .from("discounts")
      .select("*")
      .eq("club_id", id)
      .eq("is_active", true)
      .order("created_at", { ascending: false });

    function toPublicUrl(value: string | null | undefined): string | undefined {
      if (!value || typeof value !== "string") return undefined;
      if (value.startsWith("http://") || value.startsWith("https://")) return value;
      const { data } = supabaseAdmin.storage.from("event-images").getPublicUrl(value);
      return data?.publicUrl;
    }

    const enrichedClub = {
      ...club,
      cover_photo: toPublicUrl(club.cover_photo) ?? club.cover_photo,
      banner_image_url: toPublicUrl(club.banner_image_url || club.cover_photo) ?? (club.banner_image_url || club.cover_photo),
      logo_url: toPublicUrl(club.club_logo || club.logo_url) ?? (club.club_logo || club.logo_url),
      club_logo: toPublicUrl(club.club_logo) ?? club.club_logo,
    };

    const enrichedEvents = (events ?? []).map((e: any) => ({
      ...e,
      banner_image_url: toPublicUrl(e.banner_image_url || e.image_url || e.poster_url) ?? (e.banner_image_url || e.image_url || e.poster_url),
    }));

    return Response.json({
      club: enrichedClub,
      events: enrichedEvents,
      discounts: discounts ?? [],
    });
  } catch (err: any) {
    console.error("❌ Get club error:", err);
    return Response.json(
      { error: err.message || "Internal server error" },
      { status: 500 }
    );
  }
});
