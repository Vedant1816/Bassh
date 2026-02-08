import { withAuth } from "@/app/services/protected";
import supabaseAdmin from "@/app/services/supabase-admin";

export const runtime = "nodejs";

/**
 * GET /api/clubs/nearby?lat=..&lng=..
 */
export const GET = withAuth(async (req: Request) => {
  try {
    const { searchParams } = new URL(req.url);

    const lat = Number(searchParams.get("lat"));
    const lng = Number(searchParams.get("lng"));

    if (!lat || !lng) {
      return Response.json(
        { error: "lat and lng are required" },
        { status: 400 }
      );
    }

    const { data, error } = await supabaseAdmin.rpc("get_nearby_clubs", {
      user_lat: lat,
      user_lng: lng,
    });

    if (error) {
      console.error("❌ get_nearby_clubs error:", error);
      return Response.json(
        { error: error.message },
        { status: 500 }
      );
    }

    const clubs = data || [];
    if (clubs.length === 0) return Response.json(clubs);

    // Ensure profile_image_url (and banner_image_url) from clubs table so mobile can show them
    const ids = clubs.map((c: { id: string }) => c.id);
    const { data: clubRows, error: clubRowsError } = await supabaseAdmin
      .from("clubs")
      .select("id, cover_photo, club_logo, prices, gallery")
      .in("id", ids);

    if (clubRowsError) {
      console.error("❌ Error fetching club details:", clubRowsError);
    }

    console.log(`📊 Fetched ${clubRows?.length || 0} club rows for ${ids.length} clubs`);
    if (clubRows && clubRows.length > 0) {
      clubRows.forEach((r: any) => {
        console.log(`  - Club ${r.id}: prices =`, r.prices, `(type: ${typeof r.prices})`);
      });
    }

    const byId = new Map(
      (clubRows || []).map((r: { id: string; cover_photo?: string; club_logo?: string; prices?: any; gallery?: any }) => [r.id, r])
    );

    function toPublicUrl(value: string | null | undefined): string | undefined {
      if (!value || typeof value !== "string") return undefined;
      if (value.startsWith("http://") || value.startsWith("https://")) return value;
      const { data } = supabaseAdmin.storage.from("event-images").getPublicUrl(value);
      return data?.publicUrl;
    }

    const enriched = clubs.map((c: any) => {
      const extra = byId.get(c.id);

      // Debug: Check if we found the club in the extra data
      if (!extra) {
        console.warn(`⚠️ Club ${c.id} (${c.club_name}) not found in clubRows query`);
      }

      const profileRaw = c.profile_image_url ?? extra?.cover_photo ?? extra?.club_logo;
      const bannerRaw = c.banner_image_url ?? extra?.cover_photo;
      const coverPhotoRaw = c.cover_photo ?? extra?.cover_photo;
      const clubLogoRaw = c.club_logo ?? extra?.club_logo;

      // Parse gallery if it's a JSON string
      let parsedGallery = extra?.gallery ?? c.gallery;
      if (typeof parsedGallery === 'string') {
        try {
          parsedGallery = JSON.parse(parsedGallery);
        } catch (e) {
          console.error(`  ❌ Failed to parse gallery for club ${c.id}:`, e);
          parsedGallery = [];
        }
      }
      // Ensure gallery is an array
      if (!Array.isArray(parsedGallery)) {
        parsedGallery = [];
      }

      // Parse prices if it's a JSON string
      // Priority: extra?.prices (from clubs table) > c.prices (from RPC)
      let parsedPrices = extra?.prices ?? c.prices;

      // Debug logging
      console.log(`🔍 Club: ${c.club_name || c.id} (ID: ${c.id})`);
      console.log(`  - RPC prices:`, c.prices, `(type: ${typeof c.prices})`);
      console.log(`  - Extra exists:`, !!extra);
      if (extra) {
        console.log(`  - Extra ID:`, extra.id);
        console.log(`  - Extra prices:`, extra.prices, `(type: ${typeof extra.prices})`);
      }
      console.log(`  - Final parsedPrices (before parse):`, parsedPrices);

      if (parsedPrices === null) {
        // null from database means no prices set
        parsedPrices = undefined;
        console.log(`  ℹ️ Prices is null in DB, setting to undefined`);
      } else if (typeof parsedPrices === 'string') {
        try {
          parsedPrices = JSON.parse(parsedPrices);
          console.log(`  ✅ Parsed from string:`, parsedPrices);
        } catch (e) {
          console.error(`  ❌ Failed to parse prices:`, e);
          parsedPrices = undefined;
        }
      } else if (parsedPrices && typeof parsedPrices === 'object') {
        // Already an object
        const keys = Object.keys(parsedPrices);
        console.log(`  ✅ Prices is object with keys:`, keys);
        if (keys.length === 0) {
          console.log(`  ⚠️ Prices object is empty`);
        }
      }

      // Convert gallery URLs to public URLs if needed
      const galleryUrls = Array.isArray(parsedGallery)
        ? parsedGallery.map((url: string) => toPublicUrl(url) ?? url).filter(Boolean)
        : [];

      const result = {
        ...c,
        profile_picture_url: toPublicUrl(profileRaw) ?? profileRaw,
        banner_image_url: toPublicUrl(bannerRaw) ?? bannerRaw,
        cover_photo: toPublicUrl(coverPhotoRaw) ?? coverPhotoRaw,
        club_logo: toPublicUrl(clubLogoRaw) ?? clubLogoRaw,
        prices: parsedPrices,
        gallery: galleryUrls,
      };

      console.log(`  ✅ Final result prices:`, result.prices);
      return result;
    });

    return Response.json(enriched);
  } catch (err) {
    console.error("❌ /clubs/nearby error:", err);
    return Response.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
});