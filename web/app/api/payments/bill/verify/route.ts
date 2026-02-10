import crypto from "crypto";
import supabaseAdmin from "@/app/services/supabase-admin";
import { withAuth } from "@/app/services/protected";

export const runtime = "nodejs";

export const POST = withAuth(async (req: Request, _ctx: any, _user: any) => {
  console.log("🔄 [BACKEND] POST /api/payments/bill/verify - Request received");
  
  try {
    const body = await req.json();
    const {
      transaction_id,
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
    } = body;

    console.log("🔄 [BACKEND] Bill verification data:", {
      transaction_id,
      razorpay_order_id,
      razorpay_payment_id: razorpay_payment_id ? razorpay_payment_id.substring(0, 10) + "..." : null,
      signature: razorpay_signature ? razorpay_signature.substring(0, 20) + "..." : null,
    });

    // ================= VALIDATE INPUT =================
    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      console.error("❌ [BACKEND] Missing payment verification fields");
      return Response.json(
        { error: "Missing payment verification fields" },
        { status: 400 }
      );
    }

    // ================= FIND TRANSACTION RECORD =================
    let finalTransactionId = transaction_id;
    if (!finalTransactionId && razorpay_order_id) {
      console.log("🔍 [BACKEND] Looking up transaction by order_id:", razorpay_order_id);
      const { data: transactionLookup, error: lookupError } = await supabaseAdmin
        .from("transactions")
        .select("id")
        .eq("razorpay_order_id", razorpay_order_id)
        .single();
      
      if (lookupError) {
        console.error("❌ [BACKEND] Error looking up transaction:", lookupError.message);
      }
      
      if (transactionLookup) {
        finalTransactionId = transactionLookup.id;
        console.log("✅ [BACKEND] Found transaction:", finalTransactionId);
      }
    }

    if (!finalTransactionId) {
      console.error("❌ [BACKEND] Transaction ID not found");
      return Response.json(
        { error: "Transaction ID not found" },
        { status: 400 }
      );
    }
    
    // ================= VERIFY TRANSACTION EXISTS =================
    console.log("🔍 [BACKEND] Verifying transaction exists:", finalTransactionId);
    const { data: existingTransaction, error: checkError } = await supabaseAdmin
      .from("transactions")
      .select("id, user_id, club_id, amount, status, razorpay_order_id")
      .eq("id", finalTransactionId)
      .single();
    
    if (checkError || !existingTransaction) {
      console.error("❌ [BACKEND] Transaction not found in database:", checkError?.message);
      return Response.json(
        { error: "Transaction not found in database" },
        { status: 404 }
      );
    }
    
    console.log("✅ [BACKEND] Transaction exists:", {
      id: existingTransaction.id,
      current_status: existingTransaction.status,
      amount: existingTransaction.amount,
    });

    // ================= VERIFY PAYMENT SIGNATURE =================
    console.log("🔐 [BACKEND] Verifying signature...");
    const signatureBody = `${razorpay_order_id}|${razorpay_payment_id}`;
    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET!)
      .update(signatureBody)
      .digest("hex");

    if (expectedSignature !== razorpay_signature) {
      console.error("❌ [BACKEND] Invalid payment signature");
      
      // ================= UPDATE TRANSACTION TO FAILED =================
      try {
        await supabaseAdmin
          .from("transactions")
          .update({
            razorpay_payment_id,
            status: "failed",
          })
          .eq("id", finalTransactionId);
        
        console.log("✅ [BACKEND] Transaction marked as failed");
      } catch (updateError: any) {
        console.error("⚠️ [BACKEND] Failed to update transaction:", updateError.message);
      }
      
      return Response.json(
        { error: "Invalid payment signature" },
        { status: 400 }
      );
    }

    console.log("✅ [BACKEND] Signature verified successfully");

    // ================= UPDATE TRANSACTION TO SUCCESS =================
    console.log("💾 [BACKEND] Updating transaction status to success...");
    
    const { data: updateData, error: updateError } = await supabaseAdmin
      .from("transactions")
      .update({
        razorpay_payment_id,
        status: "success",
      })
      .eq("id", finalTransactionId)
      .select();

    if (updateError) {
      console.error("❌ [BACKEND] Failed to update transaction:", updateError.message);
      
      return Response.json(
        { error: "Failed to update transaction", details: updateError.message },
        { status: 500 }
      );
    }
    
    console.log("✅ [BACKEND] Transaction updated successfully:", updateData);

    console.log("✅ [BACKEND] Bill payment verified successfully");
    
    return Response.json({ 
      success: true, 
      transaction_id: finalTransactionId,
      amount: existingTransaction.amount,
    });
  } catch (err: any) {
    console.error("❌ [BACKEND] Bill payment verification error:", err.message);
    console.error("❌ [BACKEND] Error stack:", err.stack);
    return Response.json(
      { error: err.message || "Payment verification failed" },
      { status: 500 }
    );
  }
});