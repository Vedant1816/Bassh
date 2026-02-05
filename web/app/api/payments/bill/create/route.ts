import supabaseAdmin from "@/app/services/supabase-admin";
import { withAuth } from "@/app/services/protected";

export const runtime = "nodejs";

export const POST = withAuth(async (req: Request, _ctx: any, user: any) => {
  console.log("🔄 [BACKEND] POST /api/payments/bill/create - Request received");
  
  try {
    const body = await req.json();
    const { club_id, amount } = body;

    console.log("🔄 [BACKEND] Bill payment data:", {
      club_id,
      amount,
      user_id: user.id,
    });

    // ================= VALIDATE INPUT =================
    if (!club_id || !amount || amount <= 0) {
      console.error("❌ [BACKEND] Invalid bill payment data");
      return Response.json(
        { error: "Invalid bill payment data" },
        { status: 400 }
      );
    }

    // ================= VERIFY CLUB EXISTS =================
    console.log("🔍 [BACKEND] Verifying club exists:", club_id);
    const { data: club, error: clubError } = await supabaseAdmin
      .from("clubs")
      .select("id, club_name")
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

    // ================= CREATE TRANSACTION RECORD (PENDING) =================
    console.log("💾 [BACKEND] Creating bill payment transaction record...");

    const transactionData = {
      user_id: user.id,
      club_id: club_id,
      event_id: null, // Bill payments don't have events
      booking_id: null, // Bill payments don't have bookings
      razorpay_order_id: null, // Will be updated after order creation
      razorpay_payment_id: null, // Will be updated after payment
      amount: amount,
      status: "pending",
    };

    const { data: transaction, error: transactionError } = await supabaseAdmin
      .from("transactions")
      .insert(transactionData)
      .select()
      .single();

    if (transactionError) {
      console.error("❌ [BACKEND] Failed to create transaction:", transactionError.message);
      console.error("❌ [BACKEND] Error details:", transactionError.details);
      const isSchemaError =
        transactionError.message?.includes("booking_id") ||
        transactionError.message?.includes("transactions_status_check");
      return Response.json(
        {
          error: "Failed to create transaction",
          details: transactionError.message,
          ...(isSchemaError && {
            hint: "Run migration web/supabase/migrations/20260129_transactions_bill_payments.sql in Supabase SQL Editor to allow bill payments (nullable booking_id, pending status).",
          }),
        },
        { status: 500 }
      );
    }

    console.log("✅ [BACKEND] Bill payment transaction created:", transaction.id);

    return Response.json({
      success: true,
      transaction_id: transaction.id,
      message: "Bill payment transaction created successfully",
    });
  } catch (err: any) {
    console.error("❌ [BACKEND] Bill payment creation error:", err.message);
    console.error("❌ [BACKEND] Error stack:", err.stack);
    return Response.json(
      { error: err.message || "Failed to create bill payment" },
      { status: 500 }
    );
  }
});