import { withAuth } from "@/app/services/protected";
import supabaseAdmin from "@/app/services/supabase-admin";

export const runtime = "nodejs";

export const GET = withAuth(async (_req, params) => {
  const { id } = params;

  const { data, error } = await supabaseAdmin
    .from("bookings")
    .select("*")
    .eq("id", id)
    .single();

  if (error) {
    return Response.json({ error: "Booking not found" }, { status: 404 });
  }

  return Response.json(data);
});