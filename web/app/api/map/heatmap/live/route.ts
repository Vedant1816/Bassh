import supabaseAdmin from "@/app/services/supabase-admin";
import { withAuth } from "@/app/services/protected";

export const POST = withAuth(async (req: Request) => {
  const { categories = null } = await req.json();

  const { data, error } = await supabaseAdmin.rpc(
    "get_live_club_heatmap",
    { categories }
  );

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json({
    type: "FeatureCollection",
    features: data || [],
  });
});