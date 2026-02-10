import supabaseAdmin from "@/app/services/supabase-admin";
import { withAuth } from "@/app/services/protected";

export const GET = withAuth(async (req: Request, user: { id: string }) => {
  try {
    const clubId = user.id;

    // ---- Calendar-safe dates ----
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);

    const yesterday = new Date(today);
    yesterday.setUTCDate(today.getUTCDate() - 1);

    const todayStr = today.toISOString().slice(0, 10);
    const yesterdayStr = yesterday.toISOString().slice(0, 10);

    // ---- Fetch ONLY confirmed bookings ----
    const { data, error } = await supabaseAdmin
      .from("bookings")
      .select("booking_date")
      .eq("club_id", clubId)
      .eq("booking_status", "confirmed")
      .in("booking_date", [todayStr, yesterdayStr]);

    if (error) throw error;

    // ---- Count bookings ----
    let bookingsToday = 0;
    let bookingsYesterday = 0;

    data.forEach((b) => {
      if (b.booking_date === todayStr) bookingsToday++;
      if (b.booking_date === yesterdayStr) bookingsYesterday++;
    });

    // ---- Percentage change ----
    const change =
      bookingsYesterday === 0
        ? 0
        : ((bookingsToday - bookingsYesterday) / bookingsYesterday) * 100;

    return Response.json({
      bookingsToday,
      bookingsYesterday,
      bookingsChange: Number(change.toFixed(2)),
    });
  } catch (err) {
    console.error(err);
    return new Response("Failed to fetch bookings summary", { status: 500 });
  }
});
