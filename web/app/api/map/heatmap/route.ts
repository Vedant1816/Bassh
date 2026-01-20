import supabaseAdmin from "@/app/services/supabase-admin";
import { withAuth } from "@/app/services/protected";

export const POST = withAuth(async (req) => {
  const { categories = ["club"], minIntensity = 1 } = await req.json();

  const { data, error } = await supabaseAdmin.rpc(
    "get_club_heatmap",
    {
      categories,
      min_intensity: minIntensity,
    }
  );

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json({
    type: "FeatureCollection",
    features: data,
  });
});