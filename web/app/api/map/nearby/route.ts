import supabaseAdmin from "@/app/services/supabase-admin";
import { withAuth } from "@/app/services/protected";

export const POST = withAuth(async (req: Request, _params: any, _user: any) => {
    const {
      lat,
      lng,
      radius = 5000,
      categories,
      minIntensity = 1,
    } = await req.json();
  
    const { data, error } = await supabaseAdmin.rpc(
      "get_nearby_locations",
      {
        lat: parseFloat(lat),
        lng: parseFloat(lng),
        radius_meters: parseInt(radius, 10),
        categories: categories || null,
        min_intensity: parseFloat(minIntensity), // Explicitly cast to float
      }
    );
  
    if (error) {
      return Response.json({ error: error.message }, { status: 500 });
    }
  
    // Ensure features is always an array, even if data is null or undefined
    const features = Array.isArray(data) ? data : [];
  
    return Response.json({
      type: "FeatureCollection",
      features: features,
    });
  });