import supabaseAdmin from "@/app/services/supabase-admin";
import { withAuth } from "@/app/services/protected";

export const DELETE = withAuth(async (req: Request, user: { id: string }) => {
  try {
    const { searchParams } = new URL(req.url);
    const discountId = searchParams.get("discountId");

    if (!discountId) {
      return Response.json(
        { error: "Missing discountId" },
        { status: 400 }
      );
    }

    const { error } = await supabaseAdmin
      .from("discounts")
      .delete()
      .eq("id", discountId);

    if (error) {
      return Response.json(
        { error: error.message },
        { status: 500 }
      );
    }

    return Response.json({ success: true }, { status: 200 });

  } catch (err: any) {
    return Response.json(
      { error: err?.message ?? "Internal server error" },
      { status: 500 }
    );
  }
});
