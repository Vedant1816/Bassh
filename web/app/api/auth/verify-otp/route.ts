import crypto from "crypto";
import supabaseAdmin from "@/app/services/supabase-admin";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const { phone, otp } = await req.json();

    if (!phone || !otp) {
      return Response.json(
        { error: "Phone and OTP required" },
        { status: 400 }
      );
    }

    const otpHash = crypto
      .createHash("sha256")
      .update(otp)
      .digest("hex");

    const { data: row } = await supabaseAdmin
      .from("phone_otps")
      .select("id")
      .eq("phone", phone)
      .eq("otp_hash", otpHash)
      .eq("verified", false)
      .gt("expires_at", new Date().toISOString())
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!row) {
      return Response.json({ error: "Invalid or expired OTP" }, { status: 400 });
    }

    await supabaseAdmin
      .from("phone_otps")
      .update({ verified: true })
      .eq("id", row.id);

    return Response.json({ ok: true });
  } catch (err: any) {
    console.error("Verify OTP error:", err);
    return Response.json(
      { error: err.message || "Internal server error" },
      { status: 500 }
    );
  }
}
