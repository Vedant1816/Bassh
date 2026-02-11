// File: app/api/notifications/send-all/route.ts

import { NextRequest, NextResponse } from "next/server";
import supabaseAdmin from "@/app/services/supabase-admin";

// Helper: format time from "HH:MM:SS" to "H:MM AM/PM"
function formatTime(timeString: string | null): string {
  if (!timeString) return "TBD";

  try {
    const [hours, minutes] = timeString.split(":");
    const hour = parseInt(hours, 10);
    const ampm = hour >= 12 ? "PM" : "AM";
    const hour12 = hour % 12 || 12;
    return `${hour12}:${minutes} ${ampm}`;
  } catch {
    return timeString;
  }
}

// Helper: normalize date
function formatDateForBooking(dateString: string | null): string {
  if (!dateString) return new Date().toISOString().split("T")[0];

  if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
    return dateString;
  }

  try {
    return new Date(dateString).toISOString().split("T")[0];
  } catch {
    return new Date().toISOString().split("T")[0];
  }
}

/**
 * GET /api/notifications/send-all
 */
export async function GET(request: NextRequest) {
  try {
    const user_id = request.headers.get("x-user-id");

    if (!user_id) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );
    }

    const { data: notifications, error: notifError } =
      await supabaseAdmin
        .from("notifications")
        .select("*")
        .eq("user_id", user_id)
        .order("created_at", { ascending: false });

    if (notifError) throw notifError;

    if (!notifications || notifications.length === 0) {
      return NextResponse.json({
        success: true,
        notifications: [],
        unreadCount: 0,
      });
    }

    const bookingIds = notifications
      .filter(
        (n: any) =>
          (n.type === "booking" || n.type === "booking_confirmation") &&
          n.metadata?.booking_id
      )
      .map((n: any) => n.metadata.booking_id);

    let bookingsMap: Record<string, any> = {};

    if (bookingIds.length > 0) {
      const { data: bookings, error: bookingError } =
        await supabaseAdmin
          .from("bookings")
          .select("id,user_id,event_id,club_id,bookmark_type,created_at")
          .in("id", bookingIds);

      if (bookingError) throw bookingError;

      if (bookings && bookings.length > 0) {
        const eventIds = [
          ...new Set(
            bookings.filter((b: any) => b.event_id).map((b: any) => b.event_id)
          ),
        ];

        const clubIds = [
          ...new Set(
            bookings.filter((b: any) => b.club_id).map((b: any) => b.club_id)
          ),
        ];

        let eventsMap: Record<string, any> = {};
        if (eventIds.length > 0) {
          const { data: events } = await supabaseAdmin
            .from("events")
            .select(
              "id,name,event_date,start_time,club_id,banner_image_url"
            )
            .in("id", eventIds);

          events?.forEach((e: any) => {
            eventsMap[e.id] = e;
            if (e.club_id && !clubIds.includes(e.club_id)) {
              clubIds.push(e.club_id);
            }
          });
        }

        let clubsMap: Record<string, any> = {};
        if (clubIds.length > 0) {
          const { data: clubs } = await supabaseAdmin
            .from("clubs")
            .select("id,club_name,address_text,club_logo")
            .in("id", clubIds);

          clubs?.forEach((c: any) => {
            clubsMap[c.id] = c;
          });
        }

        let transactionsMap: Record<string, any> = {};
        const { data: transactions } = await supabaseAdmin
          .from("transactions")
          .select("*")
          .in("booking_id", bookingIds);

        transactions?.forEach((tx: any) => {
          if (tx.booking_id) {
            transactionsMap[tx.booking_id] = tx;
          }
        });

        let ticketPricingMap: Record<string, any> = {};
        if (eventIds.length > 0) {
          const { data: ticketPricing } =
            await supabaseAdmin
              .from("event_ticket_pricing")
              .select("*")
              .in("event_id", eventIds);

          ticketPricing?.forEach((tp: any) => {
            if (!ticketPricingMap[tp.event_id]) {
              ticketPricingMap[tp.event_id] = tp;
            }
          });
        }

        bookings.forEach((booking: any) => {
          const event = booking.event_id
            ? eventsMap[booking.event_id]
            : null;

          const club =
            booking.club_id
              ? clubsMap[booking.club_id]
              : event?.club_id
              ? clubsMap[event.club_id]
              : null;

          const transaction = transactionsMap[booking.id];
          const ticketInfo = event
            ? ticketPricingMap[event.id]
            : null;

          const confirmationCode = booking.id
            .substring(0, 8)
            .toUpperCase();

          bookingsMap[booking.id] = {
            id: booking.id,
            qr_code: booking.id,
            confirmation_code: confirmationCode,
            event_name: event
              ? event.name
              : club?.club_name || "Club Visit",
            event_date: event
              ? formatDateForBooking(event.event_date)
              : formatDateForBooking(booking.created_at),
            event_time: event
              ? formatTime(event.start_time)
              : "See confirmation",
            venue_name: club?.club_name || "Venue",
            venue_address: club?.address_text || "",
            ticket_type:
              booking.bookmark_type ||
              ticketInfo?.label ||
              "General Entry",
            ticket_count: 1,
            total_price: transaction?.amount || 0,
            status: transaction?.status || "confirmed",
          };
        });
      }
    }

    const enrichedNotifications = notifications.map(
      (notification: any) => {
        if (
          (notification.type === "booking" ||
            notification.type ===
              "booking_confirmation") &&
          notification.metadata?.booking_id
        ) {
          return {
            ...notification,
            booking:
              bookingsMap[
                notification.metadata.booking_id
              ] || null,
          };
        }
        return notification;
      }
    );

    const unreadCount = notifications.filter(
      (n: any) => !n.is_read
    ).length;

    return NextResponse.json({
      success: true,
      notifications: enrichedNotifications,
      unreadCount,
    });
  } catch (err: any) {
    console.error("❌ Notification fetch error:", err);
    return NextResponse.json(
      {
        success: false,
        message: "Failed to fetch notifications",
        error: err.message,
      },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/notifications/send-all
 */
export async function PATCH(request: NextRequest) {
  try {
    const user_id = request.headers.get("x-user-id");

    if (!user_id) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { markAllRead } = body;

    if (markAllRead) {
      const { error } = await supabaseAdmin
        .from("notifications")
        .update({
          is_read: true,
          read_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", user_id)
        .eq("is_read", false);

      if (error) throw error;
    }

    return NextResponse.json({
      success: true,
      message: "All notifications marked as read",
    });
  } catch (err: any) {
    console.error("❌ Mark all read error:", err);
    return NextResponse.json(
      {
        success: false,
        message: "Failed to mark notifications as read",
        error: err.message,
      },
      { status: 500 }
    );
  }
}
