import supabaseAdmin from "@/app/services/supabase-admin";
import { withAuth } from "@/app/services/protected";

export const runtime = "nodejs";

export const POST = withAuth(async (req: Request, _ctx: any, user: any) => {
  console.log("🔄 [BACKEND] POST /api/payments/wallet/add - Request received");

  try {
    const body = await req.json();
    const { amount } = body;

    console.log("🔄 [BACKEND] Wallet add data:", {
      amount,
      user_id: user.id,
    });

    if (!amount || amount <= 0) {
      return Response.json(
        { error: "Invalid amount. Must be greater than 0." },
        { status: 400 }
      );
    }

    if (amount < 1) {
      return Response.json(
        { error: "Minimum amount is ₹1" },
        { status: 400 }
      );
    }

    // Ensure customer row exists (for wallet_balance)
    const { error: customerError } = await supabaseAdmin
      .from("customers")
      .upsert(
        { id: user.id, email: user.email },
        { onConflict: "id" }
      );

    if (customerError) {
      console.error("❌ [BACKEND] Customer upsert error:", customerError);
    }

    // Create wallet add transaction (club_id null for wallet top-up)
    const transactionData = {
      user_id: user.id,
      club_id: null,
      event_id: null,
      booking_id: null,
      razorpay_order_id: null,
      razorpay_payment_id: null,
      amount,
      status: "pending",
      is_wallet: true,
      wallet_added: null, // Set to true after verify
      wallet_used: null,
    };

    const { data: transaction, error: transactionError } = await supabaseAdmin
      .from("transactions")
      .insert(transactionData)
      .select()
      .single();

    if (transactionError) {
      console.error("❌ [BACKEND] Failed to create wallet transaction:", transactionError);
      const isSchemaError = transactionError.message?.includes("club_id") || transactionError.message?.includes("violates");
      return Response.json(
        {
          error: "Failed to create wallet transaction",
          details: transactionError.message,
          ...(isSchemaError && {
            hint: "Ensure transactions.club_id allows NULL for wallet top-ups. Run migration 20260201_wallet_columns.sql",
          }),
        },
        { status: 500 }
      );
    }

    console.log("✅ [BACKEND] Wallet transaction created:", transaction.id);

    return Response.json({
      success: true,
      transaction_id: transaction.id,
      message: "Wallet top-up transaction created",
    });
  } catch (err: any) {
    console.error("❌ [BACKEND] Wallet add error:", err.message);
    return Response.json(
      { error: err.message || "Failed to create wallet transaction" },
      { status: 500 }
    );
  }
});
