import supabaseAdmin from "@/app/services/supabase-admin";
import { withAuth } from "@/app/services/protected";

export const PATCH = withAuth(async (req: Request, user: { id: string }) => {
  try {
    const { searchParams } = new URL(req.url);
    const discountId = searchParams.get("discountId");

    if (!discountId) {
      return Response.json(
        { error: "Missing discountId" },
        { status: 400 }
      );
    }

    const body = await req.json();

    const {
      eventIds = [],
      name,
      code,
      discount_type,
      discount_value,
      min_purchase,
      max_discount,
      start_date,
      end_date,
      start_time,
      end_time,
      applicable_days,
      description,
      exclusions,
      is_active,
    } = body;

    const { error: discountError } = await supabaseAdmin
      .from("discounts")
      .update({
        name,
        code,
        discount_type,
        discount_value,
        min_purchase,
        max_discount,
        start_date,
        end_date,
        start_time,
        end_time,
        applicable_days,
        description,
        exclusions,
        is_active,
        event_specific: eventIds.length > 0,
      })
      .eq("id", discountId)
      .eq("club_id", user.id);

    if (discountError) {
      return Response.json(
        { error: discountError.message },
        { status: 500 }
      );
    }

    // Delete old links
    const { error: deleteError } = await supabaseAdmin
      .from("discount_events")
      .delete()
      .eq("discount_id", discountId);

    if (deleteError) {
      return Response.json(
        { error: deleteError.message },
        { status: 500 }
      );
    }

    // Insert new links (if any)
    if (eventIds.length > 0) {
      const rows = eventIds.map((event_id: string) => ({
        discount_id: discountId,
        event_id,
      }));

      const { error: insertError } = await supabaseAdmin
        .from("discount_events")
        .insert(rows);

      if (insertError) {
        return Response.json(
          { error: insertError.message },
          { status: 500 }
        );
      }
    }

    return Response.json({ success: true }, { status: 200 });

  } catch (err) {
    console.error(err);
    return Response.json(
      { error: "Something went wrong" },
      { status: 500 }
    );
  }
});

export const GET = withAuth(async (req: Request, user: { id: string }) => {
  try {
    const { searchParams } = new URL(req.url);
    const discountId = searchParams.get("discountId");

    if (!discountId) {
      return Response.json(
        { error: "Missing discountId" },
        { status: 400 }
      );
    }

    const { data, error } = await supabaseAdmin
      .from("discounts")
      .select(`
        *,
        discount_events ( event_id )
      `)
      .eq("id", discountId)
      .eq("club_id", user.id) 
      .single(); 

    if (error) {
      return Response.json(
        { error: error.message },
        { status: 400 }
      );
    }

    return Response.json({ data }, { status: 200 });

  } catch (err) {
    console.error(err);
    return Response.json(
      { error: "Something went wrong" },
      { status: 500 }
    );
  }
});
