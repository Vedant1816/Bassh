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

    // Get staff's club_id
    const { data: staff, error: staffError } = await supabaseAdmin
      .from("staff")
      .select("id, club_id")
      .eq("id", user.id)
      .single();

    if (staffError || !staff) {
      console.error("❌ [STAFF] Staff record not found:", staffError);
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

    // Extract booking_id from QR (format: "BOOKING:uuid")
    const bookingId = qr_data.replace("BOOKING:", "").trim();

    console.log("🔍 [STAFF] Looking up booking:", bookingId);

    // Fetch booking with all related data
    // Note: Remove customers join and fetch separately
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
      console.error("❌ [STAFF] Booking not found:", error);
      return Response.json(
        { 
          success: false,
          error: "Invalid QR code or booking not found",
          code: "BOOKING_NOT_FOUND",
          debug: error?.message
        },
        { status: 404 }
      );
    }

    // Fetch customer details separately using user_id
    let customer = null;
    if (booking.user_id) {
      const { data: customerData, error: customerError } = await supabaseAdmin
        .from("customers")
        .select("name, phone_number, email")
        .eq("id", booking.user_id)
        .single();
      
      if (!customerError && customerData) {
        customer = customerData;
      }
    }

    // Validation checks
    const validationIssues = [];

    // Check: QR must be for the same club as staff
    if (booking.club_id !== staff.club_id) {
      validationIssues.push({
        type: "WRONG_CLUB",
        message: "This QR code is for a different venue",
        severity: "error",
      });
    }

    // Check: Booking date must be today
    const bookingDateStr =
      typeof booking.booking_date === "string"
        ? booking.booking_date.slice(0, 10)
        : booking.booking_date
          ? new Date(booking.booking_date).toISOString().slice(0, 10)
          : "";
    const todayStr = todayDateString();
    if (bookingDateStr !== todayStr) {
      validationIssues.push({
        type: "WRONG_DATE",
        message: "This QR code is not valid for today",
        severity: "error",
      });
    }

    // Check 1: Booking must be confirmed
    if (booking.booking_status !== "confirmed") {
      validationIssues.push({
        type: "BOOKING_NOT_CONFIRMED",
        message: `Booking status is "${booking.booking_status}"`,
        severity: "error"
      });
    }

    // Check 2: Payment must be completed
    if (!booking.razorpay_payment_id) {
      validationIssues.push({
        type: "PAYMENT_NOT_COMPLETED",
        message: "Payment not completed",
        severity: "error"
      });
    }

    // Check 3: Already entered (using entry_status)
    if (booking.entry_status === "entered") {
      validationIssues.push({
        type: "ALREADY_ENTERED",
        message: `Already entered at ${booking.entered_at}`,
        severity: "error"
      });
    }

    // Check 4: QR already used (using qr_used flag)
    if (booking.qr_used === true) {
      validationIssues.push({
        type: "QR_ALREADY_USED",
        message: `QR code already scanned at ${booking.qr_used_at}`,
        severity: "error"
      });
    }

    // Check 5: Event date validation (optional warning)
    if (booking.events?.event_date) {
      const eventDate = new Date(booking.events.event_date);
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
          message: `Event is scheduled for ${booking.events.event_date}`,
          severity: "warning"
        });
      }
    }

    // If there are ERROR-level issues, return them
    const errors = validationIssues.filter(issue => issue.severity === "error");
    if (errors.length > 0) {
      console.log("⚠️ [STAFF] Validation failed:", errors);
      return Response.json(
        {
          success: false,
          error: errors[0].message,
          code: errors[0].type,
          validation_issues: validationIssues,
          booking: {
            id: booking.id,
            status: booking.booking_status,
            entry_status: booking.entry_status,
            qr_used: booking.qr_used,
            event: booking.events,
          },
        },
        { status: 400 }
      );
    }

    console.log("✅ [STAFF] Valid booking found");

    // Parse participants (it's stored as JSONB)
    const participants = booking.participants as any[];

    // Return booking details WITHOUT marking as entered
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
        
        // Participant details
        participants: participants,
        participant_count: participants?.length || 0,
        
        // Event details
        event: booking.events ? {
          name: booking.events.name,
          date: booking.events.event_date,
          time: booking.events.start_time,
          age_limit: booking.events.age_limit,
          dj_name: booking.events.dj_name,
          banner_image: booking.events.banner_image_url,
        } : null,
        
        // Club details
        club: booking.clubs ? {
          name: booking.clubs.club_name,
          address: booking.clubs.address_text,
          location: {
            latitude: booking.clubs.latitude,
            longitude: booking.clubs.longitude,
          },
        } : null,
        
        // Customer details (booking owner)
        customer: customer ? {
          name: customer.name,
          phone: customer.phone_number,
          email: customer.email,
        } : null,
      },
      
      // Include warnings if any
      warnings: validationIssues.filter(issue => issue.severity === "warning"),
    });
  } catch (err: any) {
    console.error("❌ [STAFF] Scan QR error:", err);
    return Response.json(
      {
        success: false,
        error: err.message || "Failed to process QR code",
        code: "SCAN_ERROR",
        stack: process.env.NODE_ENV === "development" ? err.stack : undefined,
      },
      { status: 500 }
    );
  }
});