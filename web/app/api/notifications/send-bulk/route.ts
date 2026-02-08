import { NextRequest } from "next/server";
import { withAuth } from "@/app/services/protected";
import supabaseAdmin from "@/app/services/supabase-admin";

export const runtime = "nodejs";

// POST - Send notification to multiple users by username or email
export async function POST(req: NextRequest) {
    console.log("🔔 [NOTIFICATIONS] POST /api/notifications/send-bulk - Request received");

    try {
        const body = await req.json();
        const { usernames, title, message, type = "general", metadata = {} } = body;

        // Validate required fields
        if (!usernames || !Array.isArray(usernames) || usernames.length === 0) {
            console.error("❌ [NOTIFICATIONS] usernames array is required");
            return Response.json(
                { error: "usernames array is required" },
                { status: 400 }
            );
        }

        if (!title || !message) {
            console.error("❌ [NOTIFICATIONS] title and message are required");
            return Response.json(
                { error: "title and message are required" },
                { status: 400 }
            );
        }

        console.log("🔔 [NOTIFICATIONS] Sending to", usernames.length, "users:", usernames);

        // Build OR query to match usernames or emails
        // We need to check both username and email fields in customers table
        // Format: username.eq.value1,username.eq.value2,email.eq.value1,email.eq.value2
        const orConditions: string[] = [];

        usernames.forEach((name: string) => {
            const trimmedName = name.trim().toLowerCase();
            if (trimmedName) {
                // Check username (case insensitive by using ilike)
                orConditions.push(`username.ilike.${trimmedName}`);
                // Also check email in case the name is an email
                if (trimmedName.includes("@")) {
                    orConditions.push(`email.ilike.${trimmedName}`);
                }
            }
        });

        if (orConditions.length === 0) {
            console.error("❌ [NOTIFICATIONS] No valid usernames provided");
            return Response.json(
                { error: "No valid usernames provided" },
                { status: 400 }
            );
        }

        const orQuery = orConditions.join(",");
        console.log("🔍 [NOTIFICATIONS] OR Query:", orQuery);

        // Find all matching users in customers table
        const { data: users, error: usersError } = await supabaseAdmin
            .from("customers")
            .select("id, email, username")
            .or(orQuery);

        if (usersError) {
            console.error("❌ [NOTIFICATIONS] Users fetch error:", usersError);
            return Response.json(
                { error: "Failed to fetch users", details: usersError.message },
                { status: 500 }
            );
        }

        if (!users || users.length === 0) {
            console.log("⚠️ [NOTIFICATIONS] No users found matching:", usernames);
            return Response.json(
                {
                    success: true,
                    count: 0,
                    message: "No matching users found",
                    searchedFor: usernames,
                },
                { status: 200 }
            );
        }

        console.log("✅ [NOTIFICATIONS] Found", users.length, "matching users");
        users.forEach(user => {
            console.log(`   - ${user.username || user.email}`);
        });

        console.log("📝 [NOTIFICATIONS] Metadata received:", JSON.stringify(metadata));

        // Create notifications for all matched users
        const notifications = users.map(user => ({
            user_id: user.id,
            title,
            message,
            type,
            metadata: metadata || {},
            is_read: false,
            created_at: new Date().toISOString(),
        }));

        console.log("📝 [NOTIFICATIONS] Creating", notifications.length, "notifications");
        console.log("📝 [NOTIFICATIONS] Sample notification metadata:", JSON.stringify(notifications[0]?.metadata));

        const { data: inserted, error: insertError } = await supabaseAdmin
            .from("notifications")
            .insert(notifications)
            .select();

        if (insertError) {
            console.error("❌ [NOTIFICATIONS] Insert error:", insertError);
            return Response.json(
                { error: "Failed to create notifications", details: insertError.message },
                { status: 500 }
            );
        }

        console.log("✅ [NOTIFICATIONS] Successfully created", inserted?.length || 0, "notifications");

        return Response.json({
            success: true,
            count: inserted?.length || 0,
            users: users.map(u => ({
                id: u.id,
                username: u.username,
                email: u.email,
            })),
            message: `Notifications sent to ${inserted?.length || 0} user(s)`,
        });
    } catch (err: any) {
        console.error("❌ [NOTIFICATIONS] Unexpected error:", err);
        return Response.json(
            { error: err.message || "Internal server error" },
            { status: 500 }
        );
    }
}

