import { withAuth } from "@/app/services/protected";
import supabaseAdmin from "@/app/services/supabase-admin";

export const GET = withAuth(async (_req: Request, user: { id: string }) => {
  try {
    const clubId = user.id;

    const { data, error } = await supabaseAdmin
      .from("payouts")
      .select(`
        id,
        amount,
        status,
        requested_at
      `)
      .eq("club_id", clubId)
      .order("requested_at", { ascending: false });

    if (error) throw error;

    return Response.json({
      success: true,
      data,
    });
  } catch (err) {
    console.error(err);
    return new Response("Failed to fetch payout history", { status: 500 });
  }
});
