import { withAuth } from "@/app/services/protected";
import supabaseAdmin from "@/app/services/supabase-admin";

export const runtime = "nodejs";

export const POST = withAuth(async (req: Request, user: any) => {
  try {
    const body = await req.json().catch(() => ({}));
    const email = body.email || user.email;
    const role = body.role || "user";
    const name = body.name || email.split("@")[0];

    /* ---------------- VALIDATION ---------------- */

    if (!email) {
      console.error("❌ VALIDATION ERROR: Email missing");
      return Response.json({ error: "Email missing" }, { status: 400 });
    }

    if (!["user", "club", "staff"].includes(role)) {
      console.error("❌ VALIDATION ERROR: Invalid role", role);
      return Response.json({ error: "Invalid role" }, { status: 400 });
    }

    /* ---------------- USERS TABLE ---------------- */
    // Identity table (auth-linked)

    const { data: userData, error: userError } = await supabaseAdmin
      .from("users")
      .upsert(
        {
          id: user.id,
          email,
          name,
          role,
        },
        { onConflict: "id" }
      )
      .select();

    if (userError) {
      console.error("❌ USERS TABLE ERROR:", {
        code: userError.code,
        message: userError.message,
        details: userError.details,
        hint: userError.hint,
      });
      return Response.json({ error: userError.message }, { status: 500 });
    }

    /* ---------------- CUSTOMERS TABLE ---------------- */
    // Always create customer profile for users

    if (role === "user") {
      const { error: customerError } = await supabaseAdmin
        .from("customers")
        .upsert(
          {
            id: user.id,              // FK → users.id
            email,
            onboarding_completed: false,
          },
          { onConflict: "id" }
        );

      if (customerError) {
        return Response.json(
          { error: customerError.message },
          { status: 500 }
        );
      }
    }

    /* ---------------- STAFF TABLE ---------------- */

    if (role === "staff") {
      console.log("📝 Creating staff record:", {
        id: user.id,
        email,
        status: "pending",
        post: "staff",
      });

      const { data: staffData, error: staffError } = await supabaseAdmin
        .from("staff")
        .upsert(
          {
            id: user.id,
            email,
            status: "pending",
            post: "staff",
          },
          { onConflict: "id" }
        )
        .select();

      if (staffError) {
        console.error("❌ STAFF TABLE ERROR:", {
          code: staffError.code,
          message: staffError.message,
          details: staffError.details,
          hint: staffError.hint,
        });
        return Response.json(
          { error: staffError.message },
          { status: 500 }
        );
      }

      console.log("✅ Staff record created successfully:", staffData);
    }

    /* ---------------- CLUBS TABLE ---------------- */

    if (role === "club") {
      const { clubName, location, isNewClub } = body;

      if (!clubName || !location?.latitude || !location?.longitude) {
        return Response.json(
          { error: "Missing club details" },
          { status: 400 }
        );
      }

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
        return Response.json(
          { error: clubError.message },
          { status: 500 }
        );
      }

      // Insert heatmap point only once
      if (isNewClub === true) {
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
    }

    return Response.json({ ok: true });
  } catch (err: any) {
    return Response.json(
      { error: err.message || "Internal server error" },
      { status: 500 }
    );
  }
});

export const GET = withAuth(async (req: Request, _ctx: any, user: any) => {
  try {
    const { data: userData, error: userError } = await supabaseAdmin
      .from("users")
      .select("*")
      .eq("id", user.id)
      .single();

    if (userError) {
      console.error("❌ GET USER ERROR:", userError);
      return Response.json({ error: userError.message }, { status: 500 });
    }

    if (!userData) {
      return Response.json({ error: "User not found" }, { status: 404 });
    }

    return Response.json({ user: userData });
  } catch (err: any) {
    return Response.json(
      { error: err.message || "Internal server error" },
      { status: 500 }
    );
  }
});
