"use client";

import { withAuthHeaders } from "@/app/services/auth-fetch";
import React, { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";

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

export default function EditDiscountPage() {
  const router = useRouter();
  const { discountId } = useParams<{ discountId: string }>();

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

  const [events, setEvents] = useState<Event[]>([]);
  const [selectedEventIds, setSelectedEventIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [showEventDropdown, setShowEventDropdown] = useState(false);
  
  // Update status modal states
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [updateStatus, setUpdateStatus] = useState<"updating" | "success" | "error">("updating");
  const [errorMessage, setErrorMessage] = useState("");

  /* ================= FETCH DATA ================= */

  useEffect(() => {
    const fetchData = async () => {
      try {
        /* Fetch events */
        const eventsRes = await fetch(
          "/api/events/club",
          await withAuthHeaders({ method: "GET" })
        );
        const eventsData = await eventsRes.json();
        if (eventsRes.ok) setEvents(eventsData);

        /* Fetch discount */
        const discountRes = await fetch(
          `/api/discount/update?discountId=${discountId}`,
          await withAuthHeaders({ method: "GET" })
        );

        const { data } = await discountRes.json();
        if (!discountRes.ok) throw new Error("Failed to fetch discount");

        setFormData({
          name: data.name,
          code: data.code,
          type: data.discount_type === "flat" ? "fixed" : "percentage",
          value: String(data.discount_value),
          startDate: data.start_date,
          endDate: data.end_date,
          minimumPurchase: data.min_purchase?.toString() ?? "",
          maximumDiscount: data.max_discount?.toString() ?? "",
          applicableDays: data.applicable_days.map(
            (n: number) => numberToDay[n]
          ),
          startTime: data.start_time ?? "",
          endTime: data.end_time ?? "",
          description: data.description ?? "",
          exclusions: data.exclusions ?? "",
        });

        setSelectedEventIds(
          data.discount_events.map((e: any) => e.event_id)
        );
      } catch (err) {
        console.error(err);
        alert("Failed to load discount");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [discountId]);

  /* ================= HELPERS ================= */

  const getSelectedEvents = () => {
    return events.filter((event) => selectedEventIds.includes(event.id));
  };

  /* ================= HANDLERS ================= */

  const handleInputChange = (
    e: React.ChangeEvent<
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

  const handleRemoveEvent = (eventId: string) => {
    setSelectedEventIds((prev) => prev.filter((id) => id !== eventId));
  };

  const handleCancel = () => {
    router.back();
  };

  const handleCloseModal = () => {
    if (updateStatus === "success") {
      router.push("/dashboard/discount");
    } else {
      setShowUpdateModal(false);
    }
  };

  /* ================= UPDATE ================= */

  const handleUpdate = async () => {
    // Show modal with "updating" status
    setShowUpdateModal(true);
    setUpdateStatus("updating");

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
        `/api/discount/update?discountId=${discountId}`,
        await withAuthHeaders({
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        })
      );

      if (res.ok) {
        setUpdateStatus("success");
        // Auto-close and redirect after 1.5 seconds
        setTimeout(() => {
          router.push("/dashboard/discount");
        }, 1500);
      } else {
        const data = await res.json();
        setUpdateStatus("error");
        setErrorMessage(data.error || "Update failed");
      }
    } catch (err) {
      setUpdateStatus("error");
      setErrorMessage("Something went wrong. Please try again.");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center text-white">
        <p className="text-gray-400">Loading discount...</p>
      </div>
    );
  }

  /* ================= UI ================= */

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      {/* Update Status Modal */}
      {showUpdateModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[#111111] border border-gray-800 rounded-lg p-8 max-w-md w-full">
            <div className="flex flex-col items-center text-center">
              {/* Updating State */}
              {updateStatus === "updating" && (
                <>
                  <div className="w-16 h-16 border-4 border-pink-500 border-t-transparent rounded-full animate-spin mb-4"></div>
                  <h3 className="text-xl font-semibold text-white mb-2">
                    Updating Discount...
                  </h3>
                  <p className="text-gray-400 text-sm">
                    Please wait while we update your discount
                  </p>
                </>
              )}

              {/* Success State */}
              {updateStatus === "success" && (
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
                    Successfully Updated!
                  </h3>
                  <p className="text-gray-400 text-sm">
                    Your discount has been updated successfully
                  </p>
                </>
              )}

              {/* Error State */}
              {updateStatus === "error" && (
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
                    Update Failed
                  </h3>
                  <p className="text-gray-400 text-sm mb-4">
                    {errorMessage}
                  </p>
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
        <h1 className="text-2xl font-semibold">Edit Discount</h1>
      </div>

      <div className="p-6 md:p-8">
        {/* Form Container */}
        <div className="bg-[#111111] border border-gray-800 rounded-lg p-6 md:p-8">
          <h2 className="text-xl font-medium mb-1">Update Discount Details</h2>
          <p className="text-gray-400 text-sm mb-6">
            Modify the details of your discount
          </p>

          <div className="space-y-6">
            {/* Apply to Events */}
            <div>
              <label className="block text-sm mb-2 text-gray-300">
                Apply to Events (Optional)
                <p className="text-gray-400 text-sm mb-6">Leave empty to apply this discount to the entire club.</p>
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
                    {events.length === 0 ? (
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

              <div className={formData.type === "fixed" ? "invisible" : "visible"}>
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
              onClick={handleUpdate}
              className="px-6 py-2.5 bg-linear-to-r from-pink-500 to-pink-600 text-white rounded-lg hover:from-pink-600 hover:to-pink-700 transition-colors"
            >
              Update Discount
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}