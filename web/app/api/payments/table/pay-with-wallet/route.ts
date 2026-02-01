// @ts-ignore - qrcode doesn't have types
import QRCode from "qrcode";
import supabaseAdmin from "@/app/services/supabase-admin";
import { withAuth } from "@/app/services/protected";

export const runtime = "nodejs";

export const POST = withAuth(async (req: Request, _ctx: any, user: any) => {
  console.log("🔄 [BACKEND] POST /api/payments/table/pay-with-wallet - Request received");

  try {
    const body = await req.json();
    const {
      club_id,
      booking_date,
      total_amount,
      discount_amount,
      participants,
    } = body;

    const amountNum = Number(total_amount) || 0;
    const money_saved = Number(discount_amount) || 0;

    if (!club_id || !booking_date || amountNum <= 0 || !participants || participants.length === 0) {
      return Response.json(
        { error: "Invalid booking data" },
        { status: 400 }
      );
    }

    const invalidParticipants = participants.filter(
      (p: any) => !p.name || !p.gender || !p.age
    );
    if (invalidParticipants.length > 0) {
      return Response.json(
        { error: "All participants must have name, gender, and age" },
        { status: 400 }
      );
    }

    // Verify club exists
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

    // Verify customer and wallet balance
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
    if (balance < amountNum) {
      return Response.json(
        { error: `Insufficient wallet balance. Available: ₹${balance.toFixed(0)}` },
        { status: 400 }
      );
    }

    const newBalance = balance - amountNum;

    // 1. Create booking
    const bookingData: Record<string, any> = {
      user_id: user.id,
      club_id,
      event_id: null,
      participants,
      total_amount: amountNum,
      money_saved,
      booking_date,
      booking_time: "00:00:00",
      booking_status: "confirmed",
      entry_status: "not_entered",
      qr_used: false,
    };

    const { data: booking, error: bookingError } = await supabaseAdmin
      .from("bookings")
      .insert(bookingData)
      .select("id")
      .single();

    if (bookingError) {
      console.error("❌ [BACKEND] Failed to create booking:", bookingError);
      return Response.json(
        { error: "Failed to create booking" },
        { status: 500 }
      );
    }

    // 2. Create transaction
    const { error: txError } = await supabaseAdmin
      .from("transactions")
      .insert({
        user_id: user.id,
        club_id,
        event_id: null,
        booking_id: booking.id,
        razorpay_order_id: null,
        razorpay_payment_id: null,
        amount: amountNum,
        status: "success",
        is_wallet: true,
        wallet_added: false,
        wallet_used: true,
      });

    if (txError) {
      console.error("❌ [BACKEND] Failed to create transaction:", txError);
      // Booking already created - try to rollback or log
    }

    // 3. Deduct from wallet
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

    // 4. Generate QR code
    const qrData = `BOOKING:${booking.id}`;
    let qrCode = "";
    try {
      qrCode = await QRCode.toDataURL(qrData, { width: 300, margin: 2 });
      await supabaseAdmin
        .from("bookings")
        .update({ qr_code: qrCode })
        .eq("id", booking.id);
    } catch (qrErr: any) {
      console.warn("⚠️ [BACKEND] QR generation failed:", qrErr.message);
    }

    console.log("✅ [BACKEND] Table booking paid with wallet:", {
      user_id: user.id,
      booking_id: booking.id,
      amount: amountNum,
      newBalance,
    });

    return Response.json({
      success: true,
      booking_id: booking.id,
      wallet_balance: newBalance,
      qr_code: qrCode || null,
      qr: qrCode || null,
    });
  } catch (err: any) {
    console.error("❌ [BACKEND] Table pay-with-wallet error:", err.message);
    return Response.json(
      { error: err.message || "Failed to pay with wallet" },
      { status: 500 }
    );
  }
});
