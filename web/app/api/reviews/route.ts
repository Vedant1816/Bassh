// File: app/api/reviews/route.ts
import supabaseAdmin from "@/app/services/supabase-admin";
import { withAuth } from "@/app/services/protected";
import { NextRequest } from "next/server";

export const POST = withAuth(async (req: Request, user: any) => {
  try {
    const body = await req.json();
    const { club_id, event_id, booking_id, rating, comment, is_verified } = body;

    // Validate required fields
    if (!club_id || !rating) {
      return Response.json(
        { error: "club_id and rating are required" },
        { status: 400 }
      );
    }

    // Validate rating range
    if (rating < 1 || rating > 5) {
      return Response.json(
        { error: "Rating must be between 1 and 5" },
        { status: 400 }
      );
    }

    // Check if user already reviewed this booking
    if (booking_id) {
      const { data: existingReview } = await supabaseAdmin
        .from("reviews")
        .select("id")
        .eq("user_id", user.id)
        .eq("booking_id", booking_id)
        .single();

      if (existingReview) {
        return Response.json(
          { error: "You have already reviewed this booking" },
          { status: 400 }
        );
      }
    }

    // Insert review
    const { data: review, error: insertError } = await supabaseAdmin
      .from("reviews")
      .insert({
        user_id: user.id,
        club_id,
        event_id: event_id || null,
        booking_id: booking_id || null,
        rating,
        comment: comment || null,
        is_verified: is_verified || false,
      })
      .select()
      .single();

    if (insertError) {
      console.error("❌ Insert review error:", insertError);
      return Response.json(
        { error: "Failed to submit review" },
        { status: 500 }
      );
    }

    return Response.json({ success: true, review }, { status: 201 });
  } catch (error: any) {
    console.error("❌ Review submission error:", error);
    return Response.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
});

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const club_id = searchParams.get("club_id");
    const event_id = searchParams.get("event_id");
    const user_id = searchParams.get("user_id");

    // user_id references auth.users; no public users table in schema, so don't embed it
    let query = supabaseAdmin
      .from("reviews")
      .select(
        `
        id,
        user_id,
        rating,
        comment,
        is_verified,
        created_at,
        clubs:club_id (
          id,
          club_name
        ),
        events:event_id (
          id,
          name
        )
      `
      )
      .eq("is_hidden", false)
      .order("created_at", { ascending: false });

    if (club_id) {
      query = query.eq("club_id", club_id);
    }

    if (event_id) {
      query = query.eq("event_id", event_id);
    }

    if (user_id) {
      query = query.eq("user_id", user_id);
    }

    const { data: reviews, error } = await query;

    if (error) {
      console.error("❌ Fetch reviews error:", error);
      return Response.json(
        { error: "Failed to fetch reviews" },
        { status: 500 }
      );
    }

    return Response.json({ reviews }, { status: 200 });
  } catch (error: any) {
    console.error("❌ Get reviews error:", error);
    return Response.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}