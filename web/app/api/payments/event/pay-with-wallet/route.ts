// @ts-ignore - qrcode doesn't have types
import QRCode from "qrcode";
import supabaseAdmin from "@/app/services/supabase-admin";
import { withAuth } from "@/app/services/protected";

export const runtime = "nodejs";

export const POST = withAuth(async (req: Request, _ctx: any, user: any) => {
  console.log("🔄 [BACKEND] POST /api/payments/event/pay-with-wallet - Request received");

  try {
    const body = await req.json();
    const { event_id, total_amount, discount_amount, participants } = body;

    const amountNum = Number(total_amount) || 0;
    const money_saved = Number(discount_amount) || 0;

    if (!event_id || amountNum <= 0 || !participants || participants.length === 0) {
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

    // Fetch event for club_id, booking_date, booking_time
    const { data: event, error: eventError } = await supabaseAdmin
      .from("events")
      .select("id, club_id, event_date, start_time")
      .eq("id", event_id)
      .single();

    if (eventError || !event || !event.club_id) {
      return Response.json(
        { error: "Event not found" },
        { status: 404 }
      );
    }

    const booking_date = event.event_date;
    const booking_time = event.start_time || "00:00:00";

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
      club_id: event.club_id,
      event_id,
      participants,
      total_amount: amountNum,
      money_saved,
      booking_date,
      booking_time,
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
      console.error("❌ [BACKEND] Failed to create event booking:", bookingError);
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
        club_id: event.club_id,
        event_id,
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

    console.log("✅ [BACKEND] Event booking paid with wallet:", {
      user_id: user.id,
      booking_id: booking.id,
      event_id,
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
    console.error("❌ [BACKEND] Event pay-with-wallet error:", err.message);
    return Response.json(
      { error: err.message || "Failed to pay with wallet" },
      { status: 500 }
    );
  }
});
