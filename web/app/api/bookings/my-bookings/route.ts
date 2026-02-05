import { withAuth } from "@/app/services/protected";
import supabaseAdmin from "@/app/services/supabase-admin";

export const runtime = "nodejs";

export const GET = withAuth(async (_req: Request, _ctx: any, user: any) => {
  console.log("📋 [BOOKINGS] Get user bookings request");

  try {
    const userId = user.id;

    // Fetch confirmed and cancelled only (exclude pending); sort by created_at newest first
    const { data: bookings, error } = await supabaseAdmin
      .from("bookings")
      .select(`
        id,
        event_id,
        booking_date,
        booking_time,
        booking_status,
        entry_status,
        entered_at,
        total_amount,
        participants,
        qr_code,
        created_at,
        events!bookings_event_id_fkey (
          name,
          event_date,
          start_time,
          banner_image_url,
          clubs!events_club_id_fkey (
            club_name,
            address_text
          )
        )
      `)
      .eq("user_id", userId)
      .in("booking_status", ["confirmed", "cancelled"])
      .order("created_at", { ascending: false });

    if (error) {
      console.error("❌ [BOOKINGS] Failed to fetch bookings:", error);
      return Response.json(
        { error: "Failed to fetch bookings" },
        { status: 500 }
      );
    }

    console.log(`✅ [BOOKINGS] Found ${bookings?.length || 0} bookings`);

    return Response.json({
      bookings: bookings || [],
      total: bookings?.length || 0,
    });

  } catch (err: any) {
    console.error("❌ [BOOKINGS] Get bookings error:", err);
    return Response.json(
      { error: err.message || "Internal server error" },
      { status: 500 }
    );
  }
});