import crypto from "crypto";
import supabaseAdmin from "@/app/services/supabase-admin";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const { phone, otp } = await req.json();

    if (!phone || !otp) {
      return Response.json(
        { error: "Phone and OTP are required" },
        { status: 400 }
      );
    }

    // Hash the provided OTP
    const otpHash = crypto
      .createHash("sha256")
      .update(otp)
      .digest("hex");

    // Find matching OTP record
    const { data: otpRecords, error: fetchError } = await supabaseAdmin
      .from("phone_otps")
      .select("*")
      .eq("phone", phone)
      .eq("otp_hash", otpHash)
      .order("created_at", { ascending: false })
      .limit(1);

    if (fetchError) {
      console.error("Database fetch error:", fetchError);
      return Response.json(
        { error: "Failed to verify OTP" },
        { status: 500 }
      );
    }

    if (!otpRecords || otpRecords.length === 0) {
      return Response.json(
        { error: "Invalid OTP" },
        { status: 400 }
      );
    }

    const otpRecord = otpRecords[0];

    // Check if OTP has expired
    if (new Date(otpRecord.expires_at) < new Date()) {
      return Response.json(
        { error: "OTP has expired. Please request a new one." },
        { status: 400 }
      );
    }

    // Delete used OTP
    await supabaseAdmin
      .from("phone_otps")
      .delete()
      .eq("id", otpRecord.id);

    return Response.json({ ok: true });
  } catch (err: any) {
    console.error("Verify OTP error:", err);
    return Response.json(
      { error: err.message || "Internal server error" },
      { status: 500 }
    );
  }
}