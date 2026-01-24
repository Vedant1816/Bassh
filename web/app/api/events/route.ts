import { withAuth } from "@/app/services/protected";
import supabaseAdmin from "@/app/services/supabase-admin";

<<<<<<< HEAD
export const POST = withAuth(async (req: Request, user: any) => {
  const body = await req.json();
=======
export const POST = withAuth(async (req:Request, user:any) => {
  try {
    const body = await req.json();

    const {
      name,
      dj_name,
      dj_instagram,
      event_date,
      start_time,
      max_attendees,
      banner_image_url,
      dj_image_url,
      pricing, 
    } = body;

    /*  Basic validation */
    if (!name || !event_date || !start_time) {
      return Response.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    /* Insert event */
    const { data: event, error: eventError } =
      await supabaseAdmin
        .from("events")
        .insert({
          club_id: user.id, 
          name,
          dj_name,
          dj_instagram,
          event_date,
          start_time,
          max_attendees,
          banner_image_url,
          dj_image_url,
        })
        .select()
        .single();

    if (eventError) {
        if (eventError.code === "23505") {
    return Response.json(
      {
        error: "You already have an event with this name. Please choose a different name.",
      },
      { status: 409 }
    );
  }
      return Response.json(
        { error: eventError.message },
        { status: 400 }
      );
    }

    /* Insert ticket pricing*/
    if (Array.isArray(pricing) && pricing.length > 0) {
      const pricingRows = pricing.map((tier: any) => ({
        event_id: event.id,
        label: tier.label,
        price: tier.price,
      }));

      const { error: pricingError } =
        await supabaseAdmin
          .from("event_ticket_pricing")
          .insert(pricingRows);

      if (pricingError) {
        return Response.json(
          { error: pricingError.message },
          { status: 400 }
        );
      }
    }

    return Response.json(
      { event },
      { status: 201 }
    );

  } catch (err) {
    console.error("CREATE EVENT ERROR:", err);
    return Response.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
});
export const runtime = "nodejs";
>>>>>>> d7a7b2fa2c3310d5a60807f5d97d0051e733ade8

  const {
    name,
    role,
    clubName,
    location, // { address, latitude, longitude }
  } = body;

  /* ---------------- VALIDATION ---------------- */

  if (!role || !["user", "club"].includes(role)) {
    return Response.json(
      { error: "Invalid role" },
      { status: 400 }
    );
  }

<<<<<<< HEAD
  /* ---------------- USERS TABLE ---------------- */

  const { error: userError } = await supabaseAdmin
    .from("users")
    .insert({
      id: user.id,
      name,
      role,
    });

  if (userError) {
    return Response.json(
      { error: userError.message },
      { status: 500 }
    );
  }

  /* ---------------- ROLE: USER ---------------- */

  if (role === "user") {
    const { error } = await supabaseAdmin
      .from("customers")
      .insert({
        id: user.id,
        full_name: name,
        onboarding_completed: false,
      });

    if (error) {
      return Response.json(
        { error: error.message },
        { status: 500 }
      );
    }
  }

  /* ---------------- ROLE: CLUB ---------------- */

  if (role === "club") {
    if (!clubName || !location?.latitude || !location?.longitude) {
      return Response.json(
        { error: "Missing club details" },
        { status: 400 }
      );
    }

    const { error: clubError } = await supabaseAdmin
      .from("clubs")
      .insert({
        id: user.id,
        club_name: clubName,
        address_text: location.address,
        latitude: location.latitude,
        longitude: location.longitude,
      });

    if (clubError) {
      return Response.json(
        { error: clubError.message },
        { status: 500 }
      );
    }

    // 📍 Insert into heatmap locations
    const { error: locationError } = await supabaseAdmin.rpc(
      "insert_location",
      {
        p_name: clubName,
        p_category: "club",
        p_lat: location.latitude,
        p_lng: location.longitude,
      }
    );

    if (locationError) {
      return Response.json(
        { error: locationError.message },
        { status: 500 }
      );
    }
  }

  /* ---------------- DONE ---------------- */

  return Response.json({ ok: true });
});
=======
  return Response.json(data);
});
>>>>>>> d7a7b2fa2c3310d5a60807f5d97d0051e733ade8
