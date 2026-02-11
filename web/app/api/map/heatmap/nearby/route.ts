import supabaseAdmin from "@/app/services/supabase-admin";
import { withAuth } from "@/app/services/protected";

export const POST = withAuth(async (req: Request) => {
  const { lat, lng, radius = 5000 } = await req.json();

  const { data, error } = await supabaseAdmin.rpc(
    "get_nearby_live_clubs",
    {
      lat: parseFloat(lat),
      lng: parseFloat(lng),
      radius_meters: parseInt(radius, 10),
    }
  );

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json({
    type: "FeatureCollection",
    features: data || [],
  });
});