import supabaseAdmin from "@/app/services/supabase-admin";
import { withAuth } from "@/app/services/protected";
import QRCode from "qrcode";

export const GET = withAuth(async (req: Request, user: { id: string }) => {
  try {
    const clubId = user.id;
    const { searchParams } = new URL(req.url);

    /* ================= QUERY PARAMS ================= */

    const searchName = searchParams.get("search");

    const eventIdsParam = searchParams.get("eventIds"); // e1,e2
    const statusParam = searchParams.get("statuses");   // approved,pending
    const tagsParam = searchParams.get("tags");         // vip,regular,new

    const eventIds = eventIdsParam
      ? eventIdsParam.split(",").map((id) => id.trim())
      : null;

    const statuses = statusParam
      ? statusParam.split(",").map((s) => s.trim())
      : null;

    const tags = tagsParam
      ? tagsParam.split(",").map((t) => t.trim().toLowerCase())
      : null;

    /* ================= SEARCH USERS ================= */

    let matchingUserIds: string[] | null = null;

    if (searchName) {
      const { data: users, error } = await supabaseAdmin
        .from("users")
        .select("id")
        .ilike("name", `%${searchName}%`);

      if (error) throw error;

      matchingUserIds = users.map((u) => u.id);

      if (matchingUserIds.length === 0) {
        return Response.json({ success: true, count: 0, data: [] });
      }
    }

    /* ================= FETCH GUESTS ================= */

    let query = supabaseAdmin
      .from("guests")
      .select(`
        id,
        user_id,
        club_id,
        event_id,
        phone,
        status,
        vip,
        created_at,
        events ( name )
      `)
      .eq("club_id", clubId);

    if (matchingUserIds) {
      query = query.in("user_id", matchingUserIds);
    }

    if (eventIds && eventIds.length > 0) {
      query = query.in("event_id", eventIds);
    }

    if (statuses && statuses.length > 0) {
      query = query.in("status", statuses);
    }

    const { data: guests, error } = await query;
    if (error) throw error;

    if (!guests || guests.length === 0) {
      return Response.json({ success: true, count: 0, data: [] });
    }

    /* ================= FETCH USERS ================= */

    const userIds = [...new Set(guests.map((g: any) => g.user_id))];

    const { data: users, error: usersError } = await supabaseAdmin
      .from("users")
      .select("id, name, email")
      .in("id", userIds);

    if (usersError) throw usersError;

    const usersMap = new Map(users.map((u: any) => [u.id, u]));

    /* ================= FETCH BOOKINGS ================= */

    const { data: bookings, error: bookingsError } = await supabaseAdmin
      .from("bookings")
      .select("user_id, club_id, entered_at")
      .in("user_id", userIds)
      .eq("club_id", clubId)
      .eq("entry_status", "entered");

    if (bookingsError) throw bookingsError;

    /* ================= AGGREGATE VISITS ================= */

    const bookingMap = new Map<
      string,
      { visits: number; last_visited: string | null }
    >();

    for (const b of bookings) {
      const key = `${b.user_id}:${b.club_id}`;
      const current = bookingMap.get(key);

      if (!current) {
        bookingMap.set(key, {
          visits: 1,
          last_visited: b.entered_at,
        });
      } else {
        current.visits += 1;
        if (
          b.entered_at &&
          (!current.last_visited || b.entered_at > current.last_visited)
        ) {
          current.last_visited = b.entered_at;
        }
      }
    }

    /* ================= FORMAT ================= */

    let formatted = guests.map((g: any) => {
      const bookingInfo = bookingMap.get(`${g.user_id}:${g.club_id}`);
      const visits = bookingInfo?.visits ?? 0;
      const lastVisited = bookingInfo?.last_visited ?? null;

      const tagsArr: string[] = [];
      if (g.vip) tagsArr.push("VIP");
      if (visits > 3) tagsArr.push("Regular");
      if (visits <= 3) tagsArr.push("New");

      const userInfo = usersMap.get(g.user_id);

      return {
        guest_id: g.id,
        user_id: g.user_id,
        name: userInfo?.name ?? null,
        email: userInfo?.email ?? null,
        club_id: g.club_id,
        event_id: g.event_id,
        event_name: g.events?.name ?? null,
        phone: g.phone,
        status: g.status,
        visits,
        last_visited: lastVisited,
        tags: tagsArr,
      };
    });

    /* ================= TAG FILTER ================= */

    if (tags && tags.length > 0) {
      formatted = formatted.filter((g) =>
        tags.some((t) =>
          g.tags.map((x) => x.toLowerCase()).includes(t)
        )
      );
    }

    return Response.json({
      success: true,
      count: formatted.length,
      data: formatted,
    });
  } catch (err) {
    console.error("GET GUESTS ERROR:", err);
    return new Response("Failed to fetch guests", { status: 500 });
  }
});



