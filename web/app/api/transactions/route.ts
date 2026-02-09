import { withAuth } from "@/app/services/protected";
import supabaseAdmin from "@/app/services/supabase-admin";

export const runtime = "nodejs";

export const GET = withAuth(async (_req: Request, _ctx: any, user: any) => {
  console.log("📋 [TRANSACTIONS] Get user transaction history");

  try {
    const userId = user.id;

    const { data: transactions, error } = await supabaseAdmin
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
          event_date
        )
      `
      )
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(100);

    if (error) {
      console.error("❌ [TRANSACTIONS] Failed to fetch:", error);
      return Response.json(
        { error: "Failed to fetch transactions" },
        { status: 500 }
      );
    }

    // Enrich with human-readable type and description
    const enriched = (transactions || []).map((tx: any) => {
      let type: string;
      let description: string;

      if (tx.wallet_added) {
        type = "wallet_topup";
        description = "Wallet top-up";
      } else if (tx.wallet_used) {
        type = "wallet_payment";
        const clubName = tx.clubs?.club_name || "Venue";
        if (tx.event_id && tx.events?.name) {
          description = `${tx.events.name} at ${clubName}`;
        } else {
          description = tx.booking_id
            ? `Table booking at ${clubName}`
            : `Bill payment at ${clubName}`;
        }
      } else if (tx.event_id && tx.booking_id) {
        type = "event_booking";
        description =
          tx.events?.name && tx.clubs?.club_name
            ? `${tx.events.name} at ${tx.clubs.club_name}`
            : "Event booking";
      } else if (tx.booking_id) {
        type = "table_booking";
        description = tx.clubs?.club_name
          ? `Table booking at ${tx.clubs.club_name}`
          : "Table booking";
      } else if (tx.club_id) {
        type = "bill_payment";
        description = tx.clubs?.club_name
          ? `Bill payment at ${tx.clubs.club_name}`
          : "Bill payment";
      } else {
        type = "other";
        description = "Transaction";
      }

      const paymentId =
        tx.razorpay_payment_id ||
        (tx.id ? String(tx.id).replace(/-/g, "").slice(0, 12).toUpperCase() : null);

      return {
        id: tx.id,
        payment_id: paymentId,
        amount: Number(tx.amount) || 0,
        status: tx.status,
        type,
        description,
        is_credit: !!tx.wallet_added,
        is_debit: !!tx.wallet_used,
        club_name: tx.clubs?.club_name || null,
        event_name: tx.events?.name || null,
        booking_id: tx.booking_id || null,
        created_at: tx.created_at,
      };
    });

    console.log(`✅ [TRANSACTIONS] Found ${enriched.length} transactions`);

    return Response.json({
      transactions: enriched,
      total: enriched.length,
    });
  } catch (err: any) {
    console.error("❌ [TRANSACTIONS] Error:", err);
    return Response.json(
      { error: err.message || "Internal server error" },
      { status: 500 }
    );
  }
});
