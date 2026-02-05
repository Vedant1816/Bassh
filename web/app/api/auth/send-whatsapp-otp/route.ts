import crypto from "crypto";
import supabaseAdmin from "@/app/services/supabase-admin";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const { phone } = await req.json();

    if (!phone) {
      return Response.json({ error: "Phone required" }, { status: 400 });
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpHash = crypto
      .createHash("sha256")
      .update(otp)
      .digest("hex");

    // Always log OTP to server console (for development)
    console.log("[OTP] Phone:", phone, "| OTP:", otp);

    await supabaseAdmin.from("phone_otps").insert({
      phone,
      otp_hash: otpHash,
      expires_at: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
    });

    const apiKey = process.env.FAST2SMS_API_KEY;
    if (apiKey) {
      const res = await fetch("https://www.fast2sms.com/dev/bulkV2", {
        method: "POST",
        headers: {
          authorization: apiKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          route: "otp",
          variables_values: otp,
          numbers: phone.replace("+91", ""),
        }),
      });
      const data = (await res.json().catch(() => ({}))) as { return?: boolean; message?: string };
      if (!res.ok || data.return === false) {
        console.warn("[OTP] Fast2SMS failed (use console OTP):", data.message);
      }
    } else {
      console.warn("[OTP] No FAST2SMS_API_KEY — use OTP from console above");
    }

    return Response.json({ ok: true });
  } catch (err: any) {
    console.error("Send OTP error:", err);
    return Response.json(
      { error: err.message || "Internal server error" },
      { status: 500 }
    );
  }
}
