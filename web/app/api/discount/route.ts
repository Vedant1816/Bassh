import { withAuth } from "@/app/services/protected";
import supabaseAdmin from "@/app/services/supabase-admin";

export const POST = withAuth(async (req: Request, user: { id: string }) => {
  try {
    const club_id = user.id;
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
      is_active = true,
    } = body as {
      eventIds?: string[];
      name: string;
      code: string;
      discount_type: "percentage" | "flat";
      discount_value: number;
      min_purchase?: number | null;
      max_discount?: number | null;
      start_date: string;
      end_date: string;
      start_time?: string | null;
      end_time?: string | null;
      applicable_days: number[];
      description?: string;
      exclusions?: string;
      is_active?: boolean;
    };

    if (
      !name ||
      !code ||
      !club_id ||
      !discount_type ||
      discount_value === undefined ||
      !start_date ||
      !end_date ||
      !applicable_days?.length
    ) {
      return Response.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }
    const { data: discount, error } = await supabaseAdmin
  .from("discounts")
  .insert({
    club_id,
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
  })
  .select()
  .single();


    if (error) {
      return Response.json(
        { error: error.message },
        { status: 400 }
      );
    }

    if (eventIds.length > 0) {
     const { error: err } = await supabaseAdmin
      .from("discounts")
      .update({ event_specific: true })
      .eq("id", discount.id)
      
     if (err) {
      return Response.json(
        { error: err.message },
        { status: 400 }
      );
    }

  const { error} = await supabaseAdmin
    .from("discount_events")
    .insert(
      eventIds.map((event_id) => ({
        discount_id: discount.id,
        event_id,
      }))
    );
    if (error) {
      return Response.json(
        { error: error.message },
        { status: 400 }
      );
    }
  }


    return Response.json(
      { success: true },
      { status: 201 }
    );

  } catch (err: any) {
    return Response.json(
      { error: err?.message || "Internal server error" },
      { status: 500 }
    );
  }
});

export const GET = withAuth(async (req: Request, user: { id: string }) => {
  try {
    const clubId = user.id;
    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search")?.trim();

    let query = supabaseAdmin
      .from("discounts")
      .select(`
        *,
        discount_events ( event_id )
      `)
      .eq("club_id", clubId)
      .order("created_at", { ascending: false });

    if (search) {
      query = query.ilike("name", `%${search}%`);
    }

    const { data, error } = await query;

    if (error) {
      return Response.json({ error: error.message }, { status: 500 });
    }

    return Response.json({ data: data ?? [] }, { status: 200 });

  } catch (err) {
    console.error(err);
    return Response.json(
      { error: "Something went wrong" },
      { status: 500 }
    );
  }
});


