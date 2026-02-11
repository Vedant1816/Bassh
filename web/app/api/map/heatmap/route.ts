import supabaseAdmin from "@/app/services/supabase-admin";
import { withAuth } from "@/app/services/protected";

// Prevent Next.js from caching this route — always fetch fresh data
export const dynamic = "force-dynamic";
export const revalidate = 0;

export const POST = withAuth(async () => {
  const { data, error } = await supabaseAdmin.rpc(
    "get_live_club_heatmap"
  );

  if (error) {
    return Response.json(
      { error: error.message },
      { status: 500 }
    );
  }

  return Response.json({
    type: "FeatureCollection",
    features: data ?? [],
  });
});