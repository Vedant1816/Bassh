import supabaseAdmin from "@/app/services/supabase-admin";
import { withAuth } from "@/app/services/protected";

export const runtime = "nodejs";

function todayDateString(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export const POST = withAuth(async (req: Request, _ctx: any, user: any) => {
  console.log("📱 [STAFF] QR Scan request received");

  try {
    const { qr_data } = await req.json();

    if (!qr_data) {
      return Response.json({ error: "QR data is required" }, { status: 400 });
    }

    const { data: staff, error: staffError } = await supabaseAdmin
      .from("staff")
      .select("id, club_id")
      .eq("id", user.id)
      .single();

    if (staffError || !staff) {
      return Response.json(
        { success: false, error: "Staff profile not found", code: "STAFF_NOT_FOUND" },
        { status: 403 }
      );
    }

    if (!staff.club_id) {
      return Response.json(
        { success: false, error: "You are not assigned to a club", code: "STAFF_NO_CLUB" },
        { status: 403 }
      );
    }

    const bookingId = qr_data.replace("BOOKING:", "").trim();

    const { data: booking, error } = await supabaseAdmin
      .from("bookings")
      .select(`
        id,
        booking_status,
        entry_status,
        qr_used,
        qr_used_at,
        entered_at,
        total_amount,
        booking_date,
        booking_time,
        participants,
        user_id,
        event_id,
        club_id,
        razorpay_payment_id,
        events (
          name,
          event_date,
          start_time,
          age_limit,
          dj_name,
          banner_image_url
        ),
        clubs (
          club_name,
          address_text,
          latitude,
          longitude
        )
      `)
      .eq("id", bookingId)
      .single();

    if (error || !booking) {
      return Response.json(
        { success: false, error: "Invalid QR code", code: "BOOKING_NOT_FOUND" },
        { status: 404 }
      );
    }

    // 🔥 FIX: Normalize relations (array → single object)
    const event = Array.isArray(booking.events)
      ? booking.events[0]
      : booking.events;

    const club = Array.isArray(booking.clubs)
      ? booking.clubs[0]
      : booking.clubs;

    let customer = null;
    if (booking.user_id) {
      const { data: customerData } = await supabaseAdmin
        .from("customers")
        .select("name, phone_number, email")
        .eq("id", booking.user_id)
        .single();

      if (customerData) customer = customerData;
    }

    const validationIssues: any[] = [];

    if (booking.club_id !== staff.club_id) {
      validationIssues.push({
        type: "WRONG_CLUB",
        message: "This QR code is for a different venue",
        severity: "error",
      });
    }

    const bookingDateStr =
      typeof booking.booking_date === "string"
        ? booking.booking_date.slice(0, 10)
        : booking.booking_date
        ? new Date(booking.booking_date).toISOString().slice(0, 10)
        : "";

    if (bookingDateStr !== todayDateString()) {
      validationIssues.push({
        type: "WRONG_DATE",
        message: "This QR code is not valid for today",
        severity: "error",
      });
    }

    if (booking.booking_status !== "confirmed") {
      validationIssues.push({
        type: "BOOKING_NOT_CONFIRMED",
        message: `Booking status is "${booking.booking_status}"`,
        severity: "error"
      });
    }

    if (!booking.razorpay_payment_id) {
      validationIssues.push({
        type: "PAYMENT_NOT_COMPLETED",
        message: "Payment not completed",
        severity: "error"
      });
    }

    if (booking.entry_status === "entered") {
      validationIssues.push({
        type: "ALREADY_ENTERED",
        message: `Already entered at ${booking.entered_at}`,
        severity: "error"
      });
    }

    if (booking.qr_used === true) {
      validationIssues.push({
        type: "QR_ALREADY_USED",
        message: `QR code already scanned at ${booking.qr_used_at}`,
        severity: "error"
      });
    }

    // ✅ FIXED event access
    if (event?.event_date) {
      const eventDate = new Date(event.event_date);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      eventDate.setHours(0, 0, 0, 0);

      if (eventDate < today) {
        validationIssues.push({
          type: "EVENT_PASSED",
          message: "Event date has passed",
          severity: "warning"
        });
      } else if (eventDate > today) {
        validationIssues.push({
          type: "EVENT_NOT_TODAY",
          message: `Event is scheduled for ${event.event_date}`,
          severity: "warning"
        });
      }
    }

    const errors = validationIssues.filter(i => i.severity === "error");
    if (errors.length > 0) {
      return Response.json(
        {
          success: false,
          error: errors[0].message,
          code: errors[0].type,
          validation_issues: validationIssues,
        },
        { status: 400 }
      );
    }

    const participants = booking.participants as any[];

    return Response.json({
      success: true,
      booking: {
        id: booking.id,
        status: booking.booking_status,
        entry_status: booking.entry_status,
        qr_used: booking.qr_used,
        total_amount: booking.total_amount,
        booking_date: booking.booking_date,
        booking_time: booking.booking_time,
        participants,
        participant_count: participants?.length || 0,

        event: event ? {
          name: event.name,
          date: event.event_date,
          time: event.start_time,
          age_limit: event.age_limit,
          dj_name: event.dj_name,
          banner_image: event.banner_image_url,
        } : null,

        club: club ? {
          name: club.club_name,
          address: club.address_text,
          location: {
            latitude: club.latitude,
            longitude: club.longitude,
          },
        } : null,

        customer: customer ? {
          name: customer.name,
          phone: customer.phone_number,
          email: customer.email,
        } : null,
      },

      warnings: validationIssues.filter(i => i.severity === "warning"),
    });

  } catch (err: any) {
    return Response.json(
      {
        success: false,
        error: err.message || "Failed to process QR code",
        code: "SCAN_ERROR",
      },
      { status: 500 }
    );
  }
});
