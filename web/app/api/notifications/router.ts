import { Router, Request, Response } from "express";
import { supabase } from "../lib/supabase";

const router = Router();

// Helper function to format time from "HH:MM:SS" to "H:MM AM/PM"
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

// Helper function to format date for display
function formatDateForBooking(dateString: string | null): string {
  if (!dateString) return new Date().toISOString().split("T")[0];
  
  // If it's already a date string (YYYY-MM-DD), return as-is
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
    return dateString;
  }
  
  // Otherwise parse and format
  try {
    return new Date(dateString).toISOString().split("T")[0];
  } catch {
    return new Date().toISOString().split("T")[0];
  }
}

/**
 * GET /api/notifications/send-all
 * Fetches all notifications for authenticated user with enriched booking data
 */
router.get("/send-all", async (req: Request, res: Response) => {
  try {
    // Get user_id from auth header/token (adjust based on your auth setup)
    const user_id = (req as any).user?.id || req.headers["x-user-id"];

    if (!user_id) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    // 1️⃣ Fetch all notifications for this user
    const { data: notifications, error: notifError } = await supabase
      .from("notifications")
      .select("*")
      .eq("user_id", user_id)
      .order("created_at", { ascending: false });

    if (notifError) throw notifError;

    if (!notifications || notifications.length === 0) {
      return res.status(200).json({
        success: true,
        notifications: [],
        unreadCount: 0,
      });
    }

    // 2️⃣ Collect booking IDs from booking-related notifications
    const bookingIds = notifications
      .filter(
        (n) =>
          (n.type === "booking" || n.type === "booking_confirmation") &&
          n.metadata?.booking_id
      )
      .map((n) => n.metadata.booking_id);

    // 3️⃣ Fetch and enrich booking data if we have booking IDs
    let bookingsMap: Record<string, any> = {};

    if (bookingIds.length > 0) {
      // Fetch bookings with joined event and club data
      const { data: bookings, error: bookingError } = await supabase
        .from("bookings")
        .select(
          `
          id,
          user_id,
          event_id,
          club_id,
          bookmark_type,
          created_at
        `
        )
        .in("id", bookingIds);

      if (bookingError) throw bookingError;

      if (bookings && bookings.length > 0) {
        // Get unique event IDs and club IDs
        const eventIds = [
          ...new Set(bookings.filter((b) => b.event_id).map((b) => b.event_id)),
        ];
        const clubIds = [
          ...new Set(bookings.filter((b) => b.club_id).map((b) => b.club_id)),
        ];

        // Fetch events
        let eventsMap: Record<string, any> = {};
        if (eventIds.length > 0) {
          const { data: events } = await supabase
            .from("events")
            .select("id, name, event_date, start_time, club_id, banner_image_url")
            .in("id", eventIds);

          events?.forEach((e) => {
            eventsMap[e.id] = e;
          });

          // Add club IDs from events to our club fetch list
          events?.forEach((e) => {
            if (e.club_id && !clubIds.includes(e.club_id)) {
              clubIds.push(e.club_id);
            }
          });
        }

        // Fetch clubs
        let clubsMap: Record<string, any> = {};
        if (clubIds.length > 0) {
          const { data: clubs } = await supabase
            .from("clubs")
            .select("id, club_name, address_text, club_logo")
            .in("id", clubIds);

          clubs?.forEach((c) => {
            clubsMap[c.id] = c;
          });
        }

        // Fetch transactions for these bookings
        let transactionsMap: Record<string, any> = {};
        const { data: transactions } = await supabase
          .from("transactions")
          .select("*")
          .in("booking_id", bookingIds);

        transactions?.forEach((tx) => {
          if (tx.booking_id) {
            transactionsMap[tx.booking_id] = tx;
          }
        });

        // Fetch ticket pricing for events
        let ticketPricingMap: Record<string, any> = {};
        if (eventIds.length > 0) {
          const { data: ticketPricing } = await supabase
            .from("event_ticket_pricing")
            .select("*")
            .in("event_id", eventIds);

          ticketPricing?.forEach((tp) => {
            // Store first pricing found per event
            if (!ticketPricingMap[tp.event_id]) {
              ticketPricingMap[tp.event_id] = tp;
            }
          });
        }

        // 4️⃣ Build normalized booking objects
        bookings.forEach((booking) => {
          const event = booking.event_id ? eventsMap[booking.event_id] : null;
          const club = booking.club_id
            ? clubsMap[booking.club_id]
            : event?.club_id
            ? clubsMap[event.club_id]
            : null;
          const transaction = transactionsMap[booking.id];
          const ticketInfo = event ? ticketPricingMap[event.id] : null;

          const isEventBooking = !!event;

          // Generate confirmation code from booking ID
          const confirmationCode = booking.id.substring(0, 8).toUpperCase();

          bookingsMap[booking.id] = {
            id: booking.id,
            qr_code: booking.id, // QR contains booking ID for scanning
            confirmation_code: confirmationCode,

            // Event/Booking name
            event_name: isEventBooking
              ? event.name
              : club?.club_name || "Club Visit",

            // Date and time
            event_date: isEventBooking
              ? formatDateForBooking(event.event_date)
              : formatDateForBooking(booking.created_at),
            event_time: isEventBooking
              ? formatTime(event.start_time)
              : "See confirmation",

            // Venue details
            venue_name: club?.club_name || "Venue",
            venue_address: club?.address_text || "",

            // Ticket details
            ticket_type:
              booking.bookmark_type || ticketInfo?.label || "General Entry",
            ticket_count: 1, // Default to 1, adjust if you store quantity elsewhere
            total_price: transaction?.amount || 0,

            // Status
            status: transaction?.status || "confirmed",
          };
        });
      }
    }

    // 5️⃣ Enrich notifications with booking data
    const enrichedNotifications = notifications.map((notification) => {
      if (
        (notification.type === "booking" ||
          notification.type === "booking_confirmation") &&
        notification.metadata?.booking_id
      ) {
        return {
          ...notification,
          booking: bookingsMap[notification.metadata.booking_id] || null,
        };
      }
      return notification;
    });

    // 6️⃣ Calculate unread count
    const unreadCount = notifications.filter((n) => !n.is_read).length;

    return res.status(200).json({
      success: true,
      notifications: enrichedNotifications,
      unreadCount,
    });
  } catch (err: any) {
    console.error("❌ Notification fetch error:", err);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch notifications",
      error: err.message,
    });
  }
});

/**
 * PATCH /api/notifications/send-all
 * Mark all notifications as read
 */
router.patch("/send-all", async (req: Request, res: Response) => {
  try {
    const user_id = (req as any).user?.id || req.headers["x-user-id"];

    if (!user_id) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    const { markAllRead } = req.body;

    if (markAllRead) {
      const { error } = await supabase
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

    return res.status(200).json({
      success: true,
      message: "All notifications marked as read",
    });
  } catch (err: any) {
    console.error("❌ Mark all read error:", err);
    return res.status(500).json({
      success: false,
      message: "Failed to mark notifications as read",
      error: err.message,
    });
  }
});

export default router;