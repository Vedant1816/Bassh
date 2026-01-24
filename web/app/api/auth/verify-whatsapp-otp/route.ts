import crypto from "crypto";
import supabaseAdmin from "@/app/services/supabase-admin";
import { withAuth } from "@/app/services/protected";

export const POST = withAuth(async (req, user) => {
  const { phone, otp } = await req.json();

  const otpHash = crypto
    .createHash("sha256")
    .update(otp)
    .digest("hex");

  const { data } = await supabaseAdmin
    .from("phone_otps")
    .select("*")
    .eq("phone", phone)
    .eq("otp_hash", otpHash)
    .eq("verified", false)
    .gt("expires_at", new Date().toISOString())
    .single();

  if (!data) {
    return Response.json({ error: "Invalid or expired OTP" }, { status: 400 });
  }

  // Mark OTP used
  await supabaseAdmin
    .from("phone_otps")
    .update({ verified: true })
    .eq("id", data.id);

  // Save phone to customers
  await supabaseAdmin
    .from("customers")
    .update({ phone_number: phone })
    .eq("id", user.id);

  return Response.json({ ok: true });
});