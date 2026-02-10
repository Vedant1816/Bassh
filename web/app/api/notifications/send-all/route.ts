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

      // Enrich booking notifications with booking data
      const enrichedNotifications = await Promise.all(
        (notifications || []).map(async (notification: any) => {
          // Check if it's a booking notification with booking_id in metadata
          if (
            (notification.type === "booking" || notification.type === "booking_confirmation") &&
            notification.metadata?.booking_id
          ) {
            try {
              // First, fetch the basic booking to determine type
              const { data: basicBooking } = await supabaseAdmin
                .from("bookings")
                .select(`
                  id,
                  event_id,
                  club_id,
                  qr_code,
                  booking_status,
                  booking_date,
                  booking_time,
                  total_amount,
                  participants,
                  created_at
                `)
                .eq("id", notification.metadata.booking_id)
                .single();

              if (!basicBooking) {
                return notification;
              }

              // Determine booking type based on event_id and club_id
              const booking_type = basicBooking.event_id
                ? "event"
                : (basicBooking.club_id ? "club" : "unknown");

              if (booking_type === "event" && basicBooking.event_id) {
                // EVENT BOOKING: Fetch event + club from event
                const { data: eventData } = await supabaseAdmin
                  .from("events")
                  .select(`
                    id,
                    name,
                    event_date,
                    start_time,
                    clubs!events_club_id_fkey (
                      id,
                      club_name,
                      address_text
                    )
                  `)
                  .eq("id", basicBooking.event_id)
                  .single();

                if (eventData) {
                  const club = eventData.clubs as any;
                  return {
                    ...notification,
                    booking: {
                      id: basicBooking.id,
                      qr_code: basicBooking.qr_code,
                      booking_type: "event",
                      event_name: eventData.name || notification.metadata?.event_name || "Event",
                      event_date: eventData.event_date || "",
                      event_time: eventData.start_time || "",
                      venue_name: club?.club_name || "",
                      venue_address: club?.address_text || "",
                      ticket_type: "General",
                      ticket_count: Array.isArray(basicBooking.participants) ? basicBooking.participants.length : 1,
                      total_price: basicBooking.total_amount || 0,
                      status: basicBooking.booking_status || "confirmed",
                      confirmation_code: basicBooking.id?.substring(0, 8)?.toUpperCase() || "",
                    },
                  };
                }
              } else if (booking_type === "club" && basicBooking.club_id) {
                // CLUB BOOKING: Fetch club directly
                const { data: clubData } = await supabaseAdmin
                  .from("clubs")
                  .select(`
                    id,
                    club_name,
                    address_text
                  `)
                  .eq("id", basicBooking.club_id)
                  .single();

                if (clubData) {
                  return {
                    ...notification,
                    booking: {
                      id: basicBooking.id,
                      qr_code: basicBooking.qr_code,
                      booking_type: "club",
                      event_name: clubData.club_name || "Club Entry", // Use club name as event_name for backward compat
                      club_name: clubData.club_name || "",
                      event_date: basicBooking.booking_date || "",
                      event_time: basicBooking.booking_time || "",
                      venue_name: clubData.club_name || "",
                      venue_address: clubData.address_text || "",
                      ticket_type: "Entry Pass",
                      ticket_count: Array.isArray(basicBooking.participants) ? basicBooking.participants.length : 1,
                      total_price: basicBooking.total_amount || 0,
                      status: basicBooking.booking_status || "confirmed",
                      confirmation_code: basicBooking.id?.substring(0, 8)?.toUpperCase() || "",
                    },
                  };
                }
              }
            } catch (err) {
              console.error("❌ [NOTIFICATIONS] Failed to enrich booking:", err);
            }
          }
          return notification;
        })
      );

      // Get unread count
      const { count: unreadCount } = await supabaseAdmin
        .from("notifications")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("is_read", false);

      return Response.json({
        success: true,
        notifications: enrichedNotifications,
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