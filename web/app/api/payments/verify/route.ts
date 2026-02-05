import crypto from "crypto";
// @ts-ignore - qrcode doesn't have types
import QRCode from "qrcode";
import supabaseAdmin from "@/app/services/supabase-admin";
import { withAuth } from "@/app/services/protected";

export const runtime = "nodejs";

export const POST = withAuth(async (req: Request, _ctx: any, _user: any) => {
  console.log("🔄 [BACKEND] POST /api/payments/verify - Request received");
  
  try {
    const body = await req.json();
    const {
      booking_id,
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
    } = body;

    console.log("🔄 [BACKEND] Verification data:", {
      booking_id,
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

    // ================= FIND BOOKING =================
    // If booking_id not provided, try to find it from order_id
    let finalBookingId = booking_id;
    if (!finalBookingId && razorpay_order_id) {
      console.log("🔍 [BACKEND] Looking up booking by order_id:", razorpay_order_id);
      const { data: bookingLookup, error: lookupError } = await supabaseAdmin
        .from("bookings")
        .select("id")
        .eq("razorpay_order_id", razorpay_order_id)
        .single();
      
      if (lookupError) {
        console.error("❌ [BACKEND] Error looking up booking:", lookupError.message);
      }
      
      if (bookingLookup) {
        finalBookingId = bookingLookup.id;
        console.log("✅ [BACKEND] Found booking:", finalBookingId);
      } else {
        console.error("❌ [BACKEND] No booking found with order_id:", razorpay_order_id);
      }
    }

    if (!finalBookingId) {
      console.error("❌ [BACKEND] Booking ID not found");
      console.error("❌ [BACKEND] Provided booking_id:", booking_id);
      console.error("❌ [BACKEND] Provided order_id:", razorpay_order_id);
      return Response.json(
        { error: "Booking ID not found" },
        { status: 400 }
      );
    }
    
    // ================= VERIFY BOOKING EXISTS =================
    console.log("🔍 [BACKEND] Verifying booking exists:", finalBookingId);
    const { data: existingBooking, error: checkError } = await supabaseAdmin
      .from("bookings")
      .select("id, user_id, club_id, event_id, total_amount, booking_status, razorpay_order_id")
      .eq("id", finalBookingId)
      .single();
    
    if (checkError || !existingBooking) {
      console.error("❌ [BACKEND] Booking not found in database:", checkError?.message);
      return Response.json(
        { error: "Booking not found in database" },
        { status: 404 }
      );
    }
    
    console.log("✅ [BACKEND] Booking exists:", {
      id: existingBooking.id,
      current_status: existingBooking.booking_status,
      order_id: existingBooking.razorpay_order_id,
      user_id: existingBooking.user_id,
      club_id: existingBooking.club_id,
      event_id: existingBooking.event_id,
      amount: existingBooking.total_amount,
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
      console.error("❌ [BACKEND] Expected:", expectedSignature.substring(0, 20) + "...");
      console.error("❌ [BACKEND] Received:", razorpay_signature.substring(0, 20) + "...");
      
      // ================= LOG FAILED TRANSACTION =================
      console.log("📝 [BACKEND] Logging failed transaction...");
      try {
        const { error: transactionError } = await supabaseAdmin
          .from("transactions")
          .insert({
            user_id: existingBooking.user_id,
            club_id: existingBooking.club_id,
            event_id: existingBooking.event_id,
            booking_id: existingBooking.id,
            razorpay_order_id,
            razorpay_payment_id,
            amount: existingBooking.total_amount,
            status: "failed",
          });
        
        if (transactionError) {
          console.error("⚠️ [BACKEND] Failed to log failed transaction:", transactionError.message);
        } else {
          console.log("✅ [BACKEND] Failed transaction logged");
        }
      } catch (transactionError: any) {
        console.error("⚠️ [BACKEND] Exception logging failed transaction:", transactionError.message);
      }
      
      return Response.json(
        { error: "Invalid payment signature" },
        { status: 400 }
      );
    }

    console.log("✅ [BACKEND] Signature verified successfully");

    // ================= GENERATE QR CODE =================
    console.log("📱 [BACKEND] Generating QR code...");
    const qrData = `BOOKING:${finalBookingId}`;
    let qr = "";
    try {
      qr = await QRCode.toDataURL(qrData, {
        width: 300,
        margin: 2,
      });
      console.log("✅ [BACKEND] QR code generated, length:", qr.length);
    } catch (qrError: any) {
      console.error("❌ [BACKEND] QR code generation failed:", qrError.message);
      console.warn("⚠️ [BACKEND] Continuing without QR code");
    }

    // ================= UPDATE BOOKING STATUS =================
    console.log("💾 [BACKEND] Updating booking status to confirmed...");
    console.log("💾 [BACKEND] Booking ID:", finalBookingId);
    console.log("💾 [BACKEND] Payment ID:", razorpay_payment_id);
    console.log("💾 [BACKEND] QR code length:", qr ? qr.length : 0);
    
    // Build update object - conditionally add QR code and signature
    const updateFields: any = {
      razorpay_payment_id,
      booking_status: "confirmed",
    };
    
    // Only add qr_code if it was generated successfully
    if (qr && qr.length > 0) {
      updateFields.qr_code = qr;
    }

    console.log("💾 [BACKEND] Update fields:", Object.keys(updateFields));
    
    const { data: updateData, error: updateError } = await supabaseAdmin
      .from("bookings")
      .update(updateFields)
      .eq("id", finalBookingId)
      .select();

    if (updateError) {
      console.error("❌ [BACKEND] Failed to update booking:", updateError.message);
      console.error("❌ [BACKEND] Update error code:", updateError.code);
      console.error("❌ [BACKEND] Update error details:", updateError.details);
      console.error("❌ [BACKEND] Update error hint:", updateError.hint);
      
      // ================= LOG FAILED TRANSACTION (UPDATE ERROR) =================
      console.log("📝 [BACKEND] Logging failed transaction (update error)...");
      try {
        await supabaseAdmin.from("transactions").insert({
          user_id: existingBooking.user_id,
          club_id: existingBooking.club_id,
          event_id: existingBooking.event_id,
          booking_id: existingBooking.id,
          razorpay_order_id,
          razorpay_payment_id,
          amount: existingBooking.total_amount,
          status: "failed",
        });
        console.log("✅ [BACKEND] Failed transaction logged");
      } catch (transactionError: any) {
        console.error("⚠️ [BACKEND] Failed to log failed transaction:", transactionError.message);
      }
      
      // Try updating without QR code if that's the issue
      if (updateFields.qr_code) {
        console.log("🔄 [BACKEND] Retrying update with minimal fields...");
        const { data: retryData, error: retryError } = await supabaseAdmin
          .from("bookings")
          .update({
            razorpay_payment_id,
            booking_status: "confirmed",
          })
          .eq("id", finalBookingId)
          .select();
        
        if (retryError) {
          console.error("❌ [BACKEND] Retry also failed:", retryError.message);
          return Response.json(
            { error: "Failed to update booking", details: retryError.message },
            { status: 500 }
          );
        }
        
        console.log("✅ [BACKEND] Booking updated with minimal fields");
        
        // ================= LOG SUCCESSFUL TRANSACTION (MINIMAL UPDATE) =================
        console.log("📝 [BACKEND] Logging successful transaction...");
        try {
          const { error: transactionError } = await supabaseAdmin
            .from("transactions")
            .insert({
              user_id: existingBooking.user_id,
              club_id: existingBooking.club_id,
              event_id: existingBooking.event_id,
              booking_id: existingBooking.id,
              razorpay_order_id,
              razorpay_payment_id,
              amount: existingBooking.total_amount,
              status: "success",
            });
          
          if (transactionError) {
            console.error("⚠️ [BACKEND] Failed to log transaction:", transactionError.message);
          } else {
            console.log("✅ [BACKEND] Transaction logged successfully");
          }
        } catch (transactionError: any) {
          console.error("⚠️ [BACKEND] Exception logging transaction:", transactionError.message);
        }
        
        return Response.json({ 
          success: true, 
          qr: "", 
          booking_id: finalBookingId,
          warning: "QR code could not be saved"
        });
      }
      
      return Response.json(
        { error: "Failed to update booking", details: updateError.message },
        { status: 500 }
      );
    }
    
    console.log("✅ [BACKEND] Booking updated successfully:", updateData);

    // ================= LOG SUCCESSFUL TRANSACTION =================
    console.log("📝 [BACKEND] Logging successful transaction...");
    try {
      const { data: transactionData, error: transactionError } = await supabaseAdmin
        .from("transactions")
        .insert({
          user_id: existingBooking.user_id,
          club_id: existingBooking.club_id,
          event_id: existingBooking.event_id,
          booking_id: existingBooking.id,
          razorpay_order_id,
          razorpay_payment_id,
          amount: existingBooking.total_amount,
          status: "success",
        })
        .select();
      
      if (transactionError) {
        console.error("⚠️ [BACKEND] Failed to log transaction:", transactionError.message);
        console.error("⚠️ [BACKEND] Transaction error details:", transactionError.details);
        // Don't fail the request if transaction logging fails - payment is still verified
      } else {
        console.log("✅ [BACKEND] Transaction logged successfully:", transactionData);
      }
    } catch (transactionError: any) {
      console.error("⚠️ [BACKEND] Exception logging transaction:", transactionError.message);
      // Don't fail the request if transaction logging fails - payment is still verified
    }

    console.log("✅ [BACKEND] Payment verified, booking updated, and transaction logged successfully");
    
    // Return success with QR code (or empty string if generation failed)
    return Response.json({ 
      success: true, 
      qr: qr || "", 
      booking_id: finalBookingId 
    });
  } catch (err: any) {
    console.error("❌ [BACKEND] Payment verification error:", err.message);
    console.error("❌ [BACKEND] Error stack:", err.stack);
    return Response.json(
      { error: err.message || "Payment verification failed" },
      { status: 500 }
    );
  }
});