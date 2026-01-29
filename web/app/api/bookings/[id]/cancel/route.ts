import { withAuth } from "@/app/services/protected";
import supabaseAdmin from "@/app/services/supabase-admin";

export const runtime = "nodejs";

export const POST = withAuth(async (_req, params, userId) => {
  console.log("🚫 [BOOKING] Cancel booking request:", params.id);

  const { id } = params;

  try {
    // Fetch the booking to verify ownership and status
    const { data: booking, error: fetchError } = await supabaseAdmin
      .from("bookings")
      .select("user_id, booking_status, entry_status, entered_at")
      .eq("id", id)
      .single();

    if (fetchError || !booking) {
      console.error("❌ [BOOKING] Booking not found:", fetchError);
      return Response.json({ error: "Booking not found" }, { status: 404 });
    }

    // Verify ownership
    if (booking.user_id !== userId) {
      console.error("❌ [BOOKING] Unauthorized cancellation attempt");
      return Response.json({ error: "Unauthorized" }, { status: 403 });
    }

    // Check if already entered
    if (booking.entry_status === "entered") {
      console.error("❌ [BOOKING] Cannot cancel - already entered");
      return Response.json(
        { error: "Cannot cancel booking after entry" },
        { status: 400 }
      );
    }

    // Check if already cancelled
    if (booking.booking_status === "cancelled") {
      console.error("❌ [BOOKING] Already cancelled");
      return Response.json(
        { error: "Booking is already cancelled" },
        { status: 400 }
      );
    }

    // Update booking status to cancelled
    const { data: updatedBooking, error: updateError } = await supabaseAdmin
      .from("bookings")
      .update({
        booking_status: "cancelled",
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select()
      .single();

    if (updateError) {
      console.error("❌ [BOOKING] Failed to cancel booking:", updateError);
      return Response.json(
        { error: "Failed to cancel booking" },
        { status: 500 }
      );
    }

    console.log("✅ [BOOKING] Booking cancelled successfully");

    return Response.json({
      success: true,
      message: "Booking cancelled successfully",
      booking: updatedBooking,
    });
  } catch (err: any) {
    console.error("❌ [BOOKING] Cancel booking error:", err);
    return Response.json(
      { error: err.message || "Internal server error" },
      { status: 500 }
    );
  }
});