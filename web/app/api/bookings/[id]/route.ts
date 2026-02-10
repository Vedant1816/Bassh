import { withAuth } from "@/app/services/protected";
import supabaseAdmin from "@/app/services/supabase-admin";

export const runtime = "nodejs";

export const GET = withAuth(async (_req: Request, params: any, user: any) => {
  const bookingId = params.id;
  console.log("📋 [BOOKINGS] Get booking detail request for booking:", bookingId);

  try {
    // Fetch the specific booking
    const { data: booking, error } = await supabaseAdmin
      .from("bookings")
      .select(`
        id,
        event_id,
        booking_date,
        booking_time,
        booking_status,
        entry_status,
        entered_at,
        qr_used,
        qr_used_at,
        total_amount,
        money_saved,
        participants,
        qr_code,
        created_at,
        events!bookings_event_id_fkey (
          id,
          name,
          event_date,
          start_time,
          banner_image_url,
          dj_name,
          clubs!events_club_id_fkey (
            id,
            club_name,
            address_text
          )
        )
      `)
      .eq("id", bookingId)
      .eq("user_id", user.id)
      .single();

    if (error) {
      console.error("❌ [BOOKINGS] Failed to fetch booking:", error);
      return Response.json(
        { error: "Failed to fetch booking", details: error.message },
        { status: 500 }
      );
    }

    if (!booking) {
      return Response.json(
        { error: "Booking not found" },
        { status: 404 }
      );
    }

    console.log(`✅ [BOOKINGS] Found booking: ${booking.id}`);

    return Response.json({
      booking,
    });

  } catch (err: any) {
    console.error("❌ [BOOKINGS] Get booking error:", err);
    return Response.json(
      { error: err.message || "Internal server error" },
      { status: 500 }
    );
  }
});