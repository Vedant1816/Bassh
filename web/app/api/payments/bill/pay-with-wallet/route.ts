import supabaseAdmin from "@/app/services/supabase-admin";
import { withAuth } from "@/app/services/protected";

export const runtime = "nodejs";

export const POST = withAuth(async (req: Request, _ctx: any, user: any) => {
  console.log("🔄 [BACKEND] POST /api/payments/bill/pay-with-wallet - Request received");

  try {
    const body = await req.json();
    const { club_id, amount } = body;

    if (!club_id || !amount || amount <= 0) {
      return Response.json(
        { error: "Invalid bill payment data" },
        { status: 400 }
      );
    }

    const { data: club, error: clubError } = await supabaseAdmin
      .from("clubs")
      .select("id, club_name")
      .eq("id", club_id)
      .single();

    if (clubError || !club) {
      return Response.json(
        { error: "Club not found" },
        { status: 404 }
      );
    }

    const { data: customer, error: customerError } = await supabaseAdmin
      .from("customers")
      .select("wallet_balance")
      .eq("id", user.id)
      .single();

    if (customerError || !customer) {
      return Response.json(
        { error: "Customer record not found" },
        { status: 404 }
      );
    }

    const balance = Number(customer.wallet_balance) || 0;
    const amountNum = Number(amount);

    if (balance < amountNum) {
      return Response.json(
        { error: `Insufficient wallet balance. Available: ₹${balance.toFixed(0)}` },
        { status: 400 }
      );
    }

    const newBalance = balance - amountNum;

    // 1. Create transaction with wallet_used=true
    const transactionData = {
      user_id: user.id,
      club_id: club_id,
      event_id: null,
      booking_id: null,
      razorpay_order_id: null,
      razorpay_payment_id: null,
      amount: amountNum,
      status: "success",
      is_wallet: true,
      wallet_added: false,
      wallet_used: true,
    };

    const { data: transaction, error: txError } = await supabaseAdmin
      .from("transactions")
      .insert(transactionData)
      .select()
      .single();

    if (txError) {
      console.error("❌ [BACKEND] Failed to create wallet transaction:", txError);
      return Response.json(
        { error: "Failed to create transaction" },
        { status: 500 }
      );
    }

    // 2. Deduct from wallet_balance
    const { error: updateError } = await supabaseAdmin
      .from("customers")
      .update({
        wallet_balance: newBalance,
        updated_at: new Date().toISOString(),
      })
      .eq("id", user.id);

    if (updateError) {
      console.error("❌ [BACKEND] Failed to update wallet balance:", updateError);
      return Response.json(
        { error: "Failed to deduct from wallet" },
        { status: 500 }
      );
    }

    console.log("✅ [BACKEND] Bill paid with wallet:", { user_id: user.id, amount: amountNum, newBalance });

    return Response.json({
      success: true,
      transaction_id: transaction.id,
      amount: amountNum,
      wallet_balance: newBalance,
    });
  } catch (err: any) {
    console.error("❌ [BACKEND] Pay with wallet error:", err.message);
    return Response.json(
      { error: err.message || "Failed to pay with wallet" },
      { status: 500 }
    );
  }
});
