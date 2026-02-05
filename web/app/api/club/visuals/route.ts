import { withAuth } from "@/app/services/protected";
import supabaseAdmin from "@/app/services/supabase-admin";

export const POST = withAuth(
  async (req: Request, user: { id: string }) => {
    try {
      const formData = await req.formData();

      const type = formData.get("type") as "logo" | "cover" | "gallery";
      const file = formData.get("file") as File | null;
      const existingUrl = formData.get("existingUrl") as string | null;

      if (!type) {
        return Response.json(
          { error: "Missing media type" },
          { status: 400 }
        );
      }

      let finalUrl: string | null = null;

      /* =========================
         CASE 1: FILE UPLOAD
      ========================= */

      if (file && file.size > 0) {
        const ext = file.name.split(".").pop();
        const fileName = `${crypto.randomUUID()}.${ext}`;

        let filePath = "";

        if (type === "logo") {
          filePath = `club-logos/${user.id}/${fileName}`;
        } else if (type === "cover") {
          filePath = `club-covers/${user.id}/${fileName}`;
        } else {
          filePath = `club-gallery/${user.id}/${fileName}`;
        }

        const { error: uploadError } =
          await supabaseAdmin.storage
            .from("club-images")
            .upload(filePath, file, {
              contentType: file.type,
              upsert: true
            });

        if (uploadError) {
          console.error(uploadError);
          return Response.json(
            { error: "File upload failed" },
            { status: 500 }
          );
        }

        const { data } = supabaseAdmin.storage
          .from("club-images")
          .getPublicUrl(filePath);

        finalUrl = data.publicUrl;
      }

      /* =========================
         CASE 2: EXISTING URL
      ========================= */

      else if (existingUrl) {
        finalUrl = existingUrl;
      }

      else {
        return Response.json(
          { error: "No file or existing URL provided" },
          { status: 400 }
        );
      }

      /* =========================
         DATABASE UPDATE
      ========================= */

      if (type === "logo") {
        const { error } = await supabaseAdmin
          .from("clubs")
          .update({ club_logo: finalUrl })
          .eq("id", user.id);

        if (error) throw error;
      }

      else if (type === "cover") {
        const { error } = await supabaseAdmin
          .from("clubs")
          .update({ cover_photo: finalUrl })
          .eq("id", user.id);

        if (error) throw error;
      }

      else if (type === "gallery") {
        const { error } = await supabaseAdmin.rpc(
          "append_gallery_image",
          {
            club_id: user.id,
            image_url: finalUrl
          }
        );

        if (error) throw error;
      }

      return Response.json(
        { success: true, url: finalUrl },
        { status: 200 }
      );
    } catch (err) {
      console.error("Media upload error:", err);
      return Response.json(
        { error: "Something went wrong" },
        { status: 500 }
      );
    }
  }
);

export const GET = withAuth(
  async (_req: Request, user: { id: string }) => {
    try {
      const { data, error } = await supabaseAdmin
        .from("clubs")
        .select("club_logo, cover_photo, gallery")
        .eq("id", user.id)
        .single();

      if (error) {
        console.error(error);
        return Response.json(
          { error: "Failed to fetch club media" },
          { status: 500 }
        );
      }

      return Response.json(
        {
          club_logo: data.club_logo ?? null,
          cover_photo: data.cover_photo ?? null,
          gallery: data.gallery ?? []
        },
        { status: 200 }
      );
    } catch (err) {
      console.error(err);
      return Response.json(
        { error: "Something went wrong" },
        { status: 500 }
      );
    }
  }
);

export const DELETE = withAuth(
  async (req: Request, user: { id: string }) => {
    try {
      const { url } = await req.json();

      if (!url) {
        return Response.json(
          { error: "Missing image url" },
          { status: 400 }
        );
      }

      /* =========================
         REMOVE FROM STORAGE
      ========================= */

      const bucketName = "club-images";

      // extract path after bucket domain
      const path = url.split(`${bucketName}/`)[1];

      if (!path) {
        return Response.json(
          { error: "Invalid image url" },
          { status: 400 }
        );
      }

      const { error: storageError } =
        await supabaseAdmin.storage
          .from(bucketName)
          .remove([path]);

      if (storageError) {
        console.error(storageError);
        return Response.json(
          { error: "Failed to delete image from storage" },
          { status: 500 }
        );
      }

      /* =========================
         REMOVE FROM DATABASE
      ========================= */

      if (path.startsWith("club-logos/")) {
        await supabaseAdmin
          .from("clubs")
          .update({ club_logo: null })
          .eq("id", user.id);
      }

      else if (path.startsWith("club-covers/")) {
        await supabaseAdmin
          .from("clubs")
          .update({ cover_photo: null })
          .eq("id", user.id);
      }

      else if (path.startsWith("club-gallery/")) {
        await supabaseAdmin.rpc(
          "remove_gallery_image",
          {
            club_id: user.id,
            image_url: url
          }
        );
      }

      return Response.json(
        { success: true },
        { status: 200 }
      );
    } catch (err) {
      console.error("Delete media error:", err);
      return Response.json(
        { error: "Something went wrong" },
        { status: 500 }
      );
    }
  }
);

