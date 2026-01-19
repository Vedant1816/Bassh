import { withAuth } from "@/app/services/protected";
import supabaseAdmin from "@/app/services/supabase-admin";

export const POST = withAuth(async (req, user) => {
  const { name, role } = await req.json();

  const { error } = await supabaseAdmin.from("users").insert({
    id: user.id,
    name,
    role,
  });

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json({ ok: true });
});
