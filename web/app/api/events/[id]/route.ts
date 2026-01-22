import { withAuth } from "@/app/services/protected";
import supabaseAdmin from "@/app/services/supabase-admin";

export const runtime = "nodejs";

export const GET = withAuth(
  async (
    _req: Request,
    params: { id: string },
    _user: any
  ) => {
    const id = params.id;

    if (!id) {
      return Response.json(
        { error: "Event ID missing" },
        { status: 400 }
      );
    }

    const { data, error } = await supabaseAdmin
      .from("events")
      .select("*")
      .eq("id", id)
      .single();

    if (error || !data) {
      return Response.json(
        { error: "Event not found" },
        { status: 404 }
      );
    }

    return Response.json(data);
  }
);