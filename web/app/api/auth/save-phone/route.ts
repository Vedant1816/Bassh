import supabaseAdmin from "@/app/services/supabase-admin";

export const runtime = "nodejs";

export const POST = async (req: Request) => {
  try {
    // Extract the Bearer token from the Authorization header manually.
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const token = authHeader.split(" ")[1];

    // Verify the token and resolve the user via the admin client
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);

    if (authError || !user) {
      return Response.json({ error: "Invalid or expired token" }, { status: 401 });
    }

    // Parse and validate the request body
    const { phone } = await req.json();

    if (!phone) {
      return Response.json({ error: "Phone number required" }, { status: 400 });
    }

    // Validate phone format
    if (typeof phone !== "string" || !/^\+\d{10,15}$/.test(phone)) {
      return Response.json({ error: "Invalid phone number format" }, { status: 400 });
    }

    // Save only the verified phone number to the customers table
    const { error } = await supabaseAdmin
      .from("customers")
      .update({
        phone_number: phone,
      })
      .eq("id", user.id);

    if (error) {
      console.error("Supabase update error:", error);
      return Response.json(
        { error: "Failed to save phone number" },
        { status: 500 }
      );
    }

    return Response.json({ ok: true });
  } catch (err: any) {
    console.error("Save phone error:", err);
    return Response.json(
      { error: err.message || "Internal server error" },
      { status: 500 }
    );
  }
};