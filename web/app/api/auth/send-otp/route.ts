import crypto from "crypto";
import supabaseAdmin from "@/app/services/supabase-admin";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const { phone } = await req.json();

    if (!phone) {
      return Response.json({ error: "Phone required" }, { status: 400 });
    }

    // Validate phone format
    if (typeof phone !== "string" || !/^\+\d{10,15}$/.test(phone)) {
      return Response.json({ error: "Invalid phone number format" }, { status: 400 });
    }

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpHash = crypto
      .createHash("sha256")
      .update(otp)
      .digest("hex");

    // Always log OTP to server console (for development)
    console.log("[OTP] Phone:", phone, "| OTP:", otp);

    // Save OTP hash to database with 5-minute expiry
    await supabaseAdmin.from("phone_otps").insert({
      phone,
      otp_hash: otpHash,
      expires_at: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
    });

    // Send OTP via Twilio
    const twilioAccountSid = process.env.TWILIO_ACCOUNT_SID;
    const twilioAuthToken = process.env.TWILIO_AUTH_TOKEN;
    const twilioPhoneNumber = process.env.TWILIO_PHONE_NUMBER;

    if (twilioAccountSid && twilioAuthToken && twilioPhoneNumber) {
      try {
        const credentials = Buffer.from(`${twilioAccountSid}:${twilioAuthToken}`).toString("base64");
        
        const res = await fetch(
          `https://api.twilio.com/2010-04-01/Accounts/${twilioAccountSid}/Messages.json`,
          {
            method: "POST",
            headers: {
              Authorization: `Basic ${credentials}`,
              "Content-Type": "application/x-www-form-urlencoded",
            },
            body: new URLSearchParams({
              From: twilioPhoneNumber,
              To: phone,
              Body: `Your verification code is: ${otp}. Valid for 5 minutes.`,
            }),
          }
        );

        const data = await res.json();

        if (!res.ok) {
          console.error("[OTP] Twilio error:", data);
          return Response.json(
            { error: "Failed to send SMS. Please try again." },
            { status: 500 }
          );
        }

        console.log("[OTP] SMS sent successfully via Twilio:", data.sid);
      } catch (twilioError: any) {
        console.error("[OTP] Twilio request failed:", twilioError);
        return Response.json(
          { error: "Failed to send SMS. Please try again." },
          { status: 500 }
        );
      }
    } else {
      console.warn("[OTP] No Twilio credentials — use OTP from console above");
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