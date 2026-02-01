import { withAuth } from "@/app/services/protected";
import supabaseAdmin from "@/app/services/supabase-admin";

export const runtime = "nodejs";

export const POST = withAuth(async (_req, params, user) => {
  // withAuth passes (req, resolvedParams, userObject)
  const id = params?.id;
  const userId = user?.id;

  console.log("🚫 [BOOKING] Cancel booking request:", id);

  // Validate booking id
  if (!id) {
    return Response.json({ error: "Booking ID required" }, { status: 400 });
  }

  try {
    // Fetch booking
    const { data: booking, error: fetchError } = await supabaseAdmin
      .from("bookings")
      .select("user_id, booking_status, entry_status")
      .eq("id", id)
      .maybeSingle();

    if (fetchError) {
      console.error("❌ [BOOKING] Fetch error:", fetchError);
      return Response.json({ error: "Failed to fetch booking" }, { status: 500 });
    }

    if (!booking) {
      return Response.json({ error: "Booking not found" }, { status: 404 });
    }

    // Ownership check (user is full Supabase user object; compare to user.id)
    if (userId && booking.user_id !== userId) {
      return Response.json({ error: "Unauthorized" }, { status: 403 });
    }

    // Already entered → cannot cancel
    if (booking.entry_status === "entered") {
      return Response.json(
        { error: "Cannot cancel booking after entry" },
        { status: 400 }
      );
    }

    // Already cancelled
    if (booking.booking_status === "cancelled") {
      return Response.json(
        { error: "Booking already cancelled" },
        { status: 400 }
      );
    }

    // Only pending or confirmed can be cancelled
    if (!["pending", "confirmed"].includes(booking.booking_status)) {
      return Response.json(
        { error: "Invalid booking state" },
        { status: 400 }
      );
    }

    // Update booking
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
      console.error("❌ [BOOKING] Update error:", updateError);
      return Response.json({ error: "Failed to cancel booking" }, { status: 500 });
    }

    console.log("✅ [BOOKING] Booking cancelled:", id);

    return Response.json({
      success: true,
      message: "Booking cancelled successfully",
      booking: updatedBooking,
    });

  } catch (err: any) {
    console.error("❌ [BOOKING] Unexpected error:", err);
    return Response.json(
      { error: err.message || "Internal server error" },
      { status: 500 }
    );
  }
});