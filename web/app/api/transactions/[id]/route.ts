import { withAuth } from "@/app/services/protected";
import supabaseAdmin from "@/app/services/supabase-admin";

export const runtime = "nodejs";

function getIdFromRequest(req: Request, params: { id?: string }): string | null {
  if (params?.id) return params.id;
  try {
    const url = new URL(req.url);
    const segments = url.pathname.split("/").filter(Boolean);
    const idSegment = segments[segments.length - 1];
    if (idSegment && /^[0-9a-f-]{36}$/i.test(idSegment)) return idSegment;
  } catch { }
  return null;
}

export const GET = withAuth(async (req: Request, params: { id?: string }, user: any) => {
  const transactionId = getIdFromRequest(req, params || {});

  if (!transactionId) {
    return Response.json({ error: "Transaction ID missing" }, { status: 400 });
  }

  try {
    const { data: tx, error } = await supabaseAdmin
      .from("transactions")
      .select(
        `
        id,
        amount,
        status,
        is_wallet,
        wallet_added,
        wallet_used,
        razorpay_payment_id,
        razorpay_order_id,
        created_at,
        club_id,
        event_id,
        booking_id,
        clubs (
          club_name,
          address_text
        ),
        events:events!transactions_event_id_fkey (
          name,
          event_date,
          start_time
        )
      `
      )
      .eq("id", transactionId)
      .eq("user_id", user.id)
      .single();

    if (error || !tx) {
      if (error) {
        console.warn("❌ [TRANSACTIONS] Get by id Supabase error:", error.code, error.message, {
          transactionId,
          userId: user?.id,
        });
      }
      return Response.json(
        { error: "Transaction not found" },
        { status: 404 }
      );
    }

    let type: string;
    let description: string;

    if (tx.wallet_added) {
      type = "wallet_topup";
      description = "Wallet top-up";
    } else if (tx.wallet_used) {
      type = "wallet_payment";
      const clubName = (tx as any).clubs?.club_name || "Venue";
      if (tx.event_id && (tx as any).events?.name) {
        description = `${(tx as any).events.name} at ${clubName}`;
      } else {
        description = tx.booking_id
          ? `Table booking at ${clubName}`
          : `Bill payment at ${clubName}`;
      }
    } else if (tx.event_id && tx.booking_id) {
      type = "event_booking";
      description =
        (tx as any).events?.name && (tx as any).clubs?.club_name
          ? `${(tx as any).events.name} at ${(tx as any).clubs.club_name}`
          : "Event booking";
    } else if (tx.booking_id) {
      type = "table_booking";
      description = (tx as any).clubs?.club_name
        ? `Table booking at ${(tx as any).clubs.club_name}`
        : "Table booking";
    } else if (tx.club_id) {
      type = "bill_payment";
      description = (tx as any).clubs?.club_name
        ? `Bill payment at ${(tx as any).clubs.club_name}`
        : "Bill payment";
    } else {
      type = "other";
      description = "Transaction";
    }

    const paymentId =
      tx.razorpay_payment_id ||
      (tx.id ? String(tx.id).replace(/-/g, "").slice(0, 12).toUpperCase() : null);

    const transaction = {
      id: tx.id,
      payment_id: paymentId,
      razorpay_order_id: tx.razorpay_order_id || null,
      amount: Number(tx.amount) || 0,
      status: tx.status,
      type,
      description,
      is_credit: !!tx.wallet_added,
      is_debit: !!tx.wallet_used,
      is_wallet: !!tx.is_wallet,
      club_name: (tx as any).clubs?.club_name || null,
      club_address: (tx as any).clubs?.address_text || null,
      event_name: (tx as any).events?.name || null,
      event_date: (tx as any).events?.event_date || null,
      event_time: (tx as any).events?.start_time || null,
      booking_id: tx.booking_id || null,
      created_at: tx.created_at,
      updated_at: null,
    };

    return Response.json({ transaction });
  } catch (err: any) {
    console.error("❌ [TRANSACTIONS] Get by id error:", err);
    return Response.json(
      { error: err.message || "Internal server error" },
      { status: 500 }
    );
  }
});
