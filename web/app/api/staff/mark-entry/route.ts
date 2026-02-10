import supabaseAdmin from "@/app/services/supabase-admin";
import { withAuth } from "@/app/services/protected";

export const runtime = "nodejs";

export const POST = withAuth(async (req: Request, _ctx: any, user: any) => {
  console.log("✅ [STAFF] Mark entry request received");
  console.log("👤 [STAFF] Authenticated user:", {
    id: user.id,
    email: user.email,
    role: user.role || "unknown"
  });

  try {
    const { booking_id, staff_id } = await req.json();

    if (!booking_id) {
      return Response.json(
        { error: "Booking ID is required" },
        { status: 400 }
      );
    }

    // Optional: Verify staff has permission to mark entry
    // You can check if staff belongs to the same club as the booking
    // if (user.role !== 'staff') {
    //   return Response.json({ error: "Unauthorized" }, { status: 403 });
    // }

    // First verify the booking is still valid
    const { data: checkBooking, error: checkError } = await supabaseAdmin
      .from("bookings")
      .select("id, booking_status, entry_status, qr_used, club_id")
      .eq("id", booking_id)
      .single();

    if (checkError || !checkBooking) {
      console.error("❌ [STAFF] Booking not found:", checkError);
      return Response.json(
        { error: "Booking not found" },
        { status: 404 }
      );
    }

    // Validation checks
    if (checkBooking.booking_status !== "confirmed") {
      return Response.json(
        { error: "Booking is not confirmed" },
        { status: 400 }
      );
    }

    if (checkBooking.entry_status === "entered" || checkBooking.qr_used === true) {
      return Response.json(
        { error: "Entry already marked for this booking" },
        { status: 400 }
      );
    }

    // Optional: Check if staff belongs to the same club
    // if (staff_id) {
    //   const { data: staff } = await supabaseAdmin
    //     .from("staff")
    //     .select("club_id")
    //     .eq("id", staff_id)
    //     .single();
    //   
    //   if (staff && staff.club_id !== checkBooking.club_id) {
    //     return Response.json(
    //       { error: "Unauthorized: Staff does not belong to this club" },
    //       { status: 403 }
    //     );
    //   }
    // }

    // Update both entry_status and qr_used flags
    const now = new Date().toISOString();
    const { data, error } = await supabaseAdmin
      .from("bookings")
      .update({
        entry_status: "entered",
        entered_at: now,
        qr_used: true,
        qr_used_at: now,
        updated_at: now,
      })
      .eq("id", booking_id)
      .eq("booking_status", "confirmed") // Safety check
      .eq("entry_status", "not_entered") // Prevent race conditions
      .eq("qr_used", false) // Prevent race conditions
      .select();

    if (error) {
      console.error("❌ [STAFF] Failed to mark entry:", error);
      return Response.json(
        { error: "Failed to mark entry: " + error.message },
        { status: 500 }
      );
    }

    if (!data || data.length === 0) {
      return Response.json(
        { error: "Booking already processed or not found" },
        { status: 400 }
      );
    }

    console.log("✅ [STAFF] Entry marked successfully for booking:", booking_id);

    return Response.json({
      success: true,
      message: "Entry marked successfully",
      timestamp: now,
      booking_id: booking_id,
    });
  } catch (err: any) {
    console.error("❌ [STAFF] Mark entry error:", err);
    return Response.json(
      { error: err.message || "Failed to mark entry" },
      { status: 500 }
    );
  }
});
