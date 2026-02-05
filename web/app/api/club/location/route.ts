import { withAuth } from "@/app/services/protected";
import supabaseAdmin from "@/app/services/supabase-admin";

export const PATCH = withAuth(async (req: Request, user: { id: string }) => {
  try {
    const body = await req.json();
    const { location } = body;

    if (
      !location?.latitude ||
      !location?.longitude ||
      !location?.address_text
    ) {
      return Response.json(
        { error: "address_text, latitude and longitude are required" },
        { status: 400 }
      );
    }

    const { data: club, error: clubError } = await supabaseAdmin
      .from("clubs")
      .select("club_name")
      .eq("id", user.id)
      .single();

    if (clubError || !club) {
      return Response.json(
        { error: "Club not found for this user" },
        { status: 404 }
      );
    }

    const { error: addressError } = await supabaseAdmin
      .from("clubs")
      .update({ address_text: location.address_text, longitude: location.longitude, latitude: location.latitude })
      .eq("id", user.id);

    if (addressError) {
      return Response.json(
        { error: addressError.message },
        { status: 500 }
      );
    }

    const { error: locationError } = await supabaseAdmin.rpc(
      "insert_location",
      {
        p_name: club.club_name,
        p_category: "club",
        p_lat: location.latitude,
        p_lng: location.longitude,
      }
    );

    if (locationError) {
      return Response.json(
        { error: locationError.message },
        { status: 500 }
      );
    }

    return Response.json(
      { message: "Location updated successfully" },
      { status: 200 }
    );

  } catch (err: any) {
    return Response.json(
      { error: err.message || "Internal server error" },
      { status: 500 }
    );
  }
});