// GET - Get all notifications for the authenticated user
export const GET = withAuth(async (req: NextRequest, _params: any, user: any) => {
    console.log("🔔 [NOTIFICATIONS] GET /api/notifications/send-bulk - User:", user.id);

    try {
        const { searchParams } = new URL(req.url);
        const limit = parseInt(searchParams.get("limit") || "50");
        const offset = parseInt(searchParams.get("offset") || "0");
        const unreadOnly = searchParams.get("unread_only") === "true";

        let query = supabaseAdmin
            .from("notifications")
            .select("*", { count: "exact" })
            .eq("user_id", user.id)
            .order("created_at", { ascending: false })
            .range(offset, offset + limit - 1);

        if (unreadOnly) {
            query = query.eq("is_read", false);
        }

        const { data: notifications, error, count } = await query;

        if (error) {
            console.error("❌ [NOTIFICATIONS] Fetch error:", error);
            return Response.json(
                { error: "Failed to fetch notifications", details: error.message },
                { status: 500 }
            );
        }

        console.log("✅ [NOTIFICATIONS] Found", notifications?.length || 0, "notifications");

        return Response.json({
            notifications: notifications || [],
            total: count || 0,
            limit,
            offset,
        });
    } catch (err: any) {
        console.error("❌ [NOTIFICATIONS] Error:", err);
        return Response.json(
            { error: err.message || "Internal server error" },
            { status: 500 }
        );
    }
});

// PATCH - Mark notifications as read
export const PATCH = withAuth(async (req: NextRequest, _params: any, user: any) => {
    console.log("🔔 [NOTIFICATIONS] PATCH /api/notifications/send-bulk - User:", user.id);

    try {
        const body = await req.json();
        const { notification_ids, mark_all = false } = body;

        let query = supabaseAdmin
            .from("notifications")
            .update({ is_read: true, read_at: new Date().toISOString() })
            .eq("user_id", user.id);

        if (mark_all) {
            // Mark all notifications as read
            console.log("📝 [NOTIFICATIONS] Marking all notifications as read");
        } else if (notification_ids && Array.isArray(notification_ids)) {
            // Mark specific notifications as read
            console.log("📝 [NOTIFICATIONS] Marking", notification_ids.length, "notifications as read");
            query = query.in("id", notification_ids);
        } else {
            return Response.json(
                { error: "Either notification_ids array or mark_all=true is required" },
                { status: 400 }
            );
        }

        const { data, error } = await query.select();

        if (error) {
            console.error("❌ [NOTIFICATIONS] Update error:", error);
            return Response.json(
                { error: "Failed to update notifications", details: error.message },
                { status: 500 }
            );
        }

        console.log("✅ [NOTIFICATIONS] Marked", data?.length || 0, "notifications as read");

        return Response.json({
            success: true,
            count: data?.length || 0,
            message: `Marked ${data?.length || 0} notification(s) as read`,
        });
    } catch (err: any) {
        console.error("❌ [NOTIFICATIONS] Error:", err);
        return Response.json(
            { error: err.message || "Internal server error" },
            { status: 500 }
        );
    }
});

// DELETE - Delete notifications
export const DELETE = withAuth(async (req: NextRequest, _params: any, user: any) => {
    console.log("🔔 [NOTIFICATIONS] DELETE /api/notifications/send-bulk - User:", user.id);

    try {
        const { searchParams } = new URL(req.url);
        const notificationId = searchParams.get("id");
        const deleteAll = searchParams.get("delete_all") === "true";

        let query = supabaseAdmin
            .from("notifications")
            .delete()
            .eq("user_id", user.id);

        if (deleteAll) {
            console.log("🗑️ [NOTIFICATIONS] Deleting all notifications");
        } else if (notificationId) {
            console.log("🗑️ [NOTIFICATIONS] Deleting notification:", notificationId);
            query = query.eq("id", notificationId);
        } else {
            return Response.json(
                { error: "Either id parameter or delete_all=true is required" },
                { status: 400 }
            );
        }

        const { data, error } = await query.select();

        if (error) {
            console.error("❌ [NOTIFICATIONS] Delete error:", error);
            return Response.json(
                { error: "Failed to delete notifications", details: error.message },
                { status: 500 }
            );
        }

        console.log("✅ [NOTIFICATIONS] Deleted", data?.length || 0, "notifications");

        return Response.json({
            success: true,
            count: data?.length || 0,
            message: `Deleted ${data?.length || 0} notification(s)`,
        });
    } catch (err: any) {
        console.error("❌ [NOTIFICATIONS] Error:", err);
        return Response.json(
            { error: err.message || "Internal server error" },
            { status: 500 }
        );
    }
});