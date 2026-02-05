import { withAuth } from "@/app/services/protected";
import supabaseAdmin from "@/app/services/supabase-admin";

export const PATCH = withAuth(async (req: Request, user: { id: string }) => {
  try {
    const body = await req.json();

    const {
      club_name,
      club_desc,
      insta_link,
      facebook_link,
      twitter_link,
      contact_email,
      phone_number,
      tier,
      terms_and_conditions,
      privacy_policy
    } = body;

    const club_id = user.id;

    const updateData: any = {};

    if (club_name) updateData.club_name = club_name;
    if (club_desc) updateData.club_desc = club_desc;
    if (insta_link) updateData.insta_link = insta_link;
    if (facebook_link) updateData.facebook_link = facebook_link;
    if (twitter_link) updateData.twitter_link = twitter_link;
    if (contact_email) updateData.contact_email = contact_email;
    if (phone_number) updateData.phone_number = phone_number;
    if (tier) updateData.tier = tier;
    if (terms_and_conditions) updateData.terms_and_conditions = terms_and_conditions;
    if (privacy_policy) updateData.privacy_policy = privacy_policy;

    const { data: club, error: clubError } = await supabaseAdmin
      .from("clubs")
      .update(updateData)
      .eq("id", club_id)
      .select()
      .single();

    if (clubError) {
      return Response.json(
        { error: clubError.message },
        { status: 500 }
      );
    }

    return Response.json(
      { message: "Club updated successfully", club },
      { status: 200 }
    );

  } catch (err: any) {
    return Response.json(
      { error: err.message || "Internal server error" },
      { status: 500 }
    );
  }
});

export const GET = withAuth(async (req: Request, user: { id: string }) => {
  try {
    const { data: club, error } = await supabaseAdmin
      .from("clubs")
      .select(`
        id,
        club_name,
        club_desc,
        phone_number,
        insta_link,
        facebook_link,
        twitter_link,
        contact_email,
        address_text,
        latitude,
        longitude,
        tier,
        terms_and_conditions,
        privacy_policy
      `)
      .eq("id", user.id)
      .single();

    if (error || !club) {
      return Response.json(
        { error: "Club not found" },
        { status: 404 }
      );
    }

    return Response.json(club, { status: 200 });

  } catch (err: any) {
    return Response.json(
      { error: err.message || "Internal server error" },
      { status: 500 }
    );
  }
});

