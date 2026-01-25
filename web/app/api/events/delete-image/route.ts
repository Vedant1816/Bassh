import { withAuth } from "@/app/services/protected";
import supabaseAdmin from "@/app/services/supabase-admin";

function extractStoragePath(publicUrl: string) {
  const marker = "/object/public/event-images/";
  const index = publicUrl.indexOf(marker);
  if (index === -1) return null;
  return publicUrl.substring(index + marker.length);
}

export const POST = withAuth(async (req: Request, user: { id: string }) => {
  try {
    const { searchParams } = new URL(req.url);
    const eventId = searchParams.get("eventId");
    const type = searchParams.get("type"); // banner | dj

    if (!eventId || !type) {
      return Response.json(
        { error: "eventId and type are required" },
        { status: 400 }
      );
    }

    if (type !== "banner" && type !== "dj") {
      return Response.json(
        { error: "type must be 'banner' or 'dj'" },
        { status: 400 }
      );
    }

   type ImageColumn = "banner_image_url" | "dj_image_url";

   const column: ImageColumn = type === "banner"
    ? "banner_image_url"
    : "dj_image_url";


type EventImageRow = {
  banner_image_url: string | null;
  dj_image_url: string | null;
 };

const { data: event, error } = await supabaseAdmin
  .from("events")
  .select(column)
  .eq("id", eventId)
  .eq("club_id", user.id)
  .single<EventImageRow>();


    if (error || !event) {
      return Response.json(
        { error: "Event not found" },
        { status: 404 }
      );
    }

    const imageUrl = event[column];

    //  If no image → nothing to delete
    if (!imageUrl) {
      return Response.json(
        { success: true, message: "No image to delete" },
        { status: 200 }
      );
    }

    // Extract storage path
    const storagePath = extractStoragePath(imageUrl);

    if (storagePath) {
      const { error: deleteError } = await supabaseAdmin.storage
        .from("event-images")
        .remove([storagePath]);

      if (deleteError) {
        return Response.json(
          { error: deleteError.message },
          { status: 500 }
        );
      }
    }

    // Set DB column to null
    const { error: updateError } = await supabaseAdmin
      .from("events")
      .update({ [column]: null })
      .eq("id", eventId)
      .eq("club_id", user.id);

    if (updateError) {
      return Response.json(
        { error: updateError.message },
        { status: 500 }
      );
    }

    return Response.json(
      { success: true, deleted: type },
      { status: 200 }
    );
  } catch (err) {
    console.error(err);
    return Response.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
});
