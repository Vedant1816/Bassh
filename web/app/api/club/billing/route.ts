import supabaseAdmin from "@/app/services/supabase-admin";
import { withAuth } from "@/app/services/protected";

export const GET = withAuth(async (req: Request, user: { id: string }) => {
  try {
    const clubId = user.id;
    const { searchParams } = new URL(req.url);

    /* ================= REQUIRED ================= */

    const category = searchParams.get("category"); // event | food
    if (!category || !["event", "food"].includes(category)) {
      return new Response("Invalid category", { status: 400 });
    }

    /* ================= OPTIONAL FILTERS ================= */

    const fromDate = searchParams.get("fromDate");
    const toDate = searchParams.get("toDate");
    const minAmount = searchParams.get("minAmount");
    const maxAmount = searchParams.get("maxAmount");
    const searchName = searchParams.get("search");

    const eventIdsParam = searchParams.get("eventIds"); // "1,2,3"
    const eventIds =
      eventIdsParam?.split(",").map((id) => id.trim()) ?? null;

    /* ================= SEARCH BY USER NAME ================= */

    let matchingUserIds: string[] | null = null;

    if (searchName) {
      const { data: users, error } = await supabaseAdmin
        .from("users")
        .select("id")
        .ilike("name", `%${searchName}%`);

      if (error) throw error;

      matchingUserIds = users.map((u) => u.id);

      if (matchingUserIds.length === 0) {
        return Response.json({
          success: true,
          count: 0,
          data: [],
        });
      }
    }

    /* ================= BASE QUERY ================= */

    let query = supabaseAdmin
      .from("transactions")
      .select(
        `
        id,
        user_id,
        amount,
        status,
        created_at,
        razorpay_payment_id,
        booking_id,
        event_id,
        users (
          name
        ),
        events!transactions_event_id_fkey (
          name
        )
        `
      )
      .eq("club_id", clubId)
      .order("created_at", { ascending: false });

    /* ================= CATEGORY FILTER ================= */

    if (category === "event") {
      query = query
        .not("booking_id", "is", null)
        .not("event_id", "is", null);
    } else {
      query = query.is("booking_id", null);
    }

    /* ================= EVENT FILTER ================= */

    if (eventIds && eventIds.length > 0) {
      query = query.in("event_id", eventIds);
    }

    /* ================= DATE FILTER ================= */

    if (fromDate) {
      query = query.gte("created_at", `${fromDate}T00:00:00.000Z`);
    }

    if (toDate) {
      query = query.lte("created_at", `${toDate}T23:59:59.999Z`);
    }

    /* ================= AMOUNT FILTER ================= */

    if (minAmount) {
      query = query.gte("amount", Number(minAmount));
    }

    if (maxAmount) {
      query = query.lte("amount", Number(maxAmount));
    }

    /* ================= USER FILTER ================= */

    if (matchingUserIds) {
      query = query.in("user_id", matchingUserIds);
    }

    /* ================= EXECUTE ================= */

    const { data, error } = await query;
    if (error) throw error;

    /* ================= FORMAT RESPONSE ================= */

    const formatted = (data || []).map((t: any) => ({
      ...t,
      event_name: t.events?.name ?? null,
    }));

    return Response.json({
      success: true,
      count: formatted.length,
      data: formatted,
    });
  } catch (err) {
    console.error(err);
    return new Response("Failed to fetch transactions", { status: 500 });
  }
});
