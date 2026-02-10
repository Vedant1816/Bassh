import crypto from "crypto";
import supabaseAdmin from "@/app/services/supabase-admin";
import { withAuth } from "@/app/services/protected";

export const runtime = "nodejs";

export const POST = withAuth(async (req: Request, _ctx: any, user: any) => {
  console.log("🔄 [BACKEND] POST /api/payments/wallet/verify - Request received");

  try {
    const body = await req.json();
    const {
      transaction_id,
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
    } = body;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return Response.json(
        { error: "Missing payment verification fields" },
        { status: 400 }
      );
    }

    let finalTransactionId = transaction_id;
    if (!finalTransactionId && razorpay_order_id) {
      const { data: lookup } = await supabaseAdmin
        .from("transactions")
        .select("id")
        .eq("razorpay_order_id", razorpay_order_id)
        .single();

      if (lookup) finalTransactionId = lookup.id;
    }

    if (!finalTransactionId) {
      return Response.json(
        { error: "Transaction ID not found" },
        { status: 400 }
      );
    }

    const { data: existingTransaction, error: checkError } = await supabaseAdmin
      .from("transactions")
      .select("id, user_id, amount, status, is_wallet")
      .eq("id", finalTransactionId)
      .single();

    if (checkError || !existingTransaction) {
      return Response.json(
        { error: "Transaction not found" },
        { status: 404 }
      );
    }

    if (existingTransaction.user_id !== user.id) {
      return Response.json(
        { error: "Unauthorized" },
        { status: 403 }
      );
    }

    if (!existingTransaction.is_wallet) {
      return Response.json(
        { error: "Not a wallet transaction" },
        { status: 400 }
      );
    }

    if (existingTransaction.status === "success") {
      return Response.json({
        success: true,
        transaction_id: finalTransactionId,
        amount: existingTransaction.amount,
        message: "Already verified",
      });
    }

    // Verify Razorpay signature
    const signatureBody = `${razorpay_order_id}|${razorpay_payment_id}`;
    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET!)
      .update(signatureBody)
      .digest("hex");

    if (expectedSignature !== razorpay_signature) {
      await supabaseAdmin
        .from("transactions")
        .update({
          razorpay_payment_id,
          status: "failed",
        })
        .eq("id", finalTransactionId);

      return Response.json(
        { error: "Invalid payment signature" },
        { status: 400 }
      );
    }

    const amount = Number(existingTransaction.amount);

    // 1. Update transaction: success, wallet_added = true
    const { error: updateTxError } = await supabaseAdmin
      .from("transactions")
      .update({
        razorpay_payment_id,
        status: "success",
        wallet_added: true,
      })
      .eq("id", finalTransactionId);

    if (updateTxError) {
      console.error("❌ [BACKEND] Failed to update transaction:", updateTxError);
      return Response.json(
        { error: "Failed to update transaction" },
        { status: 500 }
      );
    }

    // 2. Add amount to customer wallet_balance (atomic increment)
    const { data: customer, error: customerError } = await supabaseAdmin
      .from("customers")
      .select("wallet_balance")
      .eq("id", user.id)
      .single();

    if (customerError || !customer) {
      console.error("❌ [BACKEND] Customer not found:", customerError);
      return Response.json(
        { error: "Customer record not found" },
        { status: 500 }
      );
    }

    const currentBalance = Number(customer.wallet_balance) || 0;
    const newBalance = currentBalance + amount;

    const { error: updateBalanceError } = await supabaseAdmin
      .from("customers")
      .update({
        wallet_balance: newBalance,
        updated_at: new Date().toISOString(),
      })
      .eq("id", user.id);

    if (updateBalanceError) {
      console.error("❌ [BACKEND] Failed to update wallet balance:", updateBalanceError);
      return Response.json(
        { error: "Failed to credit wallet" },
        { status: 500 }
      );
    }

    console.log("✅ [BACKEND] Wallet credited:", { user_id: user.id, amount, newBalance });

    return Response.json({
      success: true,
      transaction_id: finalTransactionId,
      amount,
      wallet_balance: newBalance,
    });
  } catch (err: any) {
    console.error("❌ [BACKEND] Wallet verify error:", err.message);
    return Response.json(
      { error: err.message || "Payment verification failed" },
      { status: 500 }
    );
  }
});
