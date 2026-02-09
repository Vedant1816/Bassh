import { withAuth } from "@/app/services/protected";
import supabaseAdmin from "@/app/services/supabase-admin";

export const runtime = "nodejs";

export const POST = withAuth(
    async (req: Request, params: { id: string }, user: any) => {
        try {
            const eventId = params.id;
            const body = await req.json();
            const { phone, username, age, gender } = body;

            if (!eventId) {
                return Response.json({ error: "Event ID missing" }, { status: 400 });
            }

            // Get event details to get club_id, date, and time
            const { data: event, error: eventError } = await supabaseAdmin
                .from("events")
                .select("club_id, event_date, start_time")
                .eq("id", eventId)
                .single();

            if (eventError || !event) {
                return Response.json({ error: "Event not found" }, { status: 404 });
            }

            // Check if user already applied
            const { data: existing, error: checkError } = await supabaseAdmin
                .from("guests")
                .select("id")
                .eq("event_id", eventId)
                .eq("user_id", user.id)
                .single();

            if (existing) {
                return Response.json({ error: "Already applied for guest list" }, { status: 400 });
            }

            // 1. Create a pending booking first with participant info
            const { data: booking, error: bookingError } = await supabaseAdmin
                .from("bookings")
                .insert({
                    user_id: user.id,
                    event_id: eventId,
                    club_id: event.club_id,
                    participants: [{
                        name: username || "Guest",
                        age: age || null,
                        gender: gender || null,
                        email: user.email || ""
                    }],
                    total_amount: 0,
                    booking_date: event.event_date,
                    booking_time: event.start_time,
                    booking_status: "pending",
                })
                .select("id")
                .single();

            if (bookingError) {
                console.error("❌ Booking creation error:", bookingError);
                return Response.json({ error: "Failed to create booking for guest list" }, { status: 500 });
            }

            // 2. Insert into guests table with the new booking_id and phone
            const { data, error } = await supabaseAdmin
                .from("guests")
                .insert({
                    user_id: user.id,
                    event_id: eventId,
                    club_id: event.club_id,
                    booking_id: booking.id,
                    phone: phone || null,
                    status: "pending",
                    vip: false,
                })
                .select()
                .single();

            if (error) {
                console.error("❌ Guest application error:", error);

                // Rollback booking if guest entry fails (optional but good practice)
                await supabaseAdmin.from("bookings").delete().eq("id", booking.id);

                return Response.json({ error: "Failed to apply for guest list" }, { status: 500 });
            }

            return Response.json({ message: "Applied successfully", data, booking_id: booking.id });
        } catch (err: any) {
            console.error("❌ Guest application exception:", err);
            return Response.json({ error: err.message || "Internal server error" }, { status: 500 });
        }
    }
);
