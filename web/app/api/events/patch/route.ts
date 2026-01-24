import { withAuth } from "@/app/services/protected";
import supabaseAdmin from "@/app/services/supabase-admin";

export const PATCH = withAuth(async (req: Request, user: { id: string }) => {
  try {
    const { searchParams } = new URL(req.url);
    const eventId = searchParams.get("eventId");

    if (!eventId) {
      return Response.json(
        { error: "eventId is required" },
        { status: 400 }
      );
    }

    const body = await req.json();

    const {
      name,
      event_date,
      start_time,
      dj_name,
      dj_instagram,
      max_attendees,
      banner_image_url,
      dj_image_url,
      pricing,
    } = body;

    /* ---------------- UPDATE EVENT ---------------- */

    const updatePayload: any = {
      name,
      event_date,
      start_time,
      dj_name,
      dj_instagram,
      max_attendees,
      banner_image_url,
      dj_image_url,
    };

    // only update images if provided
    if (banner_image_url !== undefined) {
      updatePayload.banner_image_url = banner_image_url;
    }

    if (dj_image_url !== undefined) {
      updatePayload.dj_image_url = dj_image_url;
    }

    const { error: eventError } = await supabaseAdmin
      .from("events")
      .update(updatePayload)
      .eq("id", eventId)
      .eq("club_id", user.id);

    if (eventError) {
      return Response.json(
        { error: eventError.message },
        { status: 500 }
      );
    }

    /* UPDATE PRICING */

    if (Array.isArray(pricing)) {
      // delete old pricing
      const { error: deleteError } = await supabaseAdmin
        .from("event_ticket_pricing")
        .delete()
        .eq("event_id", eventId);

      if (deleteError) {
        return Response.json(
          { error: deleteError.message },
          { status: 500 }
        );
      }

      // insert new pricing
      if (pricing.length > 0) {
        const { error: insertError } = await supabaseAdmin
          .from("event_ticket_pricing")
          .insert(
            pricing.map((p: any) => ({
              event_id: eventId,
              label: p.label,
              price: p.price,
            }))
          );

        if (insertError) {
          return Response.json(
            { error: insertError.message },
            { status: 500 }
          );
        }
      }
    }

    return Response.json({ success: true }, { status: 200 });
  } catch (err) {
    console.error(err);
    return Response.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
});

export const GET = withAuth(async (req: Request, user: { id: string }) => {
  try {
    const { searchParams } = new URL(req.url);
    const eventId = searchParams.get("eventId");

    if (!eventId) {
      return Response.json(
        { error: "eventId is required" },
        { status: 400 }
      );
    }

    const { data, error } = await supabaseAdmin
      .from("events")
      .select(`
        *,
        event_ticket_pricing (
          id,
          label,
          price
        )
      `)
      .eq("id", eventId)         
      .eq("club_id", user.id)
      .single();                  

    if (error) {
      return Response.json({ error: error.message }, { status: 500 });
    }

    return Response.json(data, { status: 200 });
  } catch (err) {
    console.error(err);
    return Response.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
});

