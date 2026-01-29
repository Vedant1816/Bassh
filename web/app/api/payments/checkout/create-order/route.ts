import { razorpay } from "@/lib/razorpay";
import supabaseAdmin from "@/app/services/supabase-admin";
import { withAuth } from "@/app/services/protected";

export const runtime = "nodejs";

export const POST = withAuth(async (req, _ctx, user) => {
  console.log("🔄 [BACKEND] POST /api/payments/checkout/create-order - Request received");
  
  try {
    const body = await req.json();
    const { booking_id, transaction_id, amount } = body;
    
    console.log("🔄 [BACKEND] Request body:", { booking_id, transaction_id, amount });

    // Validate: must have either booking_id OR transaction_id
    if ((!booking_id && !transaction_id) || !amount) {
      console.error("❌ [BACKEND] Missing required fields");
      return Response.json(
        { error: "Missing booking_id/transaction_id or amount" },
        { status: 400 }
      );
    }

    // Use booking_id or transaction_id as receipt
    const receiptId = booking_id || transaction_id;

    console.log("💳 [BACKEND] Creating Razorpay order...");
    const order = await razorpay.orders.create({
      amount: amount * 100, // Convert to paise
      currency: "INR",
      receipt: receiptId,
    });

    console.log("✅ [BACKEND] Razorpay order created:", order.id);

    // Update the appropriate table with order_id
    if (booking_id) {
      console.log("💾 [BACKEND] Updating booking with order_id...");
      const { error: updateError } = await supabaseAdmin
        .from("bookings")
        .update({ razorpay_order_id: order.id })
        .eq("id", booking_id);

      if (updateError) {
        console.error("❌ [BACKEND] Failed to update booking:", updateError);
        // Don't fail the request, order is created
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
        // Don't fail the request, order is created
      } else {
        console.log("✅ [BACKEND] Transaction updated with order_id");
      }
    }

    const response = {
      order_id: order.id,
      amount: order.amount, // Amount in paise from Razorpay
      key: process.env.RAZORPAY_KEY_ID,
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