import supabaseAdmin from "./supabase-admin";

export function withAuth(
  handler: (req: Request, user: any) => Promise<Response>
) {
  return async (req: Request) => {
    const authHeader = req.headers.get("authorization");

    if (!authHeader) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const token = authHeader.replace("Bearer ", "");

    const {
      data: { user },
      error,
    } = await supabaseAdmin.auth.getUser(token);

    if (error || !user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    return handler(req, user);
  };
}
