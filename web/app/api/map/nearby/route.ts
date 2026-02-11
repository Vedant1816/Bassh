import supabaseAdmin from "@/app/services/supabase-admin";
import { withAuth } from "@/app/services/protected";

export const GET = withAuth(async (req: Request) => {
  const { searchParams } = new URL(req.url);
  const lat = parseFloat(searchParams.get("lat") || "0");
  const lng = parseFloat(searchParams.get("lng") || "0");

  const { data, error } = await supabaseAdmin.rpc(
    "get_live_club_cards",
    {
      user_lat: lat,
      user_lng: lng,
    }
  );

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json(data ?? []);
});