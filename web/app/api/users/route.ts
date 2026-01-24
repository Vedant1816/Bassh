import { withAuth } from "@/app/services/protected";
import supabaseAdmin from "@/app/services/supabase-admin";

export const runtime = "nodejs";

export const POST = withAuth(async (req: Request, user: any) => {
  try {
    const body = await req.json().catch(() => ({}));

    const email = body.email || user.email;
    const role = body.role || "user";
    const name = body.name || email.split("@")[0];

    console.log("📝 Creating / updating user:", {
      id: user.id,
      email,
      role,
      name,
    });

    /* -------------------- VALIDATION -------------------- */

    if (!["user", "club"].includes(role)) {
      return Response.json(
        { error: "Invalid role" },
        { status: 400 }
      );
    }

    /* -------------------- USERS TABLE -------------------- */
    // identity table (auth-linked)

    const { error: userError } = await supabaseAdmin
      .from("users")
      .upsert(
        {
          id: user.id,
          email,
          name,
          role,
        },
        { onConflict: "id" }
      );

    if (userError) {
      console.error("❌ users upsert failed:", userError);
      return Response.json(
        { error: userError.message },
        { status: 500 }
      );
    }

    /* -------------------- ROLE: USER -------------------- */
    // profile table (onboarding lives here)

    if (role === "user") {
      const { error } = await supabaseAdmin
        .from("customers")
        .upsert(
          {
            id: user.id,                 // FK = users.id (PRIMARY KEY)
            email: email,
            onboarding_completed: false, // updated later after onboarding
          },
          { onConflict: "id" }
        );

      if (error) {
        console.error("❌ customers upsert failed:", error);
        return Response.json(
          { error: error.message },
          { status: 500 }
        );
      }
    }

    /* -------------------- ROLE: CLUB -------------------- */
    // business entity + heatmap

    if (role === "club") {
      const { clubName, location } = body;

      if (
        !clubName ||
        !location?.latitude ||
        !location?.longitude
      ) {
        return Response.json(
          { error: "Missing club details" },
          { status: 400 }
        );
      }

      // clubs table
      const { error: clubError } = await supabaseAdmin
        .from("clubs")
        .upsert(
          {
            id: user.id,
            club_name: clubName,
            address_text: location.address || "",
            latitude: location.latitude,
            longitude: location.longitude,
          },
          { onConflict: "id" }
        );

      if (clubError) {
        console.error("❌ clubs upsert failed:", clubError);
        return Response.json(
          { error: clubError.message },
          { status: 500 }
        );
      }

      // heatmap / locations table
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
        console.error("❌ insert_location failed:", locationError);
        return Response.json(
          { error: locationError.message },
          { status: 500 }
        );
      }
    }

    /* -------------------- SUCCESS -------------------- */

    console.log("✅ User flow completed successfully");
    return Response.json({ ok: true });

  } catch (err: any) {
    console.error("❌ Unexpected error in /api/users:", err);
    return Response.json(
      { error: err.message || "Internal server error" },
      { status: 500 }
    );
  }
});