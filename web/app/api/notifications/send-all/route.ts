import { NextRequest } from "next/server";
import { withAuth } from "@/app/services/protected";
import supabaseAdmin from "@/app/services/supabase-admin";

export const runtime = "nodejs";

// GET - Fetch user's notifications
export const GET = withAuth(
  async (req: Request, _params: {}, user: any) => {
    try {
      const url = new URL(req.url);
      const limit = parseInt(url.searchParams.get("limit") || "20");
      const offset = parseInt(url.searchParams.get("offset") || "0");
      const unreadOnly = url.searchParams.get("unread") === "true";

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
          { error: "Failed to fetch notifications" },
          { status: 500 }
        );
      }

      // Get unread count
      const { count: unreadCount } = await supabaseAdmin
        .from("notifications")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("is_read", false);

      return Response.json({
        success: true,
        notifications: notifications || [],
        total: count || 0,
        unreadCount: unreadCount || 0,
        limit,
        offset,
      });
    } catch (err: any) {
      console.error("❌ [NOTIFICATIONS] Error:", err.message);
      return Response.json(
        { error: err.message || "Internal server error" },
        { status: 500 }
      );
    }
  }
);

// PATCH - Mark notifications as read
export const PATCH = withAuth(
  async (req: Request, _params: {}, user: any) => {
    try {
      const body = await req.json();
      const { notificationIds, markAllRead } = body;

      if (markAllRead) {
        // Mark all notifications as read
        const { data, error } = await supabaseAdmin
          .from("notifications")
          .update({ is_read: true, read_at: new Date().toISOString() })
          .eq("user_id", user.id)
          .eq("is_read", false)
          .select();

        if (error) {
          console.error("❌ [NOTIFICATIONS] Update error:", error);
          return Response.json(
            { error: "Failed to mark notifications as read" },
            { status: 500 }
          );
        }

        return Response.json({
          success: true,
          message: "All notifications marked as read",
          count: data?.length || 0,
        });
      }

      if (!notificationIds || !Array.isArray(notificationIds) || notificationIds.length === 0) {
        return Response.json(
          { error: "notificationIds array or markAllRead is required" },
          { status: 400 }
        );
      }

      // Mark specific notifications as read
      const { data, error } = await supabaseAdmin
        .from("notifications")
        .update({ is_read: true, read_at: new Date().toISOString() })
        .eq("user_id", user.id)
        .in("id", notificationIds)
        .select();

      if (error) {
        console.error("❌ [NOTIFICATIONS] Update error:", error);
        return Response.json(
          { error: "Failed to mark notifications as read" },
          { status: 500 }
        );
      }

      return Response.json({
        success: true,
        message: "Notifications marked as read",
        count: data?.length || 0,
      });
    } catch (err: any) {
      console.error("❌ [NOTIFICATIONS] Error:", err.message);
      return Response.json(
        { error: err.message || "Internal server error" },
        { status: 500 }
      );
    }
  }
);

// DELETE - Delete notifications
export const DELETE = withAuth(
  async (req: Request, _params: {}, user: any) => {
    try {
      const url = new URL(req.url);
      const notificationId = url.searchParams.get("id");
      const deleteAll = url.searchParams.get("all") === "true";

      if (deleteAll) {
        // Delete all notifications for user
        const { error } = await supabaseAdmin
          .from("notifications")
          .delete()
          .eq("user_id", user.id);

        if (error) {
          console.error("❌ [NOTIFICATIONS] Delete error:", error);
          return Response.json(
            { error: "Failed to delete notifications" },
            { status: 500 }
          );
        }

        return Response.json({
          success: true,
          message: "All notifications deleted",
        });
      }

      if (!notificationId) {
        return Response.json(
          { error: "Notification id or all=true is required" },
          { status: 400 }
        );
      }

      // Delete specific notification
      const { error } = await supabaseAdmin
        .from("notifications")
        .delete()
        .eq("user_id", user.id)
        .eq("id", notificationId);

      if (error) {
        console.error("❌ [NOTIFICATIONS] Delete error:", error);
        return Response.json(
          { error: "Failed to delete notification" },
          { status: 500 }
        );
      }

      return Response.json({
        success: true,
        message: "Notification deleted",
      });
    } catch (err: any) {
      console.error("❌ [NOTIFICATIONS] Error:", err.message);
      return Response.json(
        { error: err.message || "Internal server error" },
        { status: 500 }
      );
    }
  }
);