"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { withAuthHeaders } from "@/app/services/auth-fetch";
import {
  Pencil,
  Share2,
  Trash2,
  ChevronDown,
} from "lucide-react";

export default function ViewAllEventsPage() {
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchEvents = async () => {
    setLoading(true);

    const res = await fetch(
      "/api/events/club",
      await withAuthHeaders({ method: "GET" })
    );

    const data = await res.json();
    setEvents(data);
    setLoading(false);
  };

  useEffect(() => {
    fetchEvents();
  }, []);

  return (
    <div className="p-8 text-white max-w-6xl">
      {/* HEADER */}
      <div className="flex items-center gap-3 mb-6">
        <Link
          href="/dashboard/events"
          className="text-gray-400 hover:text-white text-lg"
        >
          ←
        </Link>

        <div>
          <h1 className="text-2xl font-semibold">All Events</h1>
          <p className="text-sm text-gray-400">
            Manage all your events
          </p>
        </div>
      </div>

      {/* EVENTS */}
      {loading && (
        <p className="text-sm text-gray-400">Loading events…</p>
      )}

      {!loading && events.length === 0 && (
        <p className="text-sm text-gray-400">No events found</p>
      )}

      <div className="space-y-4">
        {events.map((event) => (
          <EventCard key={event.id} event={event} />
        ))}
      </div>
    </div>
  );
}
function EventCard({ event }: { event: any }) {
  const [open, setOpen] = useState(false);

  const banner = event.banner_image_url
  ? `${event.banner_image_url}?v=${event.updated_at}`
  : "https://images.unsplash.com/photo-1492684223066-81342ee5ff30";


  const isUpcoming = new Date(event.event_date) >= new Date();

  return (
    <div className="rounded-xl bg-[#0b0b0b] border border-white/10 overflow-hidden">
      <div className="flex gap-4 p-4">
        <img
          src={banner}
          alt="event banner"
          className="w-16 h-16 rounded-lg object-cover"
        />

        <div className="flex-1">
          <h3 className="font-semibold">{event.name}</h3>

          <p className="text-sm text-gray-400">
            {new Date(event.event_date).toDateString()} at {event.start_time}
          </p>

          <p className="text-xs text-gray-400 mt-1">
            DJ {event.dj_name || "—"} • {event.max_attendees || 0} attendees
          </p>

          {/* PRICING */}
          {Array.isArray(event.event_ticket_pricing) &&
            event.event_ticket_pricing.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {event.event_ticket_pricing.map((tier: any) => (
                  <span
                    key={tier.id}
                    className="px-3 py-1 rounded-full bg-[#1a1a1a] border border-white/10 text-xs text-gray-300"
                  >
                    {tier.label}: ₹{tier.price}
                  </span>
                ))}
              </div>
            )}
        </div>

        <div className="flex items-center gap-3">
          <span
            className={`px-3 py-1 rounded-full text-xs ${
              isUpcoming
                ? "bg-pink-600 text-white"
                : "bg-gray-600 text-white"
            }`}
          >
            {isUpcoming ? "Upcoming" : "Past"}
          </span>

          <div className="flex items-center gap-3">
          <Link
          href={`/dashboard/events/update/${event.id}`}
          className="text-gray-400 hover:text-white transition"
         >
          <Pencil size={16} />
         </Link>
 
          <button className="text-gray-400 hover:text-white transition">
            <Share2 size={16} />
          </button>

          <button className="text-gray-400 hover:text-red-400 transition">
            <Trash2 size={16} />
          </button>

          <button
            onClick={() => setOpen(!open)}
            className={`text-gray-400 hover:text-white transition ${
              open ? "rotate-180" : ""
            }`}
          >
            <ChevronDown size={18} />
          </button>
        </div>
        </div>
      </div>

      {/* DROPDOWN */}
      {open && (
        <div className="border-t border-white/10 p-4 space-y-4">
          <div className="flex gap-3">
            <button className="flex-1 py-2 rounded-md bg-[#1a1a1a] text-sm text-gray-300">
              Guest List
            </button>
            <button className="flex-1 py-2 rounded-md bg-pink-600 text-sm font-medium">
              Attendees List
            </button>
          </div>

          <div className="rounded-lg bg-[#1a1a1a] border border-white/10 p-6 text-center text-sm text-gray-400">
            No data yet — you’ll wire this later 👀
          </div>
        </div>
      )}
    </div>
  );
}