/* ======================================================
   POST : Update guest (VIP / approve / suspend)
====================================================== */


export const POST = withAuth(async (req: Request, user: { id: string }) => {
  try {
    const clubId = user.id;
    const body = await req.json();

    const { guest_id, action } = body;

    /* ================= VALIDATION ================= */

    if (!guest_id || !action) {
      return new Response("guest_id and action are required", { status: 400 });
    }

    if (!["make_vip", "approve", "suspend"].includes(action)) {
      return new Response("Invalid action", { status: 400 });
    }

    /* ================= FETCH GUEST ================= */

    const { data: guest, error: guestError } = await supabaseAdmin
      .from("guests")
      .select("id, club_id, booking_id, user_id, event_id")
      .eq("id", guest_id)
      .eq("club_id", clubId)
      .single();

    if (guestError || !guest) {
      return new Response("Guest not found", { status: 404 });
    }

    /* ================= UPDATE GUEST ================= */

    let guestUpdate: Record<string, any> = {};

    if (action === "make_vip") {
      guestUpdate = {
        vip: true,
        status: "approved",
      };
    } else if (action === "approve") {
      guestUpdate = {
        status: "approved",
      };
    } else if (action === "suspend") {
      guestUpdate = {
        status: "suspended",
      };
    }

    await supabaseAdmin
      .from("guests")
      .update(guestUpdate)
      .eq("id", guest_id);

    /* ================= BOOKING UPDATE (ONLY FOR APPROVE / VIP) ================= */

    if (action === "approve" || action === "make_vip") {
      const bookingId = guest.booking_id;

      // 1️⃣ Mark booking as confirmed
      await supabaseAdmin
        .from("bookings")
        .update({ booking_status: "confirmed" })
        .eq("id", bookingId);

      // 2️⃣ Generate QR code
      try {
        const qrData = `BOOKING:${bookingId}`;
        const qrCode = await QRCode.toDataURL(qrData, {
          width: 300,
          margin: 2,
        });

        await supabaseAdmin
          .from("bookings")
          .update({ qr_code: qrCode })
          .eq("id", bookingId);
      } catch (qrErr: any) {
        console.warn(
          "⚠️ [BACKEND] QR generation failed:",
          qrErr.message
        );
      }

      /* ================= SEND NOTIFICATION ================= */

      try {
        // Fetch event details for the notification
        const { data: event } = await supabaseAdmin
          .from("events")
          .select("name")
          .eq("id", guest.event_id)
          .single();

        // Fetch user details to get username
        const { data: userDetails } = await supabaseAdmin
          .from("users")
          .select("name")
          .eq("id", guest.user_id)
          .single();

        if (event && userDetails) {
          const notificationTitle = action === "make_vip"
            ? "VIP Access Granted! 🌟"
            : "Guest List Approved! 🎉";

          const notificationMessage = action === "make_vip"
            ? `Congratulations! You've been granted VIP access to ${event.name}. See you at the event!`
            : `You're on the guest list for ${event.name}. See you at the event!`;

          // Create notification directly in the database
          await supabaseAdmin
            .from("notifications")
            .insert({
              user_id: guest.user_id,
              title: notificationTitle,
              message: notificationMessage,
              type: "guest_list",
              metadata: {
                booking_id: bookingId,
                event_id: guest.event_id,
                is_vip: action === "make_vip",
              },
              is_read: false,
              created_at: new Date().toISOString(),
            });

          console.log(`✅ [NOTIFICATIONS] Sent ${action} notification to user ${guest.user_id}`);
        }
      } catch (notifErr: any) {
        console.error("❌ Failed to send guest list notification:", notifErr);
        // Don't block the guest update if notification fails
      }
    }

    return Response.json({
      success: true,
      message: "Guest updated successfully",
    });
  } catch (err) {
    console.error("POST GUEST ACTION ERROR:", err);
    return new Response("Failed to update guest", { status: 500 });
  }
});
