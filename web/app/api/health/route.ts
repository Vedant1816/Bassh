import supabaseAdmin from "@/app/services/supabase-admin";
export async function GET() {
  const { data, error } = await supabaseAdmin
    .from("users")
    .select("*")
    .limit(1);

  if (error) {
    return Response.json(
      { ok: false, error: error.message },
      { status: 500 }
    );
  }

  return Response.json({
    ok: true,
    message: "Supabase connected successfully",
    sample: data,
  });
}