import supabaseAdmin from "./supabase-admin";

type HandlerWithParams = (req: Request, params: any, user: any) => Promise<Response>;
type HandlerWithUser = (req: Request, user: any) => Promise<Response>;
type HandlerSimple = (req: Request) => Promise<Response>;

export function withAuth(
  handler: HandlerWithParams | HandlerWithUser | HandlerSimple
) {
  return async (req: Request, ctx?: { params?: Promise<any> | any }) => {
    const authHeader = req.headers.get("authorization");

    if (!authHeader) {
      console.warn("⚠️ No Authorization header in request");
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const token = authHeader.replace("Bearer ", "");

    if (!token) {
      console.warn("⚠️ Empty token in Authorization header");
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    // // Log full access token for debugging
    // console.log("🔐 [AUTH] Access Token:", token);
    // console.log("🔐 [AUTH] Token length:", token.length);
    // console.log("🔐 [AUTH] Token preview (first 50 chars):", token.substring(0, 50) + "...");

    const { data, error } = await supabaseAdmin.auth.getUser(token);

    if (error) {
      console.error("❌ Token validation error:", error.message);
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!data?.user) {
      console.warn("⚠️ No user found from token");
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    // // Log authenticated user details
    // console.log("✅ [AUTH] User authenticated:", {
    //   id: data.user.id,
    //   email: data.user.email,
    //   role: (data.user.user_metadata as any)?.role || "unknown"
    // });

    const paramCount = handler.length;

    if (paramCount === 1) {
      // Handler: (req) => Promise<Response>
      return (handler as HandlerSimple)(req);
    } else if (paramCount === 2) {
      // Handler: (req, user) => Promise<Response>
      return (handler as HandlerWithUser)(req, data.user);
    } else {
      // Handler: (req, params, user) => Promise<Response>
      let params = {};
      if (ctx?.params) {
        // Handle both Promise and direct object
        params = ctx.params instanceof Promise ? await ctx.params : ctx.params;
      }
      return (handler as HandlerWithParams)(req, params, data.user);
    }
  };
}