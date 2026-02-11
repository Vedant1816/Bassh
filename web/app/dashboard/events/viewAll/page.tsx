"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { withAuthHeaders } from "@/app/services/auth-fetch";
import {
  Pencil,
  Trash2,
  ChevronDown,
} from "lucide-react";

/* ---------------- PAGE ---------------- */

export default function ViewAllEventsPage() {
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");

  /* ---------- DELETE MODAL STATE ---------- */
  const [deleteState, setDeleteState] = useState<{
    open: boolean;
    loading: boolean;
    success: boolean;
    error: string | null;
    eventId: string | null;
  }>({
    open: false,
    loading: false,
    success: false,
    error: null,
    eventId: null,
  });

  /* ---------- FETCH EVENTS ---------- */
  const fetchEvents = async (searchText = "") => {
    setLoading(true);

    const params = new URLSearchParams();
    if (searchText.trim() !== "") {
      params.append("search", searchText.trim());
    }

    const res = await fetch(
      `/api/events/club?${params.toString()}`,
      await withAuthHeaders({ method: "GET" })
    );

    const data = await res.json();
    setEvents(data);
    setLoading(false);
  };

  /* Initial load */
  useEffect(() => {
    fetchEvents();
  }, []);

  /* Debounced search */
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchEvents(search);
    }, 400);

    return () => clearTimeout(timer);
  }, [search]);

  /* ---------- CONFIRM DELETE ---------- */
  const confirmDeleteEvent = async () => {
    if (!deleteState.eventId) return;

    setDeleteState((s) => ({ ...s, loading: true }));

    try {
      let res = await fetch(
        `/api/events/delete-image?eventId=${deleteState.eventId}&type=banner`,
        await withAuthHeaders({ method: "POST" })
      );
      if (!res.ok) throw new Error("Failed to delete banner image");

      res = await fetch(
        `/api/events/delete-image?eventId=${deleteState.eventId}&type=dj`,
        await withAuthHeaders({ method: "POST" })
      );
      if (!res.ok) throw new Error("Failed to delete DJ image");

      res = await fetch(
        `/api/events/delete?eventId=${deleteState.eventId}`,
        await withAuthHeaders({ method: "DELETE" })
      );
      if (!res.ok) throw new Error("Failed to delete event");

      setDeleteState({
        open: true,
        loading: false,
        success: true,
        error: null,
        eventId: null,
      });

      await fetchEvents(search);
    } catch (err: any) {
      setDeleteState((s) => ({
        ...s,
        loading: false,
        error: err.message || "Could not delete event",
      }));
    }
  };

  /* ---------------- UI ---------------- */

  return (
    <div className="p-8 text-white max-w-6xl">
      {/* HEADER */}
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard/events"
            className="text-gray-400 hover:text-white text-lg"
          >
            ←
          </Link>

          <div>
            <h1 className="text-2xl font-semibold">All Events</h1>
            <p className="text-sm text-gray-400">Manage all your events</p>
          </div>
        </div>

        {/* SEARCH */}
        <div className="relative">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search events..."
            className="pl-4 pr-10 py-2 rounded-full bg-[#1a1a1a] border border-white/10 text-sm text-white"
          />
          <span className="absolute right-3 top-2.5 text-gray-400">🔍</span>
        </div>
      </div>

      {/* EVENTS */}
      {loading && (
        <div className="flex items-center gap-3 py-4">
          <div className="relative w-5 h-5">
            <div className="absolute inset-0 rounded-full border-2 border-gray-800" />
            <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-pink-500 animate-spin" />
          </div>
          <p className="text-sm text-gray-400 animate-pulse">Loading events...</p>
        </div>
      )}

      {!loading && events.length === 0 && (
        <p className="text-sm text-gray-400">
          No events found
        </p>
      )}

      <div className="space-y-4">
        {events.map((event) => (
          <EventCard
            key={event.id}
            event={event}
            onDelete={(id) =>
              setDeleteState({
                open: true,
                loading: false,
                success: false,
                error: null,
                eventId: id,
              })
            }
          />
        ))}
      </div>

      {/* DELETE MODAL */}
      {deleteState.open && (
        <DeleteEventModal
          loading={deleteState.loading}
          success={deleteState.success}
          error={deleteState.error}
          onClose={() =>
            setDeleteState({
              open: false,
              loading: false,
              success: false,
              error: null,
              eventId: null,
            })
          }
          onConfirm={confirmDeleteEvent}
        />
      )}
    </div>
  );
}

/* ---------------- COMPONENTS ---------------- */

function EventCard({
  event,
  onDelete,
}: {
  event: any;
  onDelete: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);

  const banner = event.banner_image_url
    ? `${event.banner_image_url}?v=${event.updated_at}`
    : "https://images.unsplash.com/photo-1492684223066-81342ee5ff30";

  const eventDateTime = new Date(
  `${event.event_date}T${event.start_time}`
);

const isUpcoming = eventDateTime >= new Date();


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

          <Link
            href={`/dashboard/events/update/${event.id}`}
            className="text-gray-400 hover:text-white"
          >
            <Pencil size={16} />
          </Link>

          <button
            onClick={() => onDelete(event.id)}
            className="text-gray-400 hover:text-red-400"
          >
            <Trash2 size={16} />
          </button>

          <button
            onClick={() => setOpen(!open)}
            className={`text-gray-400 transition ${
              open ? "rotate-180" : ""
            }`}
          >
            <ChevronDown size={18} />
          </button>
        </div>
      </div>
    </div>
  );
}

/* ---------------- DELETE MODAL ---------------- */

function DeleteEventModal({
  loading,
  success,
  error,
  onClose,
  onConfirm,
}: {
  loading: boolean;
  success: boolean;
  error: string | null;
  onClose: () => void;
  onConfirm: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="w-full max-w-sm rounded-xl bg-[#0b0b0b] border border-white/10 p-6 text-center">
        {!loading && !success && !error && (
          <>
            <p className="text-lg font-semibold text-white">
              Are you sure?
            </p>
            <p className="text-sm text-gray-400 mt-2">
              This will permanently delete the event and its images.
            </p>

            <div className="flex gap-3 mt-6">
              <button
                onClick={onClose}
                className="flex-1 px-4 py-2 rounded-md border border-white/10 text-sm"
              >
                Cancel
              </button>

              <button
                onClick={onConfirm}
                className="flex-1 px-4 py-2 rounded-md bg-red-600 hover:bg-red-700 text-sm font-medium"
              >
                Yes, delete
              </button>
            </div>
          </>
        )}

        {loading && (
          <>
            <p className="text-lg font-semibold text-white">
              Deleting event…
            </p>
            <p className="text-sm text-gray-400 mt-2">Please wait</p>
          </>
        )}

        {success && (
          <>
            <p className="text-lg font-semibold text-green-400">
              Event deleted successfully
            </p>
            <button
              onClick={onClose}
              className="mt-6 px-4 py-2 rounded-md bg-pink-600 text-sm"
            >
              Close
            </button>
          </>
        )}

        {error && (
          <>
            <p className="text-lg font-semibold text-red-400">
              Something went wrong
            </p>
            <p className="text-sm text-gray-400 mt-2">{error}</p>
            <button
              onClick={onClose}
              className="mt-6 px-4 py-2 rounded-md border border-white/10 text-sm"
            >
              Close
            </button>
          </>
        )}
      </div>
    </div>
  );
}
