import { Router, Request, Response } from "express";
import { supabase } from "../lib/supabase"; // or pg client

const router = Router();

/**
 * GET /notifications/:user_id
 */
router.get("/:user_id", async (req: Request, res: Response) => {
  const { user_id } = req.params;

  try {
    // 1️⃣ Fetch notifications
    const { data: notifications, error } = await supabase
      .from("notifications")
      .select("*")
      .eq("user_id", user_id)
      .order("created_at", { ascending: false });

    if (error) throw error;

    // 2️⃣ Collect booking IDs
    const bookingIds = notifications
      .filter(n => n.type === "booking" && n.metadata?.booking_id)
      .map(n => n.metadata.booking_id);

    // 3️⃣ Fetch bookings (only if needed)
    let bookingsMap: Record<string, any> = {};

    if (bookingIds.length > 0) {
      const { data: bookings, error: bookingError } = await supabase
        .from("bookings")
        .select("*")
        .in("id", bookingIds);

      if (bookingError) throw bookingError;

      bookings.forEach(b => {
        bookingsMap[b.id] = b;
      });
    }

    // 4️⃣ Attach booking data
    const enrichedNotifications = notifications.map(n => {
      if (n.type === "booking" && n.metadata?.booking_id) {
        return {
          ...n,
          booking: bookingsMap[n.metadata.booking_id] || null
        };
      }

      return n;
    });

    return res.status(200).json({
      success: true,
      data: enrichedNotifications
    });

  } catch (err: any) {
    console.error("Notification fetch error:", err);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch notifications"
    });
  }
});

export default router;