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

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      console.error("❌ [BACKEND] Missing payment verification fields");
      return Response.json(
        { error: "Missing payment verification fields" },
        { status: 400 }
      );
    }

    // If booking_id not provided, try to find it from order_id
    let finalBookingId = booking_id;
    if (!finalBookingId && razorpay_order_id) {
      console.log("🔍 [BACKEND] Looking up booking by order_id:", razorpay_order_id);
      const { data: booking, error: lookupError } = await supabaseAdmin
        .from("bookings")
        .select("id")
        .eq("razorpay_order_id", razorpay_order_id)
        .single();
      
      if (lookupError) {
        console.error("❌ [BACKEND] Error looking up booking:", lookupError);
        console.error("❌ [BACKEND] Lookup error details:", lookupError.message);
      }
      
      if (booking) {
        finalBookingId = booking.id;
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
    
    // Verify booking exists before updating
    console.log("🔍 [BACKEND] Verifying booking exists:", finalBookingId);
    const { data: existingBooking, error: checkError } = await supabaseAdmin
      .from("bookings")
      .select("id, booking_status, razorpay_order_id")
      .eq("id", finalBookingId)
      .single();
    
    if (checkError || !existingBooking) {
      console.error("❌ [BACKEND] Booking not found in database:", checkError);
      return Response.json(
        { error: "Booking not found in database" },
        { status: 404 }
      );
    }
    
    console.log("✅ [BACKEND] Booking exists:", {
      id: existingBooking.id,
      current_status: existingBooking.booking_status,
      order_id: existingBooking.razorpay_order_id,
    });

    console.log("🔐 [BACKEND] Verifying signature...");
    const signatureBody = `${razorpay_order_id}|${razorpay_payment_id}`;
    const expected = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET!)
      .update(signatureBody)
      .digest("hex");

    if (expected !== razorpay_signature) {
      console.error("❌ [BACKEND] Invalid payment signature");
      console.error("❌ [BACKEND] Expected:", expected.substring(0, 20) + "...");
      console.error("❌ [BACKEND] Received:", razorpay_signature.substring(0, 20) + "...");
      return Response.json(
        { error: "Invalid payment signature" },
        { status: 400 }
      );
    }

    console.log("✅ [BACKEND] Signature verified successfully");

    // Generate QR code
    console.log("📱 [BACKEND] Generating QR code...");
    const qrData = `BOOKING:${finalBookingId}`;
    let qr: string;
    try {
      qr = await QRCode.toDataURL(qrData, {
        width: 300,
        margin: 2,
      });
      console.log("✅ [BACKEND] QR code generated, length:", qr.length);
    } catch (qrError: any) {
      console.error("❌ [BACKEND] QR code generation failed:", qrError);
      // Continue without QR code if generation fails
      qr = "";
    }

    console.log("💾 [BACKEND] Updating booking status...");
    console.log("💾 [BACKEND] Booking ID:", finalBookingId);
    console.log("💾 [BACKEND] Payment ID:", razorpay_payment_id);
    console.log("💾 [BACKEND] QR code length:", qr ? qr.length : 0);
    
    // Build update object - only include fields that exist
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
      console.error("❌ [BACKEND] Failed to update booking:", updateError);
      console.error("❌ [BACKEND] Update error code:", updateError.code);
      console.error("❌ [BACKEND] Update error message:", updateError.message);
      console.error("❌ [BACKEND] Update error details:", updateError.details);
      console.error("❌ [BACKEND] Update error hint:", updateError.hint);
      
      // Try updating without QR code if that's the issue
      if (updateFields.qr_code) {
        console.log("🔄 [BACKEND] Retrying update without QR code...");
        const { error: retryError } = await supabaseAdmin
          .from("bookings")
          .update({
            razorpay_payment_id,
            booking_status: "confirmed",
          })
          .eq("id", finalBookingId);
        
        if (retryError) {
          console.error("❌ [BACKEND] Retry also failed:", retryError);
          return Response.json(
            { error: "Failed to update booking", details: retryError.message },
            { status: 500 }
          );
        }
        
        console.log("✅ [BACKEND] Booking updated without QR code");
        // Return success even without QR - payment is verified
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

    console.log("✅ [BACKEND] Payment verified and booking updated successfully");
    
    // Return QR code (or empty string if generation failed)
    return Response.json({ 
      success: true, 
      qr: qr || "", 
      booking_id: finalBookingId 
    });
  } catch (err: any) {
    console.error("❌ [BACKEND] Payment verification error:", err);
    console.error("❌ [BACKEND] Error stack:", err.stack);
    return Response.json(
      { error: err.message || "Verification failed" },
      { status: 500 }
    );
  }
});