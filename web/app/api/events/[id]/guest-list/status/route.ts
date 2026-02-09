import { withAuth } from "@/app/services/protected";
import supabaseAdmin from "@/app/services/supabase-admin";

export const runtime = "nodejs";

export const GET = withAuth(
    async (_req: Request, params: { id: string }, user: any) => {
        try {
            const eventId = params.id;

            if (!eventId) {
                return Response.json({ error: "Event ID missing" }, { status: 400 });
            }

            const { data, error } = await supabaseAdmin
                .from("guests")
                .select("status")
                .eq("event_id", eventId)
                .eq("user_id", user.id)
                .single();

            if (error && error.code !== 'PGRST116') { // PGRST116 is 0 rows
                console.error("❌ Guest status fetch error:", error);
                return Response.json({ error: "Failed to fetch guest status" }, { status: 500 });
            }

            return Response.json({
                applied: !!data,
                status: data?.status || null
            });
        } catch (err: any) {
            console.error("❌ Guest status exception:", err);
            return Response.json({ error: err.message || "Internal server error" }, { status: 500 });
        }
    }
);
