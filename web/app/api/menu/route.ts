import { withAuth } from "@/app/services/protected";
import supabaseAdmin from "@/app/services/supabase-admin";

export const PUT = withAuth(async (req: Request, user: { id: string }) => {
  try {
    const clubId = user.id;

    /* READ FORM DATA  */
    const formData = await req.formData();

    const existingImages =
      formData.getAll("existingImages") as string[];

    const newFiles =
      formData.getAll("newImages") as File[];

    /* LIST CURRENT STORAGE FILES  */
    const { data: storedFiles, error: listError } =
      await supabaseAdmin.storage
        .from("menu-images")
        .list(clubId);

    if (listError) throw listError;

    /*  DELETE REMOVED STORAGE FILES */
    if (storedFiles) {
      const filesToDelete = storedFiles.filter((file) => {
        const publicUrl = supabaseAdmin.storage
          .from("menu-images")
          .getPublicUrl(`${clubId}/${file.name}`).data.publicUrl;

        return !existingImages.includes(publicUrl);
      });

      if (filesToDelete.length > 0) {
        const paths = filesToDelete.map(
          (file) => `${clubId}/${file.name}`
        );

        await supabaseAdmin.storage
          .from("menu-images")
          .remove(paths);
      }
    }

    /*  DELETE ALL DB ROWS  */
    await supabaseAdmin
      .from("menu_images")
      .delete()
      .eq("club_id", clubId);

    /* REBUILD DB ROWS IN ORDER  */
    const rows: {
      club_id: string;
      image_url: string;
      display_order: number;
    }[] = [];

    let order = 1;

    //  existing images (URLs)
    for (const url of existingImages) {
      rows.push({
        club_id: clubId,
        image_url: url,
        display_order: order++,
      });
    }

    //  new images (upload + URL)
    for (const file of newFiles) {
      const ext = file.name.split(".").pop();
      const fileName = `${crypto.randomUUID()}.${ext}`;
      const filePath = `${clubId}/${fileName}`;

      const { error: uploadError } =
        await supabaseAdmin.storage
          .from("menu-images")
          .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data } = supabaseAdmin.storage
        .from("menu-images")
        .getPublicUrl(filePath);

      rows.push({
        club_id: clubId,
        image_url: data.publicUrl,
        display_order: order++,
      });
    }

    /*  INSERT FINAL ROWS  */
    if (rows.length > 0) {
      await supabaseAdmin.from("menu_images").insert(rows);
    }

    return Response.json({ success: true }, { status: 200 });
  } catch (err) {
    console.error("MENU UPDATE ERROR:", err);
    return Response.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
});


export const GET = withAuth(async (req: Request, user: { id: string }) => {
  try {
    const clubId = user.id;

    const { data, error } = await supabaseAdmin
      .from("menu_images")
      .select("image_url")
      .eq("club_id", clubId)
      .order("display_order");

    if (error) {
      return Response.json(
        { error: error.message },
        { status: 500 }
      );
    }

    const imageUrls = data.map(row => row.image_url);

    return Response.json(
      { images: imageUrls },
      { status: 200 }
    );
  } catch (err) {
    console.error("MENU GET ERROR:", err);

    return Response.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
});
