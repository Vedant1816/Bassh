import supabaseAdmin from "@/app/services/supabase-admin";
import { withAuth } from "@/app/services/protected";

export const GET = withAuth(async (_req: Request, user: { id: string }) => {
  try {
    const clubId = user.id;

    /* ---------- TOTAL REVENUE ---------- */
    const { data: revenueData, error: revenueError } =
      await supabaseAdmin
        .from("transactions")
        .select("amount")
        .eq("club_id", clubId)
        .eq("status", "success");

    if (revenueError) throw revenueError;

    const totalRevenue = revenueData.reduce(
      (sum, t) => sum + Number(t.amount),
      0
    );

    /* ---------- TOTAL REFUNDED ---------- */
    const { data: refundData, error: refundError } =
      await supabaseAdmin
        .from("transactions")
        .select("amount")
        .eq("club_id", clubId)
        .eq("status", "refunded");

    if (refundError) throw refundError;

    const totalRefunded = refundData.reduce(
      (sum, t) => sum + Number(t.amount),
      0
    );

    /* ---------- PAYOUTS ---------- */
    const { data: payouts, error: payoutError } =
      await supabaseAdmin
        .from("payouts")
        .select("amount, status, requested_at")
        .eq("club_id", clubId)
        .order("requested_at", { ascending: false });

    if (payoutError) throw payoutError;

    const totalClaimed = payouts
      .filter((p) => p.status === "success")
      .reduce((sum, p) => sum + Number(p.amount), 0);

    const pendingAmount = Math.max(totalRevenue - totalClaimed, 0);

    const latestPayout = payouts[0] ?? null;

    return Response.json({
      totalRevenue,
      totalClaimed,
      totalPending: pendingAmount,
      totalRefunded,
      payoutInProcess: latestPayout?.status === "processing",
    });
  } catch (err) {
    console.error(err);
    return new Response("Failed to fetch billing summary", { status: 500 });
  }
});

export const POST = withAuth(async (_req: Request, user: { id: string }) => {
  try {
    const clubId = user.id;

    /* ================= 1. CHECK EXISTING PROCESSING PAYOUT ================= */

    const { data: existingPayout, error: existingError } =
      await supabaseAdmin
        .from("payouts")
        .select("id")
        .eq("club_id", clubId)
        .eq("status", "processing")
        .maybeSingle();

    if (existingError) throw existingError;

    if (existingPayout) {
      return new Response(
        JSON.stringify({
          success: false,
          message: "Payout already under process",
        }),
        { status: 409 }
      );
    }

    /* ================= 2. CALCULATE TOTAL REVENUE ================= */

    const { data: revenueData, error: revenueError } =
      await supabaseAdmin
        .from("transactions")
        .select("amount")
        .eq("club_id", clubId)
        .eq("status", "success");

    if (revenueError) throw revenueError;

    const totalRevenue = revenueData.reduce(
      (sum, t) => sum + Number(t.amount),
      0
    );

    /* ================= 3. CALCULATE TOTAL CLAIMED ================= */

    const { data: payoutData, error: payoutError } =
      await supabaseAdmin
        .from("payouts")
        .select("amount")
        .eq("club_id", clubId)
        .eq("status", "success");

    if (payoutError) throw payoutError;

    const totalClaimed = payoutData.reduce(
      (sum, p) => sum + Number(p.amount),
      0
    );

    /* ================= 4. COMPUTE PENDING ================= */

    const pendingAmount = totalRevenue - totalClaimed;

    if (pendingAmount <= 0) {
      return new Response(
        JSON.stringify({
          success: false,
          message: "No pending amount available for payout",
        }),
        { status: 400 }
      );
    }

    /* ================= 5. CREATE PAYOUT ================= */

    const { error: insertError } = await supabaseAdmin
      .from("payouts")
      .insert({
        club_id: clubId,
        amount: pendingAmount,
        status: "processing",
      });

    if (insertError) throw insertError;

    return Response.json({
      success: true,
      message: "Payout request created",
      amount: pendingAmount,
      status: "processing",
    });
  } catch (err) {
    console.error(err);
    return new Response("Failed to create payout", { status: 500 });
  }
});
