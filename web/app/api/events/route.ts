import { withAuth } from "@/app/services/protected";
import supabaseAdmin from "@/app/services/supabase-admin";

export const POST = withAuth(async (req: Request, user: any) => {
  const body = await req.json();

  const {
    name,
    role,
    clubName,
    location, // { address, latitude, longitude }
  } = body;

  /* ---------------- VALIDATION ---------------- */

  if (!role || !["user", "club"].includes(role)) {
    return Response.json(
      { error: "Invalid role" },
      { status: 400 }
    );
  }

  /* ---------------- USERS TABLE ---------------- */

  const { error: userError } = await supabaseAdmin
    .from("users")
    .insert({
      id: user.id,
      name,
      role,
    });

  if (userError) {
    return Response.json(
      { error: userError.message },
      { status: 500 }
    );
  }

  /* ---------------- ROLE: USER ---------------- */

  if (role === "user") {
    const { error } = await supabaseAdmin
      .from("customers")
      .insert({
        id: user.id,
        full_name: name,
        onboarding_completed: false,
      });

    if (error) {
      return Response.json(
        { error: error.message },
        { status: 500 }
      );
    }
  }

  /* ---------------- ROLE: CLUB ---------------- */

  if (role === "club") {
    if (!clubName || !location?.latitude || !location?.longitude) {
      return Response.json(
        { error: "Missing club details" },
        { status: 400 }
      );
    }

    const { error: clubError } = await supabaseAdmin
      .from("clubs")
      .insert({
        id: user.id,
        club_name: clubName,
        address_text: location.address,
        latitude: location.latitude,
        longitude: location.longitude,
      });

    if (clubError) {
      return Response.json(
        { error: clubError.message },
        { status: 500 }
      );
    }

    // 📍 Insert into heatmap locations
    const { error: locationError } = await supabaseAdmin.rpc(
      "insert_location",
      {
        p_name: clubName,
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
  }

  /* ---------------- DONE ---------------- */

  return Response.json({ ok: true });
});