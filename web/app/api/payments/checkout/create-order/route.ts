import Razorpay from "razorpay";
import supabaseAdmin from "@/app/services/supabase-admin";
import { withAuth } from "@/app/services/protected";

export const runtime = "nodejs";

export const POST = withAuth(async (req: Request, _ctx: any, user: any) => {
  console.log("🔄 [BACKEND] POST /api/payments/checkout/create-order - Request received");

  try {
    const body = await req.json();
    const { booking_id, transaction_id, amount } = body;

    console.log("🔄 [BACKEND] Request body:", { booking_id, transaction_id, amount });

    if ((!booking_id && !transaction_id) || !amount) {
      console.error("❌ [BACKEND] Missing required fields");
      return Response.json(
        { error: "Missing booking_id/transaction_id or amount" },
        { status: 400 }
      );
    }

    // 🔥 Initialize Razorpay INSIDE handler (fixes build crash)
    const RAZORPAY_KEY_ID = process.env.RAZORPAY_KEY_ID || "rzp_test_S87ed3mUSlzztX";
    const RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET || "H7Q9tiHomxudW0mxfDR36Htp";

    const razorpay = new Razorpay({
      key_id: RAZORPAY_KEY_ID,
      key_secret: RAZORPAY_KEY_SECRET,
    });

    const receiptId = booking_id || transaction_id;

    console.log("💳 [BACKEND] Creating Razorpay order...");
    const order = await razorpay.orders.create({
      amount: amount * 100, // Convert to paise
      currency: "INR",
      receipt: receiptId,
    });

    console.log("✅ [BACKEND] Razorpay order created:", order.id);

    if (booking_id) {
      console.log("💾 [BACKEND] Updating booking with order_id...");
      const { error: updateError } = await supabaseAdmin
        .from("bookings")
        .update({ razorpay_order_id: order.id })
        .eq("id", booking_id);

      if (updateError) {
        console.error("❌ [BACKEND] Failed to update booking:", updateError);
      } else {
        console.log("✅ [BACKEND] Booking updated with order_id");
      }
    } else if (transaction_id) {
      console.log("💾 [BACKEND] Updating transaction with order_id...");
      const { error: updateError } = await supabaseAdmin
        .from("transactions")
        .update({ razorpay_order_id: order.id })
        .eq("id", transaction_id);

      if (updateError) {
        console.error("❌ [BACKEND] Failed to update transaction:", updateError);
      } else {
        console.log("✅ [BACKEND] Transaction updated with order_id");
      }
    }

    const response = {
      order_id: order.id,
      amount: order.amount,
      key: RAZORPAY_KEY_ID,
    };

    console.log("✅ [BACKEND] Returning order details");
    return Response.json(response);

  } catch (err: any) {
    console.error("❌ [BACKEND] Create order error:", err);
    console.error("❌ [BACKEND] Error stack:", err.stack);
    return Response.json(
      { error: err.message || "Failed to create order" },
      { status: 500 }
    );
  }
});
