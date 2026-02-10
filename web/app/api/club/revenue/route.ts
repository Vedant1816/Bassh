import supabaseAdmin from "@/app/services/supabase-admin";
import { withAuth } from "@/app/services/protected";

export const GET = withAuth(async (req: Request, user: {id: string}) => {
  try {
    const clubId = user.id;

    //  Fetch revenue for last 7 days (today included)
    const { data, error } = await supabaseAdmin
      .from("transactions")
      .select(`
        created_at,
        amount
      `)
      .eq("club_id", clubId)
      .eq("status", "success")
      .gte("created_at", new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString());

    if (error) throw error;

    const revenueByDate: Record<string, number> = {};

    data.forEach(txn => {
      const date = new Date(txn.created_at).toISOString().slice(0, 10);
      revenueByDate[date] = (revenueByDate[date] || 0) + txn.amount;
    });

    // Ensure all 7 days exist (even zero revenue days)
    const last7Days: { date: string; revenue: number }[] = [];

    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);

      last7Days.push({
        date: key,
        revenue: revenueByDate[key] || 0,
      });
    }

    const todayRevenue = last7Days[6].revenue;
    const yesterdayRevenue = last7Days[5].revenue;

    const revenueChange =
      yesterdayRevenue === 0
        ? 0
        : ((todayRevenue - yesterdayRevenue) / yesterdayRevenue) * 100;

    const total7DayRevenue = last7Days.reduce(
      (sum, d) => sum + d.revenue,
      0
    );

    return Response.json({
      revenueToday: todayRevenue,
      revenueYesterday: yesterdayRevenue,
      revenueChange: Number(revenueChange.toFixed(2)),
      total7DayRevenue,
      revenueTrend: last7Days,
    });
  } catch (err) {
    console.error(err);
    return new Response("Failed to fetch revenue", { status: 500 });
  }
});
