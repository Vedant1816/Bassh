import supabaseAdmin from "@/app/services/supabase-admin";
import { withAuth } from "@/app/services/protected";

export const GET = withAuth(async (req: Request, user: { id: string }) => {
  try {
    const clubId = user.id;

    // ---- Current date & time (UTC-safe) ----
    const now = new Date();
    const today = now.toISOString().slice(0, 10); // YYYY-MM-DD
    const currentTime = now.toISOString().slice(11, 19); // HH:MM:SS

    const { data, error } = await supabaseAdmin
      .from("discounts")
      .select("id")
      .eq("club_id", clubId)
      .eq("is_active", true)
      .or(
  `end_date.gt.${today},and(end_date.eq.${today},or(end_time.is.null,end_time.gt.${currentTime}))`
)


    if (error) throw error;

    return Response.json({
      activeDiscounts: data.length,
    });
  } catch (err) {
    console.error(err);
    return new Response("Failed to fetch active discounts", { status: 500 });
  }
});
