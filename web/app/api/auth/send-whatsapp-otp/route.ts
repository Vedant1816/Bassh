import crypto from "crypto";
import supabaseAdmin from "@/app/services/supabase-admin";
import twilio from "twilio";

// Initialize Twilio client only if credentials are available
function getTwilioClient() {
  const sid = process.env.TWILIO_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;

  if (!sid || !authToken) {
    throw new Error("Twilio credentials not configured. Please set TWILIO_SID and TWILIO_AUTH_TOKEN environment variables.");
  }

  return twilio(sid, authToken);
}

export async function POST(req: Request) {
  try {
    const { phone } = await req.json();

    if (!phone) {
      return Response.json({ error: "Phone required" }, { status: 400 });
    }

    // 1️⃣ Generate OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpHash = crypto
      .createHash("sha256")
      .update(otp)
      .digest("hex");

    // 2️⃣ Store OTP
    await supabaseAdmin.from("phone_otps").insert({
      phone,
      otp_hash: otpHash,
      expires_at: new Date(Date.now() + 5 * 60 * 1000), // 5 min
    });

    // 3️⃣ Send WhatsApp
    try {
      const client = getTwilioClient();
      await client.messages.create({
        from: "whatsapp:+14155238886", // Twilio sandbox
        to: `whatsapp:${phone}`,
        body: `Your BASH verification code is ${otp}. Valid for 5 minutes.`,
      });
    } catch (twilioError: any) {
      console.error("Twilio error:", twilioError);
      // Still return success if OTP was stored (user can verify manually)
      // Or return error if you want to fail the request
      return Response.json(
        { 
          error: twilioError.message || "Failed to send WhatsApp message. Please check Twilio configuration.",
          otp: process.env.NODE_ENV === "development" ? otp : undefined // Only return OTP in dev mode
        },
        { status: 500 }
      );
    }

    return Response.json({ ok: true });
  } catch (err: any) {
    console.error("Send WhatsApp OTP error:", err);
    return Response.json(
      { error: err.message || "Internal server error" },
      { status: 500 }
    );
  }
}