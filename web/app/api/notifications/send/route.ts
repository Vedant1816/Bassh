import supabaseAdmin from "@/app/services/supabase-admin";
import { withAuth } from "@/app/services/protected";

export const runtime = "nodejs";

// POST - Send notification to a user by username/email OR to the authenticated user
export const POST = withAuth(async (req: Request, _params: any, authUser: any) => {
    console.log("🔔 [NOTIFICATIONS] POST /api/notifications/send - Request received");

    try {
        const body = await req.json();
        const { username, title, message, type = "general", metadata = {} } = body;

        console.log("🔔 [NOTIFICATIONS] Request body:", { username, title, type, metadata });

        if (!title || !message) {
            return Response.json(
                { error: "title and message are required" },
                { status: 400 }
            );
        }

        let targetUserId: string;
        let targetUserName: string = "User";

        if (!username) {
            console.log("🔔 [NOTIFICATIONS] No username provided, sending to authenticated user:", authUser.id);
            targetUserId = authUser.id;
            targetUserName = authUser.email || "User";
        } else {
            const { data: user, error: userError } = await supabaseAdmin
                .from("customers")
                .select("id, email, username")
                .or(`username.ilike.${username},email.ilike.${username}`)
                .limit(1)
                .single();

            if (userError || !user) {
                console.error("❌ [NOTIFICATIONS] User not found:", username);
                return Response.json(
                    { error: "User not found", username },
                    { status: 404 }
                );
            }

            console.log("✅ [NOTIFICATIONS] User found:", user.id, user.username);
            targetUserId = user.id;
            targetUserName = user.username || user.email || "User";
        }

        const { data: notification, error: notifError } = await supabaseAdmin
            .from("notifications")
            .insert({
                user_id: targetUserId,
                title,
                message,
                type,
                metadata,
                is_read: false,
                created_at: new Date().toISOString(),
            })
            .select()
            .single();

        if (notifError) {
            console.error("❌ [NOTIFICATIONS] Insert error:", notifError);
            return Response.json(
                { error: "Failed to create notification", details: notifError.message },
                { status: 500 }
            );
        }

        console.log("✅ [NOTIFICATIONS] Notification created:", notification.id);
        console.log("📝 [NOTIFICATIONS] Metadata saved:", notification.metadata);

        return Response.json({
            success: true,
            notification,
            user: {
                id: targetUserId,
                name: targetUserName,
            },
        });
    } catch (err: any) {
        console.error("❌ [NOTIFICATIONS] Error:", err.message);
        return Response.json(
            { error: err.message || "Internal server error" },
            { status: 500 }
        );
    }
});
