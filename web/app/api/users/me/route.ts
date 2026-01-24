import { withAuth } from "@/app/services/protected";
import supabaseAdmin from "@/app/services/supabase-admin";

export const PATCH = withAuth(async (req: Request, user: any) => {
  try {
    const body = await req.json();
    console.log("📝 Updating customer:", { id: user.id, updates: body });

    // Ensure customer exists first (create if doesn't exist)
    const { data: existingCustomer } = await supabaseAdmin
      .from("customers")
      .select("id")
      .eq("id", user.id)
      .single();

    if (!existingCustomer) {
      console.log("⚠️ Customer doesn't exist, creating...");
      // Customer doesn't exist, create it first
      // Get user's email from users table
      const { data: userData } = await supabaseAdmin
        .from("users")
        .select("email")
        .eq("id", user.id)
        .single();

      const { error: createError } = await supabaseAdmin
        .from("customers")
        .insert({
          id: user.id,
          email: userData?.email || user.email,
          onboarding_completed: false,
        });

      if (createError && !createError.message.includes("duplicate")) {
        console.error("❌ Error creating customer:", createError);
        return Response.json({ error: createError.message }, { status: 500 });
      }
      console.log("✅ Customer created");
    }

    // Prepare update data - map fields to match schema
    const updateData: any = {};

    // Handle name fields directly (first_name, last_name are separate columns)
    if (body.first_name !== undefined) updateData.first_name = body.first_name;
    if (body.last_name !== undefined) updateData.last_name = body.last_name;

    // Map other fields to match schema
    if (body.username !== undefined) updateData.username = body.username;
    if (body.phone_number !== undefined) updateData.phone_number = body.phone_number;
    if (body.dob !== undefined) updateData.date_of_birth = body.dob; // Map dob -> date_of_birth
    if (body.avatar_url !== undefined) updateData.avatar_url = body.avatar_url;
    if (body.instagram_handle !== undefined) updateData.instagram = body.instagram_handle; // Map instagram_handle -> instagram
    if (body.twitter_handle !== undefined) updateData.twitter = body.twitter_handle; // Map twitter_handle -> twitter
    if (body.onboarding_completed !== undefined) updateData.onboarding_completed = body.onboarding_completed;
    
    // Always update updated_at timestamp
    updateData.updated_at = new Date().toISOString();

    // Update customer data
    const { data, error } = await supabaseAdmin
      .from("customers")
      .update(updateData)
      .eq("id", user.id)
      .select();

    if (error) {
      console.error("❌ Error updating customer:", error);
      return Response.json({ error: error.message }, { status: 500 });
    }

    console.log("✅ Customer updated successfully:", data);
    return Response.json({ ok: true, data });
  } catch (err: any) {
    console.error("❌ Unexpected error in PATCH /api/users/me:", err);
    return Response.json({ error: err.message || "Internal server error" }, { status: 500 });
  }
});