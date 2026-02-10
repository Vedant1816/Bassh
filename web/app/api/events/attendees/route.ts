import { withAuth } from "@/app/services/protected";
import supabaseAdmin from "@/app/services/supabase-admin";

export const GET = withAuth(async (req: Request, user: any) => {
  try {
    const { searchParams } = new URL(req.url);
    const eventId = searchParams.get("eventId");

    if (!eventId) {
      return Response.json(
        { error: "eventId is required" },
        { status: 400 }
      );
    }

    // 1️⃣ Ensure event belongs to this club
    const { data: event, error: eventError } = await supabaseAdmin
      .from("events")
      .select("id")
      .eq("id", eventId)
      .eq("club_id", user.id)
      .single();

    if (eventError || !event) {
      return Response.json(
        { error: "Unauthorized or event not found" },
        { status: 403 }
      );
    }

    // 2️⃣ Fetch unique user_ids from confirmed bookings
    const { data: bookings, error: bookingError } = await supabaseAdmin
      .from("bookings")
      .select("user_id")
      .eq("event_id", eventId)
      .eq("booking_status", "confirmed");

    if (bookingError) {
      return Response.json(
        { error: bookingError.message },
        { status: 500 }
      );
    }

    // Deduplicate user IDs
    const uniqueUserIds = [
      ...new Set(bookings.map((b: any) => b.user_id)),
    ];

    if (uniqueUserIds.length === 0) {
      return Response.json(
        { count: 0, attendees: [] },
        { status: 200 }
      );
    }

    // 3️⃣ Fetch users
    const { data: users, error: userError } = await supabaseAdmin
      .from("users")
      .select("id, name")
      .in("id", uniqueUserIds);

    if (userError) {
      return Response.json(
        { error: userError.message },
        { status: 500 }
      );
    }

    return Response.json(
      {
        count: users.length,
        attendees: users,
      },
      { status: 200 }
    );

  } catch (err) {
    console.error(err);
    return Response.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
});
