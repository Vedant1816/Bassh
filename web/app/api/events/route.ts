import { withAuth } from "@/app/services/protected";
import supabaseAdmin from "@/app/services/supabase-admin";

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

export const GET = withAuth(async (_req: Request, _params: any, _user: any) => {
  const { data, error } = await supabaseAdmin
    .from("events")
    .select("*")
    .order("event_date", { ascending: true })
    .order("event_time", { ascending: true });

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json(data);
});
