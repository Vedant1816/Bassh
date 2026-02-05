import supabaseAdmin from "@/app/services/supabase-admin";
import { withAuth } from "@/app/services/protected";

export const runtime = "nodejs";

export const POST = withAuth(async (req: Request, _ctx: any, user: any) => {
  console.log("🔄 [BACKEND] POST /api/bookings/table/create - Request received");
  
  try {
    const body = await req.json();
    const {
      club_id,
      booking_date,
      total_amount,
      participants,
    } = body;

    console.log("🔄 [BACKEND] Table booking data:", {
      club_id,
      booking_date,
      total_amount,
      participant_count: participants?.length,
    });

    // ================= VALIDATE INPUT =================
    if (!club_id || !booking_date || !total_amount || !participants || participants.length === 0) {
      console.error("❌ [BACKEND] Missing required fields");
      return Response.json(
        { error: "Missing required booking fields" },
        { status: 400 }
      );
    }

    // Validate participants
    const invalidParticipants = participants.filter(
      (p: any) => !p.name || !p.gender || !p.age
    );

    if (invalidParticipants.length > 0) {
      console.error("❌ [BACKEND] Invalid participant data");
      return Response.json(
        { error: "All participants must have name, gender, and age" },
        { status: 400 }
      );
    }

    // ================= VERIFY CLUB EXISTS =================
    console.log("🔍 [BACKEND] Verifying club exists:", club_id);
    const { data: club, error: clubError } = await supabaseAdmin
      .from("clubs")
      .select("id, club_name, address_text")
      .eq("id", club_id)
      .single();

    if (clubError || !club) {
      console.error("❌ [BACKEND] Club not found:", clubError?.message);
      return Response.json(
        { error: "Club not found" },
        { status: 404 }
      );
    }

    console.log("✅ [BACKEND] Club found:", club.club_name);

    // ================= CREATE BOOKING =================
    console.log("💾 [BACKEND] Creating table booking...");

    const bookingData = {
      user_id: user.id,
      club_id: club_id,
      event_id: null, // Table bookings don't have events
      participants: participants,
      total_amount: total_amount,
      booking_date: booking_date,
      booking_time: "00:00:00", // Required by DB; table bookings have no specific time
      booking_status: "pending",
      entry_status: "not_entered",
      qr_used: false,
    };

    const { data: booking, error: bookingError } = await supabaseAdmin
      .from("bookings")
      .insert(bookingData)
      .select()
      .single();

    if (bookingError) {
      console.error("❌ [BACKEND] Failed to create booking:", bookingError.message);
      console.error("❌ [BACKEND] Error details:", bookingError.details);
      return Response.json(
        { error: "Failed to create booking", details: bookingError.message },
        { status: 500 }
      );
    }

    console.log("✅ [BACKEND] Table booking created successfully:", booking.id);

    return Response.json({
      success: true,
      booking_id: booking.id,
      message: "Table booking created successfully",
    });
  } catch (err: any) {
    console.error("❌ [BACKEND] Table booking creation error:", err.message);
    console.error("❌ [BACKEND] Error stack:", err.stack);
    return Response.json(
      { error: err.message || "Failed to create table booking" },
      { status: 500 }
    );
  }
});