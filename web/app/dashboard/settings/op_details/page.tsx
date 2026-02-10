"use client";

import { useEffect, useState } from "react";
import { withAuthHeaders } from "@/app/services/auth-fetch";
import SettingsTabs from "../components/SettingsTabs";

/* ================= TYPES ================= */

type TimeSlot = {
  open: string;
  close: string;
};

type OpeningHour = {
  day: string;
  is_open: boolean;
  slots: TimeSlot[];
};

type MessageType = "success" | "error" | null;

/* ================= CONSTANTS ================= */

const DAYS = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday"
];

const defaultOpeningHours: OpeningHour[] = DAYS.map(day => ({
  day,
  is_open: false,
  slots: [{ open: "", close: "" }]
}));

/* ================= HELPERS ================= */

// Helper functions can be added here if needed

/* ================= PAGE ================= */

export default function OperationalDetailsPage() {
  const [openingHours, setOpeningHours] =
    useState<OpeningHour[]>(defaultOpeningHours);

  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState<MessageType>(null);
  const [showMessageModal, setShowMessageModal] = useState(false);

  /* ===== FETCH EXISTING DATA ===== */

  useEffect(() => {
    const fetchTiming = async () => {
      try {
        const res = await fetch(
          "/api/club/timing",
          await withAuthHeaders({ method: "GET" })
        );

        if (!res.ok) return;

        const data = await res.json();

        if (Array.isArray(data.opening_hours) && data.opening_hours.length > 0) {
          setOpeningHours(data.opening_hours);
        }

        if (typeof data.notes === "string") {
          setNotes(data.notes);
        }
      } catch (err) {
        console.error("Failed to fetch timing", err);
      }
    };

    fetchTiming();
  }, []);

  /* ===== MESSAGE HELPER ===== */

  const showMessage = (msg: string, type: MessageType) => {
    setMessage(msg);
    setMessageType(type);
    setShowMessageModal(true);
  };

  const closeMessageModal = () => {
    setShowMessageModal(false);
    setTimeout(() => {
      setMessage("");
      setMessageType(null);
    }, 300);
  };

  /* ===== UI LOGIC ===== */

  const toggleDay = (index: number) => {
    setOpeningHours(prev => {
      const updated = [...prev];
      updated[index] = {
        ...updated[index],
        is_open: !updated[index].is_open,
        slots: [{ open: "", close: "" }]
      };
      return updated;
    });
  };

  const updateTime = (
    dayIndex: number,
    field: "open" | "close",
    value: string
  ) => {
    setOpeningHours(prev => {
      const updated = [...prev];
      updated[dayIndex].slots[0][field] = value;
      return updated;
    });
  };

  /* ===== SAVE ===== */

  const saveChanges = async () => {
    setLoading(true);
    try {
      const res = await fetch(
        "/api/club/timing",
        await withAuthHeaders({
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            opening_hours: openingHours,
            notes
          })
        })
      );

      if (!res.ok) throw new Error("Save failed");

      showMessage("Saved successfully ✅", "success");
    } catch (err) {
      console.error(err);
      showMessage("Something went wrong", "error");
    } finally {
      setLoading(false);
    }
  };

  /* ================= RENDER ================= */

  return (
    <>
      {/* Message Modal */}
      {showMessageModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[#111111] border border-gray-800 rounded-lg p-8 max-w-md w-full">
            <div className="flex flex-col items-center text-center">
              {/* Icon */}
              <div
                className={`w-16 h-16 rounded-full flex items-center justify-center mb-4 ${
                  messageType === "success"
                    ? "bg-green-500/10"
                    : "bg-red-500/10"
                }`}
              >
                {messageType === "success" ? (
                  <svg
                    className="w-8 h-8 text-green-500"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                ) : (
                  <svg
                    className="w-8 h-8 text-red-500"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                )}
              </div>

              <h3 className="text-xl font-semibold text-white mb-2">
                {messageType === "success" ? "Success" : "Error"}
              </h3>
              <p className="text-gray-400 text-sm mb-6">{message}</p>

              <button
                onClick={closeMessageModal}
                className="px-6 py-2.5 bg-pink-600 hover:bg-pink-700 text-white rounded-lg transition-colors w-full"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      

      <div className="min-h-screen bg-black text-white p-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-2xl font-semibold">Club Settings</h1>

          <button
            onClick={saveChanges}
            disabled={loading}
            className="bg-pink-600 hover:bg-pink-700 px-6 py-2.5 rounded-md text-sm font-medium transition-colors disabled:opacity-50"
          >
            {loading ? "Saving..." : "Save Changes"}
          </button>
        </div>
        <SettingsTabs />
        <div className="bg-[#0a0a0a] rounded-lg p-6 mb-6">
        {/* Club Information Section */}
        <div className="bg-transparent">
          <div className="flex items-center gap-2 mb-6">
            <svg
              className="w-5 h-5 text-pink-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <h2 className="text-xl font-medium">Club Information</h2>
          </div>

          <div className="space-y-8">
            {/* Opening Hours */}
            <div>
              <h3 className="text-base font-normal text-white mb-4">
                Opening hours
              </h3>

              <div className="space-y-3">
                {openingHours.map((day, index) => (
                  <div
                    key={day.day}
                    className="flex items-center gap-4"
                  >
                    {/* Day Name */}
                    <span className="w-20 capitalize text-white text-sm">
                      {day.day}
                    </span>

                    {/* Toggle Button */}
                    <button
                      onClick={() => toggleDay(index)}
                      className={`relative w-12 h-6 rounded-full transition-all duration-300 ease-in-out ${
                        day.is_open
                          ? "bg-pink-600"
                          : "bg-gray-700"
                      }`}
                    >
                      <span
                        className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow-md transition-transform duration-300 ease-in-out ${
                          day.is_open ? "translate-x-6" : "translate-x-0"
                        }`}
                      />
                    </button>

                    {/* Open/Closed Label */}
                    <span className="w-14 text-sm text-gray-400">
                      {day.is_open ? "Open" : "closed"}
                    </span>

                    {/* Time Inputs - Always visible, disabled when closed */}
                    <input
                      type="time"
                      disabled={!day.is_open}
                      value={day.slots[0].open}
                      onChange={e =>
                        updateTime(index, "open", e.target.value)
                      }
                      className="bg-[#2a2a2a] border-0 rounded-md px-4 py-2 text-white text-sm focus:outline-none focus:ring-1 focus:ring-gray-600 w-32 disabled:opacity-40 disabled:cursor-not-allowed"
                    />

                    <span className="text-gray-400 text-sm">to</span>

                    <input
                      type="time"
                      disabled={!day.is_open}
                      value={day.slots[0].close}
                      onChange={e =>
                        updateTime(index, "close", e.target.value)
                      }
                      className="bg-[#2a2a2a] border-0 rounded-md px-4 py-2 text-white text-sm focus:outline-none focus:ring-1 focus:ring-gray-600 w-32 disabled:opacity-40 disabled:cursor-not-allowed"
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Notes / Dress Code */}
            <div>
              <h3 className="text-base font-normal text-white mb-4">
                Note/Dress codes etc
              </h3>

              <textarea
                rows={5}
                value={notes}
                onChange={e => setNotes(e.target.value)}
                className="w-full bg-[#1a1a1a] border-0 rounded-md px-4 py-3 text-white text-sm placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-gray-600 resize-none"
              />
            </div>
          </div>
        </div>
        </div>
      </div>
    </>
  );
}