import { withAuth } from "@/app/services/protected";
import supabaseAdmin from "@/app/services/supabase-admin";

export const runtime = "nodejs";

/**
 * POST - Send notification to multiple users
 */
export async function POST(req: Request) {
  console.log("🔔 [NOTIFICATIONS] POST /api/notifications/send-bulk");

  try {
    const body = await req.json();
    const { usernames, title, message, type = "general", metadata = {} } = body;

    if (!usernames || !Array.isArray(usernames) || usernames.length === 0) {
      return Response.json(
        { error: "usernames array is required" },
        { status: 400 }
      );
    }

    if (!title || !message) {
      return Response.json(
        { error: "title and message are required" },
        { status: 400 }
      );
    }

    const orConditions: string[] = [];

    usernames.forEach((name: string) => {
      const trimmed = name.trim().toLowerCase();
      if (trimmed) {
        orConditions.push(`username.ilike.${trimmed}`);
        if (trimmed.includes("@")) {
          orConditions.push(`email.ilike.${trimmed}`);
        }
      }
    });

    if (orConditions.length === 0) {
      return Response.json(
        { error: "No valid usernames provided" },
        { status: 400 }
      );
    }

    const { data: users, error: usersError } = await supabaseAdmin
      .from("customers")
      .select("id,email,username")
      .or(orConditions.join(","));

    if (usersError) {
      return Response.json(
        { error: usersError.message },
        { status: 500 }
      );
    }

    if (!users || users.length === 0) {
      return Response.json({
        success: true,
        count: 0,
        message: "No matching users found",
      });
    }

    const notifications = users.map((user) => ({
      user_id: user.id,
      title,
      message,
      type,
      metadata,
      is_read: false,
      created_at: new Date().toISOString(),
    }));

    const { data: inserted, error: insertError } =
      await supabaseAdmin
        .from("notifications")
        .insert(notifications)
        .select();

    if (insertError) {
      return Response.json(
        { error: insertError.message },
        { status: 500 }
      );
    }

    return Response.json({
      success: true,
      count: inserted?.length || 0,
    });
  } catch (err: any) {
    return Response.json(
      { error: err.message || "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * GET - Authenticated user notifications
 */
export const GET = withAuth(
  async (req: Request, _params: any, user: any) => {
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

      const { data, error, count } = await query;

      if (error) {
        return Response.json(
          { error: error.message },
          { status: 500 }
        );
      }

      return Response.json({
        notifications: data || [],
        total: count || 0,
        limit,
        offset,
      });
    } catch (err: any) {
      return Response.json(
        { error: err.message },
        { status: 500 }
      );
    }
  }
);

/**
 * PATCH - Mark notifications as read
 */
export const PATCH = withAuth(
  async (req: Request, _params: any, user: any) => {
    try {
      const body = await req.json();
      const { notification_ids, mark_all = false } = body;

      let query = supabaseAdmin
        .from("notifications")
        .update({
          is_read: true,
          read_at: new Date().toISOString(),
        })
        .eq("user_id", user.id);

      if (mark_all) {
        // do nothing extra
      } else if (notification_ids && Array.isArray(notification_ids)) {
        query = query.in("id", notification_ids);
      } else {
        return Response.json(
          {
            error:
              "Either notification_ids array or mark_all=true is required",
          },
          { status: 400 }
        );
      }

      const { data, error } = await query.select();

      if (error) {
        return Response.json(
          { error: error.message },
          { status: 500 }
        );
      }

      return Response.json({
        success: true,
        count: data?.length || 0,
      });
    } catch (err: any) {
      return Response.json(
        { error: err.message },
        { status: 500 }
      );
    }
  }
);

/**
 * DELETE - Delete notifications
 */
export const DELETE = withAuth(
  async (req: Request, _params: any, user: any) => {
    try {
      const { searchParams } = new URL(req.url);
      const notificationId = searchParams.get("id");
      const deleteAll = searchParams.get("delete_all") === "true";

      let query = supabaseAdmin
        .from("notifications")
        .delete()
        .eq("user_id", user.id);

      if (deleteAll) {
        // delete all
      } else if (notificationId) {
        query = query.eq("id", notificationId);
      } else {
        return Response.json(
          {
            error:
              "Either id parameter or delete_all=true is required",
          },
          { status: 400 }
        );
      }

      const { data, error } = await query.select();

      if (error) {
        return Response.json(
          { error: error.message },
          { status: 500 }
        );
      }

      return Response.json({
        success: true,
        count: data?.length || 0,
      });
    } catch (err: any) {
      return Response.json(
        { error: err.message },
        { status: 500 }
      );
    }
  }
);
