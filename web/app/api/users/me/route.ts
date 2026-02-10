import { withAuth } from "@/app/services/protected";
import supabaseAdmin from "@/app/services/supabase-admin";

export const runtime = "nodejs";

export const GET = withAuth(async (_req: Request, _ctx: any, user: any) => {
  try {
    const { data: customer, error } = await supabaseAdmin
      .from("customers")
      .select("first_name, last_name, username, phone_number, gender")
      .eq("id", user.id)
      .maybeSingle();

    if (error) {
      return Response.json({ error: error.message }, { status: 500 });
    }

    return Response.json({ customer: customer ?? null });
  } catch (err: any) {
    return Response.json(
      { error: err.message || "Internal server error" },
      { status: 500 }
    );
  }
});

export const PATCH = withAuth(async (req: Request, user: any) => {
  try {
    const body = await req.json().catch(() => ({}));

    /* -------------------- WHITELIST FIELDS -------------------- */

    const updateData: Record<string, any> = {};

    if (body.first_name !== undefined) updateData.first_name = body.first_name;
    if (body.last_name !== undefined) updateData.last_name = body.last_name;
    if (body.username !== undefined) updateData.username = body.username;
    if (body.gender !== undefined) {
      // Normalize gender to lowercase to match database constraint
      const normalizedGender = body.gender.toLowerCase().trim();
      const validGenders = ["male", "female", "other", "prefer_not_to_say"];
      if (validGenders.includes(normalizedGender)) {
        updateData.gender = normalizedGender;
      } else {
        return Response.json(
          { error: `Invalid gender value. Must be one of: ${validGenders.join(", ")}` },
          { status: 400 }
        );
      }
    }
    if (body.phone_number !== undefined) updateData.phone_number = body.phone_number;
    if (body.dob !== undefined) updateData.dob = body.dob; // Column is named 'dob' not 'date_of_birth'
    if (body.avatar_url !== undefined) updateData.avatar_url = body.avatar_url;
    if (body.instagram_handle !== undefined) updateData.instagram = body.instagram_handle;
    if (body.twitter_handle !== undefined) updateData.twitter = body.twitter_handle;
    if (body.onboarding_completed !== undefined)
      updateData.onboarding_completed = body.onboarding_completed;

    if (Object.keys(updateData).length === 0) {
      return Response.json(
        { error: "No valid fields provided" },
        { status: 400 }
      );
    }

    updateData.updated_at = new Date().toISOString();

    /* -------------------- UPSERT CUSTOMER -------------------- */

    const { data, error } = await supabaseAdmin
      .from("customers")
      .upsert(
        {
          id: user.id,
          email: user.email,
          ...updateData,
        },
        { onConflict: "id" }
      )
      .select()
      .single();

    if (error) {
      console.error("❌ Failed to update customer:", error);
      return Response.json(
        { error: error.message },
        { status: 500 }
      );
    }

    console.log("✅ Customer updated:", data);

    return Response.json({ ok: true, data });
  } catch (err: any) {
    console.error("❌ Unexpected error in PATCH /api/users/me:", err);
    return Response.json(
      { error: err.message || "Internal server error" },
      { status: 500 }
    );
  }
});