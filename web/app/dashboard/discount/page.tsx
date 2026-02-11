"use client";
import { withAuthHeaders } from "@/app/services/auth-fetch";
import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

/* ================= TYPES ================= */

interface DiscountFormData {
  name: string;
  code: string;
  type: "percentage" | "fixed";
  value: string;
  startDate: string;
  endDate: string;
  minimumPurchase: string;
  maximumDiscount: string;
  applicableDays: string[];
  startTime: string;
  endTime: string;
  description: string;
  exclusions: string;
}

interface Event {
  id: string;
  name: string;
  banner_image_url?: string | null;
}

interface Discount {
  id: string;
  name: string;
  code: string;
  discount_type: "percentage" | "flat";
  discount_value: number;
  start_date: string;
  end_date: string;
  start_time?: string | null;
  end_time?: string | null;
  applicable_days: number[];
  used_times: number;
  is_active: boolean;
  created_at: string;
  description?: string;
  exclusions?: string;
  min_purchase?: number;
  max_discount?: number;
}


/* ================= CONSTANTS ================= */

const days = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];

const dayToNumber: Record<string, number> = {
  Monday: 1,
  Tuesday: 2,
  Wednesday: 3,
  Thursday: 4,
  Friday: 5,
  Saturday: 6,
  Sunday: 7,
};

const numberToDay: Record<number, string> = {
  1: "Monday",
  2: "Tuesday",
  3: "Wednesday",
  4: "Thursday",
  5: "Friday",
  6: "Saturday",
  7: "Sunday",
};

/* ================= COMPONENT ================= */

