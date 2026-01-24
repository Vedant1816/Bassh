import crypto from "crypto";
import supabaseAdmin from "@/app/services/supabase-admin";
import twilio from "twilio";

const client = twilio(
  process.env.TWILIO_SID!,
  process.env.TWILIO_AUTH_TOKEN!
);

export async function POST(req: Request) {
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
  await client.messages.create({
    from: "whatsapp:+14155238886", // Twilio sandbox
    to: `whatsapp:${phone}`,
    body: `Your BASH verification code is ${otp}. Valid for 5 minutes.`,
  });

  return Response.json({ ok: true });
}