export const runtime = "nodejs";

import { withAuth } from "@/app/services/protected";
import supabaseAdmin from "@/app/services/supabase-admin";
import PDFDocument from "pdfkit/js/pdfkit.standalone";
import { PassThrough } from "stream";

/* ================= HELPERS ================= */

const getName = (val: any): string => {
  if (!val) return "-";
  if (Array.isArray(val)) return val[0]?.name ?? "-";
  return val.name ?? "-";
};

/* ================= PDF ROUTE ================= */

export const GET = withAuth(async (req: Request, user: { id: string }) => {
  try {
    const clubId = user.id;
    const { searchParams } = new URL(req.url);

    /* ================= REQUIRED ================= */

    const category = searchParams.get("category"); // event | food
    if (!category || !["event", "food"].includes(category)) {
      return new Response("Invalid category", { status: 400 });
    }

    /* ================= FILTERS ================= */

    const fromDate = searchParams.get("fromDate");
    const toDate = searchParams.get("toDate");
    const searchName = searchParams.get("search");

    const eventIdsParam = searchParams.get("eventIds"); // "1,2,3"
    const eventIds =
      eventIdsParam?.split(",").map((id) => id.trim()) ?? null;

    /* ================= USER SEARCH ================= */

    let matchingUserIds: string[] | null = null;

    if (searchName) {
      const { data: users, error } = await supabaseAdmin
        .from("users")
        .select("id")
        .ilike("name", `%${searchName}%`);

      if (error) throw error;

      matchingUserIds = users.map((u) => u.id);

      // No users → empty PDF
      if (matchingUserIds.length === 0) {
        return new Response("No data for selected filters", { status: 200 });
      }
    }

    /* ================= BASE QUERY ================= */

    let query = supabaseAdmin
      .from("transactions")
      .select(`
        id,
        user_id,
        amount,
        created_at,
        users(name),
        events!transactions_event_id_fkey(name)
      `)
      .eq("club_id", clubId)
      .order("created_at", { ascending: false });

    /* ================= CATEGORY FILTER ================= */

    if (category === "event") {
      query = query
        .not("event_id", "is", null)
        .not("booking_id", "is", null);
    } else {
      query = query.is("booking_id", null);
    }

    /* ================= EVENT FILTER ================= */

    if (eventIds && eventIds.length > 0) {
      query = query.in("event_id", eventIds);
    }

    /* ================= DATE FILTER ================= */

    if (fromDate) {
      query = query.gte("created_at", `${fromDate}T00:00:00.000Z`);
    }

    if (toDate) {
      query = query.lte("created_at", `${toDate}T23:59:59.999Z`);
    }

    /* ================= USER FILTER ================= */

    if (matchingUserIds) {
      query = query.in("user_id", matchingUserIds);
    }

    /* ================= EXECUTE ================= */

    const { data, error } = await query;
    if (error) throw error;

    /* ================= PDF SETUP ================= */

    const doc = new PDFDocument({ margin: 40, size: "A4" });
    const stream = new PassThrough();
    doc.pipe(stream);

    /* ================= HEADER ================= */

    doc.fontSize(18).text("Billing Report", { align: "center" });
    doc.moveDown();
    doc.fontSize(12).text(`Category: ${category.toUpperCase()}`);
    doc.text(`Generated on: ${new Date().toLocaleString()}`);


    doc.moveDown(1.5);

    /* ================= COLUMN CONFIG ================= */

    const COL =
      category === "event"
        ? {
            name: { x: 40, w: 70 },
            user: { x: 115, w: 90 },
            date: { x: 215, w: 70 },
            event: { x: 290, w: 90 },
            txn: { x: 385, w: 110 },
            amount: { x: 510, w: 60 },
          }
        : {
            name: { x: 40, w: 70 },
            user: { x: 115, w: 90 },
            date: { x: 215, w: 70 },
            txn: { x: 290, w: 160 },
            amount: { x: 470, w: 80 },
          };

    const getPageBottom = () =>
      doc.page.height - doc.page.margins.bottom - 10;

    /* ================= TABLE HEADER ================= */

    const drawHeader = () => {
      doc.fontSize(11);
      const y = doc.y;

      doc.text("Name", COL.name.x, y, { width: COL.name.w });
      doc.text("User ID", COL.user.x, y, { width: COL.user.w });
      doc.text("Date", COL.date.x, y, { width: COL.date.w });

      if (category === "event" && COL.event) {
        doc.text("Event", COL.event.x, y, { width: COL.event.w });
      }

      doc.text("Transaction ID", COL.txn.x, y, { width: COL.txn.w });
      doc.text("Amount (INR)", COL.amount.x, y, {
        width: COL.amount.w,
        align: "right",
      });

      doc.moveDown(1);
    };

    drawHeader();

    /* ================= ROWS ================= */

    for (const t of data || []) {
      const name = getName(t.users);
      const userId = t.user_id ?? "-";
      const date = new Date(t.created_at).toLocaleDateString("en-IN");
      const eventName = getName(t.events);
      const txnId = t.id ?? "-";
      const amount = `INR ${Number(t.amount ?? 0).toLocaleString("en-IN")}`;

      const rowHeight =
        Math.max(
          doc.heightOfString(name, { width: COL.name.w }),
          doc.heightOfString(userId, { width: COL.user.w }),
          doc.heightOfString(date, { width: COL.date.w }),
          category === "event" && COL.event
            ? doc.heightOfString(eventName, { width: COL.event.w })
            : 0,
          doc.heightOfString(txnId, { width: COL.txn.w }),
          doc.heightOfString(amount, { width: COL.amount.w })
        ) + 8;

      if (doc.y + rowHeight > getPageBottom()) {
        doc.addPage();
        drawHeader();
      }

      const y = doc.y;

      doc.text(name, COL.name.x, y, { width: COL.name.w });
      doc.text(userId, COL.user.x, y, { width: COL.user.w });
      doc.text(date, COL.date.x, y, { width: COL.date.w });

      if (category === "event" && COL.event) {
        doc.text(eventName, COL.event.x, y, { width: COL.event.w });
      }

      doc.text(txnId, COL.txn.x, y, { width: COL.txn.w });
      doc.text(amount, COL.amount.x, y, {
        width: COL.amount.w,
        align: "right",
      });

      doc.y = y + rowHeight;
    }

    doc.end();

    return new Response(stream as any, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename=billing-${category}.pdf`,
      },
    });
  } catch (err) {
    console.error(err);
    return new Response("Failed to generate PDF", { status: 500 });
  }
});