const DiscountManagement = () => {
  const router = useRouter();
  /* -------- FORM STATE -------- */
  const [formData, setFormData] = useState<DiscountFormData>({
    name: "",
    code: "",
    type: "percentage",
    value: "",
    startDate: "",
    endDate: "",
    minimumPurchase: "",
    maximumDiscount: "",
    applicableDays: [],
    startTime: "",
    endTime: "",
    description: "",
    exclusions: "",
  });

  /* -------- EVENTS -------- */
  const [events, setEvents] = useState<Event[]>([]);
  const [selectedEventIds, setSelectedEventIds] = useState<string[]>([]);
  const [loadingEvents, setLoadingEvents] = useState(false);
  const [showEventDropdown, setShowEventDropdown] = useState(false);

  /* -------- DISCOUNTS -------- */
  const [discounts, setDiscounts] = useState<Discount[]>([]);
  const [loadingDiscounts, setLoadingDiscounts] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState("All Discounts");
  const [expandedDiscountId, setExpandedDiscountId] = useState<string | null>(
    null
  );

  /* -------- CREATE MODAL -------- */
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createStatus, setCreateStatus] = useState<
    "creating" | "success" | "error"
  >("creating");
  const [errorMessage, setErrorMessage] = useState("");

  /* -------- DELETE MODAL -------- */
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [discountToDelete, setDiscountToDelete] = useState<Discount | null>(null);

  /* ================= EFFECTS ================= */

  useEffect(() => {
    const fetchEvents = async () => {
      setLoadingEvents(true);
      try {
        const res = await fetch(
          "/api/events/club",
          await withAuthHeaders({ method: "GET" })
        );
        const data = await res.json();
        if (res.ok) setEvents(data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoadingEvents(false);
      }
    };
    fetchEvents();
  }, []);

  useEffect(() => {
    const timeout = setTimeout(() => {
      const fetchDiscounts = async () => {
        setLoadingDiscounts(true);
        try {
          const params = new URLSearchParams();
          if (searchQuery.trim() !== "") {
            params.set("search", searchQuery.trim());
          }

          const res = await fetch(
            `/api/discount?${params.toString()}`,
            await withAuthHeaders({ method: "GET" })
          );

          const json = await res.json();
          if (res.ok) setDiscounts(json.data);
        } catch (err) {
          console.error(err);
        } finally {
          setLoadingDiscounts(false);
        }
      };

      fetchDiscounts();
    }, 400);

    return () => clearTimeout(timeout);
  }, [searchQuery]);

  /* ================= HELPERS ================= */

  const today = new Date().toISOString().split("T")[0];


  const buildDateTime = (date: string, time?: string | null) => {
    // If time is missing, default to start or end of day
    const safeTime = time ?? "00:00";
    return new Date(`${date}T${safeTime}`);
  };


  const isExpired = (d: Discount) => {
    const now = new Date();

    const startDateTime = buildDateTime(d.start_date, d.start_time);
    const endDateTime = buildDateTime(d.end_date, d.end_time ?? "23:59");

    return now > endDateTime;
  };


  const getStatus = (d: Discount) => {
    const now = new Date();

    const startDateTime = buildDateTime(d.start_date, d.start_time);
    const endDateTime = buildDateTime(d.end_date, d.end_time ?? "23:59");

    if (now < startDateTime) return "Inactive"; // or "Upcoming"
    if (now > endDateTime) return "Expired";
    if (!d.is_active) return "Inactive";

    return "Active";
  };


  const statusStyles: Record<string, string> = {
    Active: "bg-green-500 text-white",
    Inactive: "bg-gray-500 text-white",
    Expired: "bg-red-500 text-white",
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
    });
  };

  const getSelectedEvents = () => {
    return events.filter((event) => selectedEventIds.includes(event.id));
  };

  /* ================= HANDLERS ================= */

  const handleInputChange = (
    e: React.ChangeEvent <
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleDayToggle = (day: string) => {
    setFormData((prev) => ({
      ...prev,
      applicableDays: prev.applicableDays.includes(day)
        ? prev.applicableDays.filter((d) => d !== day)
        : [...prev.applicableDays, day],
    }));
  };

  const handleEventToggle = (eventId: string) => {
    setSelectedEventIds((prev) =>
      prev.includes(eventId)
        ? prev.filter((id) => id !== eventId)
        : [...prev, eventId]
    );
  };

  const handleToggleActive = async (d: Discount) => {
    if (isExpired(d)) return;

    const res = await fetch(
      `/api/discount/update?discountId=${d.id}`,
      await withAuthHeaders({
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          is_active: !d.is_active,
        }),
      })
    );

    if (res.ok) {
      setDiscounts((prev) =>
        prev.map((x) =>
          x.id === d.id ? { ...x, is_active: !x.is_active } : x
        )
      );
    }
  };


  const handleRemoveEvent = (eventId: string) => {
    setSelectedEventIds((prev) => prev.filter((id) => id !== eventId));
  };

  const handleDeleteClick = (d: Discount) => {
    setDiscountToDelete(d);
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    if (!discountToDelete) return;

    const res = await fetch(
      `/api/discount/delete?discountId=${discountToDelete.id}`,
      await withAuthHeaders({ method: "DELETE" })
    );

    if (res.ok) {
      setDiscounts(prev => prev.filter(x => x.id !== discountToDelete.id));
      setShowDeleteModal(false);
      setDiscountToDelete(null);
    }
  };

  const cancelDelete = () => {
    setShowDeleteModal(false);
    setDiscountToDelete(null);
  };



  const handleCancel = () => {
    setFormData({
      name: "",
      code: "",
      type: "percentage",
      value: "",
      startDate: "",
      endDate: "",
      minimumPurchase: "",
      maximumDiscount: "",
      applicableDays: [],
      startTime: "",
      endTime: "",
      description: "",
      exclusions: "",
    });
    setSelectedEventIds([]);
  };

  const handleCloseModal = () => {
    if (createStatus === "success") {
      window.location.reload();
    } else {
      setShowCreateModal(false);
    }
  };

  const handleCreateDiscount = async () => {
    if (!formData.value || !formData.startDate || !formData.endDate) {
      alert("Missing required fields");
      return;
    }

    // Show modal with "creating" status
    setShowCreateModal(true);
    setCreateStatus("creating");

    const payload = {
      eventIds: selectedEventIds,
      name: formData.name,
      code: formData.code,
      discount_type: formData.type === "fixed" ? "flat" : "percentage",
      discount_value: Number(formData.value),
      min_purchase: formData.minimumPurchase
        ? Number(formData.minimumPurchase)
        : null,
      max_discount: formData.maximumDiscount
        ? Number(formData.maximumDiscount)
        : null,
      start_date: formData.startDate,
      end_date: formData.endDate,
      start_time: formData.startTime || null,
      end_time: formData.endTime || null,
      applicable_days: formData.applicableDays.map((d) => dayToNumber[d]),
      description: formData.description,
      exclusions: formData.exclusions,
      is_active: true,
    };

    try {
      const res = await fetch(
        "/api/discount",
        await withAuthHeaders({
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        })
      );

      if (res.ok) {
        setCreateStatus("success");
        // Auto-close and reload after 1.5 seconds
        setTimeout(() => {
          window.location.reload();
        }, 1500);
      } else {
        const data = await res.json();
        setCreateStatus("error");
        setErrorMessage(data.error || "Failed to create discount");
      }
    } catch (err) {
      setCreateStatus("error");
      setErrorMessage("Something went wrong. Please try again.");
    }
  };

  const toggleDiscountExpansion = (id: string) => {
    setExpandedDiscountId(expandedDiscountId === id ? null : id);
  };

  /* ================= COMPUTED VALUES ================= */

  const filteredDiscounts = discounts.filter((d) => {
    if (filterStatus === "All Discounts") return true;
    
    const status = getStatus(d);
    return status === filterStatus;
  });

  /* ================= UI ================= */

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      {/* Delete Confirmation Modal */}
      {showDeleteModal && discountToDelete && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[#111111] border border-gray-800 rounded-lg p-8 max-w-md w-full">
            <div className="flex flex-col items-center text-center">
              {/* Warning Icon */}
              <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mb-4">
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
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                  />
                </svg>
              </div>

              <h3 className="text-xl font-semibold text-white mb-2">
                Delete Discount?
              </h3>
              <p className="text-gray-400 text-sm mb-6">
                Are you sure you want to delete &quot;{discountToDelete.name}&quot;? This action cannot be undone.
              </p>

              {/* Action Buttons */}
              <div className="flex gap-3 w-full">
                <button
                  onClick={cancelDelete}
                  className="flex-1 px-6 py-2.5 bg-transparent border border-gray-700 text-white rounded-lg hover:bg-[#1a1a1a] transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmDelete}
                  className="flex-1 px-6 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Create Status Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[#111111] border border-gray-800 rounded-lg p-8 max-w-md w-full">
            <div className="flex flex-col items-center text-center">
              {/* Creating State */}
              {createStatus === "creating" && (
                <>
                  <div className="w-16 h-16 border-4 border-pink-500 border-t-transparent rounded-full animate-spin mb-4"></div>
                  <h3 className="text-xl font-semibold text-white mb-2">
                    Creating Discount...
                  </h3>
                  <p className="text-gray-400 text-sm">
                    Please wait while we create your discount
                  </p>
                </>
              )}

              {/* Success State */}
              {createStatus === "success" && (
                <>
                  <div className="w-16 h-16 bg-green-500/10 rounded-full flex items-center justify-center mb-4">
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
                  </div>
                  <h3 className="text-xl font-semibold text-white mb-2">
                    Successfully Created!
                  </h3>
                  <p className="text-gray-400 text-sm">
                    Your discount has been created successfully
                  </p>
                </>
              )}

              {/* Error State */}
              {createStatus === "error" && (
                <>
                  <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mb-4">
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
                  </div>
                  <h3 className="text-xl font-semibold text-white mb-2">
                    Creation Failed
                  </h3>
                  <p className="text-gray-400 text-sm mb-4">{errorMessage}</p>
                  <button
                    onClick={handleCloseModal}
                    className="px-6 py-2.5 bg-linear-to-r from-pink-500 to-pink-600 text-white rounded-lg hover:from-pink-600 hover:to-pink-700 transition-colors"
                  >
                    Try Again
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="border-b border-gray-800 px-6 md:px-8 py-4">
        <h1 className="text-2xl font-semibold">Discounts & Offers</h1>
      </div>

      <div className="p-6 md:p-8">
        {/* ================= CREATE DISCOUNT ================= */}
        <div className="bg-[#111111] border border-gray-800 rounded-lg p-6 md:p-8 mb-8">
          <h2 className="text-xl font-medium mb-1">Create a New Discount</h2>
          <p className="text-gray-400 text-sm mb-6">
            Fill in the details to create a new discount for your club
          </p>

          <div className="space-y-6">
            {/* Apply to Events */}
            <div>
              <label className="block text-sm mb-2 text-gray-300">
                Apply to Events (Optional)
              </label>

              {/* Selected Events Display */}
              {selectedEventIds.length > 0 && (
                <div className="mb-3 flex flex-wrap gap-2">
                  {getSelectedEvents().map((event) => (
                    <div
                      key={event.id}
                      className="flex items-center gap-2 bg-[#1a1a1a] border border-gray-700 rounded-lg px-3 py-2"
                    >
                      {event.banner_image_url && (
                        <img
                          src={event.banner_image_url}
                          alt={event.name}
                          className="w-6 h-6 rounded object-cover"
                        />
                      )}
                      <span className="text-sm text-white">{event.name}</span>
                      <button
                        onClick={() => handleRemoveEvent(event.id)}
                        className="ml-1 text-gray-400 hover:text-white"
                      >
                        <svg
                          className="w-4 h-4"
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
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Dropdown Button */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowEventDropdown(!showEventDropdown)}
                  className="w-full bg-[#1a1a1a] border border-gray-700 rounded-lg px-4 py-2.5 text-left text-gray-400 hover:border-gray-600 focus:outline-none focus:border-gray-600 flex items-center justify-between"
                >
                  <span>
                    {selectedEventIds.length > 0
                      ? `${selectedEventIds.length} event${
                          selectedEventIds.length > 1 ? "s" : ""
                        } selected`
                      : "Select events"}
                  </span>
                  <svg
                    className={`w-5 h-5 text-gray-400 transition-transform ${
                      showEventDropdown ? "rotate-180" : ""
                    }`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 9l-7 7-7-7"
                    />
                  </svg>
                </button>

                {/* Dropdown Menu */}
                {showEventDropdown && (
                  <div className="absolute z-10 w-full mt-2 bg-[#1a1a1a] border border-gray-700 rounded-lg shadow-lg max-h-64 overflow-y-auto">
                    {loadingEvents ? (
                      <div className="p-4 flex items-center justify-center gap-2">
                        <div className="relative w-4 h-4">
                          <div className="absolute inset-0 rounded-full border-2 border-gray-800" />
                          <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-pink-500 animate-spin" />
                        </div>
                        <span className="text-gray-400 text-sm animate-pulse">Loading events...</span>
                      </div>
                    ) : events.length === 0 ? (
                      <div className="p-4 text-center text-gray-400 text-sm">
                        No events available
                      </div>
                    ) : (
                      <div className="py-2">
                        {events.map((event) => (
                          <label
                            key={event.id}
                            className="flex items-center gap-3 px-4 py-3 hover:bg-[#252525] cursor-pointer transition-colors"
                          >
                            <input
                              type="checkbox"
                              checked={selectedEventIds.includes(event.id)}
                              onChange={() => handleEventToggle(event.id)}
                              className="w-4 h-4 accent-pink-500 rounded"
                            />

                            {event.banner_image_url && (
                              <img
                                src={event.banner_image_url}
                                alt={event.name}
                                className="w-10 h-10 rounded object-cover"
                              />
                            )}

                            <span className="text-white text-sm flex-1">
                              {event.name}
                            </span>
                          </label>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Discount Name & Code */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm mb-2 text-gray-300">
                  Discount Name
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  placeholder="e.g., Happy Hour Special"
                  className="w-full bg-[#1a1a1a] border border-gray-700 rounded-lg px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-gray-600"
                />
              </div>

              <div>
                <label className="block text-sm mb-2 text-gray-300">
                  Discount Code
                </label>
                <input
                  type="text"
                  name="code"
                  value={formData.code}
                  onChange={handleInputChange}
                  placeholder="e.g., HAPPY20"
                  className="w-full bg-[#1a1a1a] border border-gray-700 rounded-lg px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-gray-600"
                />
              </div>
            </div>

            {/* Discount Type & Value */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm mb-2 text-gray-300">
                  Discount Type
                </label>

                <div className="relative">
                  <select
                    name="type"
                    value={formData.type}
                    onChange={handleInputChange}
                    className="
                      w-full bg-[#1a1a1a] border border-gray-700 rounded-lg
                      px-4 py-2.5 text-white
                      focus:outline-none focus:border-gray-600
                      appearance-none cursor-pointer
                    "
                  >
                    <option value="percentage">Percentage (%)</option>
                    <option value="fixed">Fixed Amount</option>
                  </select>

                  {/* Tiny arrow */}
                  <svg
                    className="
                      pointer-events-none
                      absolute right-3 top-1/2 -translate-y-1/2
                      w-3.5 h-3.5 text-gray-500
                    "
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={2}
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M19 9l-7 7-7-7"
                    />
                  </svg>
                </div>
              </div>


              <div>
                <label className="block text-sm mb-2 text-gray-300">
                  Discount Value
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
                    {formData.type === "percentage" ? "%" : "₹"}
                  </span>
                  <input
                    type="number"
                    name="value"
                    value={formData.value}
                    onChange={handleInputChange}
                    placeholder="20"
                    className="w-full bg-[#1a1a1a] border border-gray-700 rounded-lg pl-10 pr-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-gray-600"
                  />
                </div>
              </div>
            </div>

            {/* Date Range */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm mb-2 text-gray-300">
                  Start Date
                </label>
                <div className="relative">
                  <input
                    type="date"
                    name="startDate"
                    value={formData.startDate}
                    min={today}
                    onChange={handleInputChange}
                    className="w-full bg-[#1a1a1a] border border-gray-700 rounded-lg pl-10 pr-4 py-2.5 text-white focus:outline-none focus:border-gray-600"
                  />
                  <svg
                    className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                    />
                  </svg>
                </div>
              </div>

              <div>
                <label className="block text-sm mb-2 text-gray-300">
                  End Date
                </label>
                <div className="relative">
                  <input
                    type="date"
                    name="endDate"
                    min={formData.startDate || today}
                    value={formData.endDate}
                    onChange={handleInputChange}
                    className="w-full bg-[#1a1a1a] border border-gray-700 rounded-lg pl-10 pr-4 py-2.5 text-white focus:outline-none focus:border-gray-600"
                  />
                  <svg
                    className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                    />
                  </svg>
                </div>
              </div>
            </div>

            {/* Purchase Limits */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm mb-2 text-gray-300">
                  Minimum Purchase (Optional)
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
                    ₹
                  </span>
                  <input
                    type="number"
                    name="minimumPurchase"
                    value={formData.minimumPurchase}
                    onChange={handleInputChange}
                    placeholder="0.00"
                    className="w-full bg-[#1a1a1a] border border-gray-700 rounded-lg pl-10 pr-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-gray-600"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm mb-2 text-gray-300">
                  Maximum Discount (Optional)
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
                    ₹
                  </span>
                  <input
                    type="number"
                    name="maximumDiscount"
                    value={formData.maximumDiscount}
                    onChange={handleInputChange}
                    placeholder="0.00"
                    className="w-full bg-[#1a1a1a] border border-gray-700 rounded-lg pl-10 pr-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-gray-600"
                  />
                </div>
              </div>
            </div>

            {/* Applicable Days */}
            <div>
              <label className="block text-sm mb-3 text-gray-300">
                Applicable Days
              </label>
              <div className="flex flex-wrap gap-3">
                {days.map((day) => (
                  <label
                    key={day}
                    className="flex items-center cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={formData.applicableDays.includes(day)}
                      onChange={() => handleDayToggle(day)}
                      className="sr-only"
                    />
                    <div
                      className={`flex items-center space-x-2 ${
                        formData.applicableDays.includes(day)
                          ? "text-pink-500"
                          : "text-gray-400"
                      }`}
                    >
                      <div
                        className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                          formData.applicableDays.includes(day)
                            ? "border-pink-500"
                            : "border-gray-600"
                        }`}
                      >
                        {formData.applicableDays.includes(day) && (
                          <div className="w-2 h-2 rounded-full bg-pink-500"></div>
                        )}
                      </div>
                      <span className="text-sm">{day}</span>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {/* Time Range */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm mb-2 text-gray-300">
                  Start Time
                </label>
                <div className="relative">
                  <input
                    type="time"
                    name="startTime"
                    value={formData.startTime}
                    onChange={handleInputChange}
                    className="w-full bg-[#1a1a1a] border border-gray-700 rounded-lg pl-10 pr-4 py-2.5 text-white focus:outline-none focus:border-gray-600"
                  />
                  <svg
                    className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                </div>
              </div>

              <div>
                <label className="block text-sm mb-2 text-gray-300">
                  End Time
                </label>
                <div className="relative">
                  <input
                    type="time"
                    name="endTime"
                    value={formData.endTime}
                    onChange={handleInputChange}
                    className="w-full bg-[#1a1a1a] border border-gray-700 rounded-lg pl-10 pr-4 py-2.5 text-white focus:outline-none focus:border-gray-600"
                  />
                  <svg
                    className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                </div>
              </div>
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm mb-2 text-gray-300">
                Description
              </label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                placeholder="Describe the discount and its terms"
                rows={3}
                className="w-full bg-[#1a1a1a] border border-gray-700 rounded-lg px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-gray-600 resize-none"
              />
            </div>

            {/* Exclusions */}
            <div>
              <label className="block text-sm mb-2 text-gray-300">
                Exclusions & Limitations (Optional)
              </label>
              <textarea
                name="exclusions"
                value={formData.exclusions}
                onChange={handleInputChange}
                placeholder="Any exclusions or limitations for this discount"
                rows={3}
                className="w-full bg-[#1a1a1a] border border-gray-700 rounded-lg px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-gray-600 resize-none"
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 mt-8">
            <button
              onClick={handleCancel}
              className="px-6 py-2.5 bg-transparent border border-gray-700 text-white rounded-lg hover:bg-[#1a1a1a] transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleCreateDiscount}
              className="px-6 py-2.5 bg-linear-to-r from-pink-500 to-pink-600 text-white rounded-lg hover:from-pink-600 hover:to-pink-700 transition-colors"
            >
              Create Discount
            </button>
          </div>
        </div>

        {/* ================= DISCOUNTS LIST ================= */}
        <div className="border-t border-gray-800 pt-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
            <div>
              <h2 className="text-xl font-semibold mb-1">
                Your Discounts & Offers
              </h2>
              <p className="text-gray-400 text-sm">
                Manage your active, upcoming, and past discounts
              </p>
            </div>

            <div className="flex gap-3 mt-4 md:mt-0">
              {/* Filter Dropdown */}
              <div className="relative">
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="bg-[#1a1a1a] border border-gray-700 rounded-lg px-4 py-2 pr-10 text-white text-sm focus:outline-none focus:border-gray-600 appearance-none cursor-pointer"
                >
                  <option>All Discounts</option>
                  <option>Active</option>
                  <option>Inactive</option>
                  <option>Expired</option>
                </select>
                <svg
                  className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 9l-7 7-7-7"
                  />
                </svg>
              </div>

              {/* Search */}
              <div className="relative">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search discounts..."
                  className="bg-[#1a1a1a] border border-gray-700 rounded-lg pl-10 pr-4 py-2 text-white text-sm placeholder-gray-500 focus:outline-none focus:border-gray-600 w-64"
                />
                <svg
                  className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
              </div>
            </div>
          </div>

          {loadingDiscounts ? (
            <div className="flex flex-col items-center justify-center py-12 gap-4">
              <div className="relative w-10 h-10">
                <div className="absolute inset-0 rounded-full border-4 border-gray-800" />
                <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-pink-500 animate-spin" />
              </div>
              <p className="text-sm text-gray-500 animate-pulse">Loading discounts...</p>
            </div>
          ) : filteredDiscounts.length === 0 ? (
            <div className="text-center py-12 bg-[#111111] border border-gray-800 rounded-lg">
              <p className="text-gray-400">
                {filterStatus === "All Discounts" 
                  ? "No discounts found" 
                  : `No ${filterStatus.toLowerCase()} discounts found`}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredDiscounts.map((d) => {
                const status = getStatus(d);
                const isExpanded = expandedDiscountId === d.id;
                const expired = isExpired(d);

                return (
                  <div
                    key={d.id}
                    className="bg-[#111111] border border-gray-800 rounded-lg overflow-hidden"
                  >
                    {/* Main Row */}
                    <div className="flex items-center gap-4 p-4">
                      {/* Icon */}
                      <div className="w-10 h-10 bg-pink-500/10 rounded-lg flex items-center justify-center shrink-0">
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
                            d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"
                          />
                        </svg>
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <h3 className="text-base font-medium text-white mb-1">
                          {d.name}
                        </h3>
                        <div className="flex items-center gap-3 text-sm text-gray-400">
                          <span className="flex items-center gap-1">
                            <svg
                              className="w-4 h-4 text-pink-500"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"
                              />
                            </svg>
                            {d.code}
                          </span>
                          <span>
                            {d.discount_type === "percentage"
                              ? `${d.discount_value}% off`
                              : `₹${d.discount_value} off`}
                          </span>
                          <span>Used {d.used_times} times</span>
                        </div>
                      </div>

                      {/* Status Badge */}
                      <span
                        className={`px-3 py-1 text-xs rounded-full font-medium ${statusStyles[status]}`}
                      >
                        {status}
                      </span>

                      {/* Action Buttons */}
                      <div className="flex items-center gap-2">
                        {/* Edit Button */}
                        <button
                          onClick={() =>
                            router.push(`/dashboard/discount/${d.id}`)
                          }
                          className="p-2 hover:bg-[#1a1a1a] rounded-lg transition-colors"
                        >
                          <svg
                            className="w-4 h-4 text-gray-400"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                            />
                          </svg>
                        </button>

                       {/* Toggle Active Button */}
                        <button
                          onClick={() => handleToggleActive(d)}
                          disabled={expired}
                          className={`
                            relative w-9 h-5 rounded-full transition-all duration-300 ease-in-out
                            ${expired
                              ? "bg-gray-700/50 cursor-not-allowed opacity-50"
                              : d.is_active
                              ? "bg-linear-to-r from-pink-500 to-pink-600"
                              : "bg-gray-600 hover:bg-gray-500"}
                          `}
                          title={expired ? "Cannot toggle expired discount" : d.is_active ? "Deactivate discount" : "Activate discount"}
                        >
                          <span
                            className={`
                              absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow-md
                              transition-transform duration-300 ease-in-out
                              ${!expired && d.is_active ? "translate-x-4" : "translate-x-0"}
                            `}
                          />
                        </button>


                        {/* Delete Button */}
                        <button 
                          onClick={() => handleDeleteClick(d)}
                          className="p-2 hover:bg-[#1a1a1a] rounded-lg transition-colors"
                        >
                          <svg
                            className="w-4 h-4 text-gray-400"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                            />
                          </svg>
                        </button>

                        {/* Expand Button */}
                        <button
                          onClick={() => toggleDiscountExpansion(d.id)}
                          className="p-2 hover:bg-[#1a1a1a] rounded-lg transition-colors"
                        >
                          <svg
                            className={`w-4 h-4 text-gray-400 transition-transform ${
                              isExpanded ? "rotate-180" : ""
                            }`}
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M19 9l-7 7-7-7"
                            />
                          </svg>
                        </button>
                      </div>
                    </div>

                    {/* Expanded Content */}
                    {isExpanded && (
                      <div className="border-t border-gray-800 p-4 bg-[#0a0a0a]">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          {/* Left Column */}
                          <div className="space-y-4">
                            <div>
                              <h4 className="text-sm font-medium text-gray-400 mb-2">
                                Validity Period
                              </h4>
                              <p className="text-white text-sm">
                                {formatDate(d.start_date)} -{" "}
                                {formatDate(d.end_date)}
                              </p>
                            </div>

                            <div>
                              <h4 className="text-sm font-medium text-gray-400 mb-2">
                                Applicable Days
                              </h4>
                              <div className="flex flex-wrap gap-2">
                                {d.applicable_days.map((day) => (
                                  <span
                                    key={day}
                                    className="px-2 py-1 text-xs bg-[#1a1a1a] border border-gray-700 rounded text-gray-300"
                                  >
                                    {numberToDay[day]}
                                  </span>
                                ))}
                              </div>
                            </div>

                            {d.description && (
                              <div>
                                <h4 className="text-sm font-medium text-gray-400 mb-2">
                                  Description
                                </h4>
                                <p className="text-white text-sm">
                                  {d.description}
                                </p>
                              </div>
                            )}
                          </div>

                          {/* Right Column */}
                          <div className="space-y-4">
                            {d.exclusions && (
                              <div>
                                <h4 className="text-sm font-medium text-gray-400 mb-2 flex items-center gap-2">
                                  <svg
                                    className="w-4 h-4 text-yellow-500"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                  >
                                    <path
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      strokeWidth={2}
                                      d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                                    />
                                  </svg>
                                  Exclusions & Limitations
                                </h4>
                                <p className="text-white text-sm">
                                  {d.exclusions}
                                </p>
                              </div>
                            )}

                            <div>
                              <h4 className="text-sm font-medium text-gray-400 mb-2">
                                Created On
                              </h4>
                              <p className="text-white text-sm">
                                {formatDate(d.created_at)}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DiscountManagement;