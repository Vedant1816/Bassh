"use client";

import { useEffect, useState, useRef } from "react";
import { MoreVertical, Filter } from "lucide-react";
import { createPortal } from "react-dom";
import { withAuthHeaders } from "@/app/services/auth-fetch";

/* ================= TYPES ================= */

type Guest = {
  guest_id: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  status: string;
  last_visited: string | null;
  visits: number;
  tags: string[];
  event_name?: string | null;
};

type Event = {
  id: string;
  name: string;
};

/* ================= UTILS ================= */

const formatDate = (date: string | null) => {
  if (!date) return "—";
  return new Date(date).toLocaleDateString("en-US", {
    month: "short",
    day: "2-digit",
    year: "numeric",
  });
};

/* ================= COMPONENT ================= */

export default function GuestListPage() {
  /* ================= DATA ================= */

  const [guests, setGuests] = useState<Guest[]>([]);
  const [events, setEvents] = useState<Event[]>([]);

  /* ================= FILTER STATES ================= */

  const [search, setSearch] = useState("");
  const [selectedEventIds, setSelectedEventIds] = useState<string[]>([]);
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>([]);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  /* ================= FILTER DROPDOWNS ================= */

  const [showEventDropdown, setShowEventDropdown] = useState(false);
  const [showStatusDropdown, setShowStatusDropdown] = useState(false);
  const [showTagDropdown, setShowTagDropdown] = useState(false);

  const eventRef = useRef<HTMLDivElement | null>(null);
  const statusRef = useRef<HTMLDivElement | null>(null);
  const tagRef = useRef<HTMLDivElement | null>(null);

  /* ================= ACTION MENU (PORTAL) ================= */

  const [menuPosition, setMenuPosition] = useState<{
    guestId: string;
    top: number;
    left: number;
  } | null>(null);

  /* ================= CONFIRMATION MODAL ================= */

  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [confirmAction, setConfirmAction] = useState<{
    guestId: string;
    action: "approve" | "make_vip" | "suspend";
    guestName: string;
  } | null>(null);

  /* ================= FETCH EVENTS ================= */

  useEffect(() => {
    const fetchEvents = async () => {
      const res = await fetch(
        "/api/events/club",
        await withAuthHeaders({ method: "GET" })
      );
      const json = await res.json();
      const eventsData = Array.isArray(json)
        ? json
        : Array.isArray(json.data)
        ? json.data
        : [];
      setEvents(eventsData);
    };
    fetchEvents();
  }, []);

  /* ================= FETCH GUESTS ================= */

  const fetchGuests = async (applyFilters = false) => {
    const params = new URLSearchParams();

    if (applyFilters) {
      if (search) params.append("search", search);
      if (selectedEventIds.length)
        params.append("eventIds", selectedEventIds.join(","));
      if (selectedStatuses.length)
        params.append("statuses", selectedStatuses.join(","));
      if (selectedTags.length)
        params.append("tags", selectedTags.join(","));
    }

    const res = await fetch(
      `/api/guests?${params}`,
      await withAuthHeaders({ method: "GET" })
    );

    const json = await res.json();
    setGuests(json.data || []);
  };

  useEffect(() => {
    fetchGuests();
  }, []);

  /* ================= CLICK OUTSIDE ================= */

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        eventRef.current?.contains(e.target as Node) ||
        statusRef.current?.contains(e.target as Node) ||
        tagRef.current?.contains(e.target as Node)
      ) {
        return;
      }

      setShowEventDropdown(false);
      setShowStatusDropdown(false);
      setShowTagDropdown(false);
      setMenuPosition(null);
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  /* ================= ACTION WITH CONFIRMATION ================= */

  const initiateAction = (
    guestId: string,
    action: "approve" | "make_vip" | "suspend",
    guestName: string
  ) => {
    setConfirmAction({ guestId, action, guestName });
    setShowConfirmModal(true);
    setMenuPosition(null);
  };

  const performAction = async () => {
    if (!confirmAction) return;

    await fetch(
      "/api/guests",
      await withAuthHeaders({
        method: "POST",
        body: JSON.stringify({
          guest_id: confirmAction.guestId,
          action: confirmAction.action,
        }),
      })
    );

    fetchGuests(true);
    setShowConfirmModal(false);
    setConfirmAction(null);
  };

  /* ================= CLEAR FILTERS ================= */

  const clearFilters = () => {
    setSearch("");
    setSelectedEventIds([]);
    setSelectedStatuses([]);
    setSelectedTags([]);
    fetchGuests(false);
  };

  /* ================= GET ACTION TEXT ================= */

  const getActionText = (action: string) => {
    switch (action) {
      case "approve":
        return "Approve";
      case "make_vip":
        return "Make VIP";
      case "suspend":
        return "Suspend";
      default:
        return action;
    }
  };

  /* ================= UI ================= */

  return (
    <div className="min-h-screen bg-black text-white p-8">
      {/* PAGE HEADING */}
      <h1 className="text-2xl font-semibold mb-8">Guest List</h1>

      {/* ALL GUESTS CARD */}
      <div className="bg-[#111] border border-gray-800 rounded-lg p-6">
        {/* HEADER */}
        <div className="flex justify-between items-start mb-6">
          <div>
            <h2 className="text-2xl font-semibold mb-2">All Guests</h2>
            <p className="text-sm text-gray-400">
              Manage your guest list
            </p>
          </div>

          <div className="flex gap-3">
            {/* <button
              onClick={() => fetchGuests(true)}
              className="px-5 py-2 border border-pink-500 text-pink-500 rounded-md hover:bg-pink-500/10 text-sm"
            >
              Select All
            </button> */}
            <button
              onClick={clearFilters}
              className="px-5 py-2 border border-gray-600 text-gray-300 rounded-md hover:bg-gray-800 text-sm"
            >
              Clear Filters
            </button>
          </div>
        </div>

        {/* ================= FILTER BAR ================= */}
        <div className="relative z-20 flex flex-wrap gap-4 items-center mb-6">
          {/* SEARCH */}
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search guests..."
            className="flex-1 max-w-xl bg-[#1a1a1a] border border-gray-700 rounded-md px-4 py-2 text-sm"
          />

          {/* EVENT FILTER */}
          <div ref={eventRef} className="relative">
            <button
              onMouseDown={(e) => e.stopPropagation()}
              onClick={() => setShowEventDropdown((v) => !v)}
              className="w-48 px-4 py-2 bg-[#1a1a1a] border border-gray-700 rounded-md text-sm flex items-center justify-between"
            >
              <span className="truncate">
                {selectedEventIds.length
                  ? `${selectedEventIds.length} Event${
                      selectedEventIds.length > 1 ? "s" : ""
                    }`
                  : "All Events"}
              </span>
              <span className="text-gray-400">▾</span>
            </button>

            {showEventDropdown && (
              <div
                onMouseDown={(e) => e.stopPropagation()}
                className="absolute left-0 mt-2 w-64 bg-black border border-gray-700 rounded-md shadow-xl max-h-56 overflow-y-auto z-30"
              >
                {events.length === 0 && (
                  <div className="px-3 py-2 text-sm text-gray-400">
                    No events available
                  </div>
                )}
                {events.map((e) => (
                  <label
                    key={e.id}
                    className="flex items-center gap-2 px-3 py-2 hover:bg-gray-800 cursor-pointer text-sm"
                  >
                    <input
                      type="checkbox"
                      checked={selectedEventIds.includes(e.id)}
                      onChange={(ev) =>
                        setSelectedEventIds((prev) =>
                          ev.target.checked
                            ? [...prev, e.id]
                            : prev.filter((id) => id !== e.id)
                        )
                      }
                    />
                    <span className="truncate">{e.name}</span>
                  </label>
                ))}
              </div>
            )}
          </div>

          {/* STATUS FILTER */}
          <div ref={statusRef} className="relative">
            <button
              onMouseDown={(e) => e.stopPropagation()}
              onClick={() => setShowStatusDropdown((v) => !v)}
              className="w-40 px-4 py-2 bg-[#1a1a1a] border border-gray-700 rounded-md text-sm flex justify-between"
            >
              All Statuses <span className="text-gray-400">▾</span>
            </button>

            {showStatusDropdown && (
              <div
                onMouseDown={(e) => e.stopPropagation()}
                className="absolute left-0 mt-2 w-40 bg-black border border-gray-700 rounded-md shadow-xl z-30"
              >
                {["approved", "pending", "suspended"].map((s) => (
                  <label
                    key={s}
                    className="flex items-center gap-2 px-3 py-2 hover:bg-gray-800 cursor-pointer text-sm"
                  >
                    <input
                      type="checkbox"
                      checked={selectedStatuses.includes(s)}
                      onChange={() =>
                        setSelectedStatuses((prev) =>
                          prev.includes(s)
                            ? prev.filter((x) => x !== s)
                            : [...prev, s]
                        )
                      }
                    />
                    {s}
                  </label>
                ))}
              </div>
            )}
          </div>

          {/* TAG FILTER */}
          <div ref={tagRef} className="relative">
            <button
              onMouseDown={(e) => e.stopPropagation()}
              onClick={() => setShowTagDropdown((v) => !v)}
              className="w-40 px-4 py-2 bg-[#1a1a1a] border border-gray-700 rounded-md text-sm flex justify-between"
            >
              All Tags <span className="text-gray-400">▾</span>
            </button>

            {showTagDropdown && (
              <div
                onMouseDown={(e) => e.stopPropagation()}
                className="absolute left-0 mt-2 w-40 bg-black border border-gray-700 rounded-md shadow-xl z-30"
              >
                {["vip", "regular", "new"].map((t) => (
                  <label
                    key={t}
                    className="flex items-center gap-2 px-3 py-2 hover:bg-gray-800 cursor-pointer text-sm"
                  >
                    <input
                      type="checkbox"
                      checked={selectedTags.includes(t)}
                      onChange={() =>
                        setSelectedTags((prev) =>
                          prev.includes(t)
                            ? prev.filter((x) => x !== t)
                            : [...prev, t]
                        )
                      }
                    />
                    {t.toUpperCase()}
                  </label>
                ))}
              </div>
            )}
          </div>

          <button
            onClick={() => fetchGuests(true)}
            className="bg-pink-600 hover:bg-pink-700 px-4 py-2 rounded-md text-sm flex items-center gap-2"
          >
            <Filter size={14} />
            Apply Filters
          </button>
        </div>

        {/* ================= TABLE ================= */}
        <div className="bg-[#111] rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="text-gray-400 border-b border-gray-800">
              <tr>
                <th className="px-6 py-4 text-left font-normal">Guest</th>
                <th className="px-6 py-4 text-left font-normal">Contact</th>
                <th className="px-6 py-4 text-left font-normal">Event</th>
                <th className="px-6 py-4 text-left font-normal">Status</th>
                <th className="px-6 py-4 text-left font-normal">Last Visit</th>
                <th className="px-6 py-4 text-left font-normal">Visits</th>
                <th className="px-6 py-4 text-left font-normal">Actions</th>
              </tr>
            </thead>

            <tbody>
            {guests.map((g) => (
              <tr
                key={g.guest_id}
                className="hover:bg-[#1a1a1a]"
              >
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-white shrink-0" />
                    <div>
                      <div className="font-medium">{g.name ?? "Unknown"}</div>
                      <div className="flex gap-2 mt-1">
                        {g.tags.map((tag) => {
                          const tagLower = tag.toLowerCase();
                          
                          // Yellow VIP badge with gold background
                          if (tagLower === "vip" || tag === "VIP") {
                            return (
                              <span
                                key={tag}
                                className="text-xs px-2 py-0.5 rounded-full bg-yellow-500 text-black font-medium"
                              >
                                ⭐ VIP
                              </span>
                            );
                          }
                          
                          // Pink bordered tags for Regular, New, etc
                          return (
                            <span
                              key={tag}
                              className="text-xs px-2 py-0.5 rounded-full border border-pink-500 text-pink-400 bg-pink-500/10"
                            >
                              {tag}
                            </span>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </td>

                <td className="px-6 py-4 text-gray-400">
                  <div>{g.email}</div>
                  <div>{g.phone}</div>
                </td>

                <td className="px-6 py-4 text-gray-400">
                  {g.event_name ?? "—"}
                </td>

                <td className="px-6 py-4">
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-medium ${
                      g.status === "approved"
                        ? "bg-green-500 text-white"
                        : g.status === "suspended"
                        ? "bg-gray-600 text-white"
                        : "bg-gray-600 text-white"
                    }`}
                  >
                    {g.status}
                  </span>
                </td>

                <td className="px-6 py-4 text-gray-400">
                  {formatDate(g.last_visited)}
                </td>

                <td className="px-6 py-4">{g.visits}</td>

                <td className="px-6 py-4 text-left relative">
                  <button
                    disabled={g.status !== "pending"}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (g.status !== "pending") return;
                      const r = e.currentTarget.getBoundingClientRect();
                      setMenuPosition({
                        guestId: g.guest_id,
                        top: r.bottom + window.scrollY + 6,
                        left: r.right + window.scrollX - 144,
                      });
                    }}
                    className={`p-1 rounded ${
                      g.status !== "pending"
                        ? "opacity-40 cursor-not-allowed"
                        : "hover:bg-gray-800"
                    }`}
                  >
                    <MoreVertical size={18} />
                  </button>
                </td>
              </tr>
            ))}

            {guests.length === 0 && (
              <tr>
                <td
                  colSpan={7}
                  className="px-6 py-10 text-center text-gray-500"
                >
                  No guests found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>

      {/* ================= ACTION MENU ================= */}
      {menuPosition &&
        createPortal(
          <div
            className="fixed z-9999"
            style={{ top: menuPosition.top, left: menuPosition.left }}
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div className="w-36 bg-[#1a1a1a] border border-gray-700 rounded-md shadow-lg">
              <button
                onClick={() => {
                  const guest = guests.find(
                    (g) => g.guest_id === menuPosition.guestId
                  );
                  initiateAction(
                    menuPosition.guestId,
                    "approve",
                    guest?.name ?? "Unknown"
                  );
                }}
                className="w-full px-4 py-2 text-left text-gray-400 hover:bg-[#222]"
              >
                Approve
              </button>
              <button
                onClick={() => {
                  const guest = guests.find(
                    (g) => g.guest_id === menuPosition.guestId
                  );
                  initiateAction(
                    menuPosition.guestId,
                    "make_vip",
                    guest?.name ?? "Unknown"
                  );
                }}
                className="w-full px-4 py-2 text-left text-gray-400 hover:bg-[#222]"
              >
                Make VIP
              </button>
              <button
                onClick={() => {
                  const guest = guests.find(
                    (g) => g.guest_id === menuPosition.guestId
                  );
                  initiateAction(
                    menuPosition.guestId,
                    "suspend",
                    guest?.name ?? "Unknown"
                  );
                }}
                className="w-full px-4 py-2 text-left text-red-400 hover:bg-[#222]"
              >
                Suspend
              </button>
            </div>
          </div>,
          document.body
        )}

      {/* ================= CONFIRMATION MODAL ================= */}
      {showConfirmModal && confirmAction && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-10000">
          <div className="bg-[#1a1a1a] border border-gray-800 rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-semibold mb-2">Confirm Action</h2>
            <p className="text-gray-400 mb-6">
              Are you sure you want to{" "}
              <span className="text-white font-medium">
                {getActionText(confirmAction.action).toLowerCase()}
              </span>{" "}
              <span className="text-white font-medium">
                {confirmAction.guestName}
              </span>
              ?
            </p>

            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowConfirmModal(false);
                  setConfirmAction(null);
                }}
                className="px-4 py-2 border border-gray-700 rounded-md hover:bg-gray-800"
              >
                Cancel
              </button>
              <button
                onClick={performAction}
                className={`px-4 py-2 rounded-md ${
                  confirmAction.action === "suspend"
                    ? "bg-red-500 hover:bg-red-600"
                    : "bg-pink-500 hover:bg-pink-600"
                }`}
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}