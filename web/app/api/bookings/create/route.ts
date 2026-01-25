import { NextResponse } from "next/server";
import supabaseAdmin from "@/app/services/supabase-admin";
import { withAuth } from "@/app/services/protected";

export const runtime = "nodejs";

export const POST = withAuth(async (req, _ctx, user) => {
  console.log("🔄 [BACKEND] POST /api/bookings/create - Request received");
  console.log("🔄 [BACKEND] User ID:", user.id);
  
  try {
    const body = await req.json();
    const { event_id, participants, total_amount } = body;
    
    console.log("🔄 [BACKEND] Request body:", {
      event_id,
      participants_count: participants?.length || 0,
      total_amount,
    });

    if (!event_id) {
      console.error("❌ [BACKEND] Missing event_id");
      return NextResponse.json(
        { error: "event_id is required" },
        { status: 400 }
      );
    }

    /* ---------------- GET EVENT + CLUB ---------------- */
    console.log("🔍 [BACKEND] Fetching event:", event_id);
    const { data: event, error: eventError } = await supabaseAdmin
      .from("events")
      .select("id, club_id, event_date, start_time")
      .eq("id", event_id)
      .single();

    if (eventError || !event) {
      console.error("❌ [BACKEND] Event not found:", eventError);
      return NextResponse.json(
        { error: "Event not found" },
        { status: 404 }
      );
    }

    if (!event.club_id) {
      console.error("❌ [BACKEND] Event has no club_id");
      return NextResponse.json(
        { error: "Event is not associated with a club" },
        { status: 400 }
      );
    }

    console.log("✅ [BACKEND] Event found:", { 
      event_id: event.id, 
      club_id: event.club_id,
      event_date: event.event_date,
      start_time: event.start_time,
    });

    /* ---------------- DATE & TIME ---------------- */
    // Use event date/time, not current time
    const booking_date = event.event_date;
    const booking_time = event.start_time;

    console.log("📅 [BACKEND] Booking date/time:", { booking_date, booking_time });

    /* ---------------- CREATE BOOKING ---------------- */
    console.log("📝 [BACKEND] Creating booking...");
    const { data: booking, error: bookingError } = await supabaseAdmin
      .from("bookings")
      .insert({
        user_id: user.id,
        event_id,
        club_id: event.club_id,
        participants,
        total_amount,
        booking_date,
        booking_time,
        booking_status: "pending",
      })
      .select("id")
      .single();

    if (bookingError) {
      console.error("❌ [BACKEND] Booking insert error:", bookingError);
      return NextResponse.json(
        { error: bookingError.message },
        { status: 500 }
      );
    }

    console.log("✅ [BACKEND] Booking created successfully:", booking.id);
    return NextResponse.json({
      booking_id: booking.id,
    });
  } catch (err: any) {
    console.error("❌ [BACKEND] Create booking error:", err);
    console.error("❌ [BACKEND] Error stack:", err.stack);
    return NextResponse.json(
      { error: err.message || "Internal server error" },
      { status: 500 }
    );
  }
});