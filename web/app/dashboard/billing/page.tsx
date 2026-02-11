"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import supabasePublic from "@/app/services/supabase-public";
import { withAuthHeaders } from "@/app/services/auth-fetch";

/* ================= TYPES ================= */

type TransactionStatus = "success" | "failed" | "refunded" | "pending";
type Event = { id: string; name: string };

type Transaction = {
  id: string;
  user_id: string;
  amount: number;
  status: TransactionStatus;
  created_at: string;
  event_name: string | null;
  users: { name: string } | null;
};

type Summary = {
  totalClaimed: number;
  totalPending: number;
  totalRefunded: number;
  payoutInProcess: boolean;
};

type TabType = "event" | "food";

type Payout = {
  id: string;
  amount: number;
  status: "processing" | "success" | "failed";
  requested_at: string;
};

/* ================= PAGE ================= */

export default function BillingPage() {
  const router = useRouter();

  /* ================= FILTER STATES ================= */

  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [searchName, setSearchName] = useState("");

  const [events, setEvents] = useState<Event[]>([]);
  const [selectedEventIds, setSelectedEventIds] = useState<string[]>([]);
  const [showEventDropdown, setShowEventDropdown] = useState(false);

  /* ================= PAGE STATE ================= */

  const [activeTab, setActiveTab] = useState<TabType>("event");
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);

  const [checkingAuth, setCheckingAuth] = useState(true);
  const [loading, setLoading] = useState(true);

  const [showClaimHistory, setShowClaimHistory] = useState(false);
  const [payoutHistory, setPayoutHistory] = useState<Payout[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [showPanModal, setShowPanModal] = useState(false);
  const [panNo, setPanNo] = useState("");
  const [panError, setPanError] = useState("");
  const [panSaving, setPanSaving] = useState(false);
  const [originalPan, setOriginalPan] = useState<string | null>(null);

  const eventDropdownRef = useRef<HTMLDivElement | null>(null);

  /* ================= AUTH CHECK ================= */

  useEffect(() => {
    const checkAuth = async () => {
      const { data } = await supabasePublic.auth.getSession();
      if (!data.session) router.replace("/auth/login");
      else setCheckingAuth(false);
    };
    checkAuth();
  }, [router]);

  /* ================= FETCH EVENTS ================= */

  const fetchEvents = async () => {
    const options = await withAuthHeaders({ method: "GET" });
    const res = await fetch("/api/events/club", options);
    const json = await res.json();

    if (Array.isArray(json)) setEvents(json);
    else setEvents([]);
  };

  /* ================= FETCH SUMMARY ================= */

  const fetchSummary = async () => {
    const options = await withAuthHeaders({ method: "GET" });
    const res = await fetch("/api/club/billing/summary", options);
    setSummary(await res.json());
  };

  /* ================= FETCH TRANSACTIONS ================= */

  const fetchTransactions = async () => {
    const params = new URLSearchParams({ category: activeTab });

    if (fromDate) params.append("fromDate", fromDate);
    if (toDate) params.append("toDate", toDate);
    if (searchName) params.append("search", searchName);

    if (activeTab === "event" && selectedEventIds.length > 0) {
      params.append("eventIds", selectedEventIds.join(","));
    }

    const options = await withAuthHeaders({ method: "GET" });
    const res = await fetch(`/api/club/billing?${params}`, options);
    const json = await res.json();

    setTransactions(json.data || []);
  };

  /* ================= INITIAL LOAD ================= */

  useEffect(() => {
    if (checkingAuth) return;

    const load = async () => {
      setLoading(true);
      await Promise.all([fetchSummary(), fetchTransactions()]);
      setLoading(false);
    };

    load();
  }, [checkingAuth, activeTab]);

  /* ================= TAB CHANGE EFFECTS ================= */

  useEffect(() => {
    if (activeTab === "event") {
      fetchEvents();
    } else {
      setSelectedEventIds([]);
      setShowEventDropdown(false);
    }
  }, [activeTab]);

  const fetchClaimHistory = async () => {
    setHistoryLoading(true);

    const options = await withAuthHeaders({ method: "GET" });
    const res = await fetch("/api/club/payouts/history", options);
    const json = await res.json();

    setPayoutHistory(json.data || []);
    setHistoryLoading(false);
  };

  const exportPDF = async () => {
  try {
    const params = new URLSearchParams({
      category: activeTab,
    });

    if (fromDate) params.append("fromDate", fromDate);
    if (toDate) params.append("toDate", toDate);
    if (searchName) params.append("search", searchName);

    if (activeTab === "event" && selectedEventIds.length > 0) {
      params.append("eventIds", selectedEventIds.join(","));
    }

    const options = await withAuthHeaders({ method: "GET" });
    const res = await fetch(`/api/club/billing/pdf?${params}`, options);

    if (!res.ok) throw new Error("Failed to export PDF");

    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = `billing-${activeTab}.pdf`;
    document.body.appendChild(a);
    a.click();

    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  } catch (err) {
    console.error(err);
    alert("Failed to export PDF");
  }
};


  const openPanModal = async () => {
    setPanError("");
    const options = await withAuthHeaders({ method: "GET" });
    const res = await fetch("/api/club", options);
    const club = await res.json();

    setPanNo(club.pan_no ?? "");
    setOriginalPan(club.pan_no ?? null);
    setShowPanModal(true);
  };

  const confirmPanAndClaim = async () => {
    if (panNo.length !== 10) {
      setPanError("PAN must be exactly 10 characters");
      return;
    }

    setPanSaving(true);
    setPanError("");

    try {
      if (panNo !== originalPan) {
        const options = await withAuthHeaders({
          method: "PATCH",
          body: JSON.stringify({ pan_no: panNo }),
        });

        const res = await fetch("/api/club", options);
        if (!res.ok) throw new Error("Failed to update PAN");
      }

      const payoutOptions = await withAuthHeaders({ method: "POST" });
      await fetch("/api/club/billing/summary", payoutOptions);

      setShowPanModal(false);
      fetchSummary();
    } catch (err: any) {
      setPanError(err.message);
    } finally {
      setPanSaving(false);
    }
  };

  useEffect(() => {
    if (!showEventDropdown) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (
        eventDropdownRef.current &&
        !eventDropdownRef.current.contains(e.target as Node)
      ) {
        setShowEventDropdown(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showEventDropdown]);

  /* ================= UI LOADING ================= */

  if (checkingAuth || loading || !summary) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <div className="relative w-12 h-12">
          <div className="absolute inset-0 rounded-full border-4 border-gray-800" />
          <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-pink-500 animate-spin" />
        </div>
        <p className="text-sm text-gray-500 animate-pulse">Loading billing data...</p>
      </div>
    );
  }

  /* ================= UI ================= */

  return (
    <div className="p-8 space-y-6 text-white bg-black min-h-screen">
      {/* HEADER */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-semibold">Billing & Receipts</h1>
          <p className="text-sm text-gray-400">
            Monitor and manage all customer payments and revenue
          </p>
        </div>

        <div className="text-right">
          <button
            onClick={openPanModal}
            disabled={summary.payoutInProcess}
            className={`px-5 py-2 rounded-md font-medium ${
              summary.payoutInProcess
                ? "bg-gray-600 cursor-not-allowed"
                : "bg-pink-500 hover:bg-pink-400"
            }`}
          >
            {summary.payoutInProcess ? "Under Process" : "₹ Claim Payout"}
          </button>
          <p className="text-xs text-gray-500 mt-2">
            Note: Claiming your revenue will initiate a 7-day
            <br />
            processing period to your registered payout account.
          </p>
        </div>
      </div>

      {/* FILTERS */}
      <div className="bg-[#111] border border-gray-800 rounded-lg p-6">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          {/* Date Range - From */}
          <div>
            <label className="flex items-center gap-2 text-sm text-gray-400 mb-2">
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                <line x1="16" y1="2" x2="16" y2="6" />
                <line x1="8" y1="2" x2="8" y2="6" />
                <line x1="3" y1="10" x2="21" y2="10" />
              </svg>
              Date Range
            </label>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              onClick={(e) => (e.currentTarget as HTMLInputElement).showPicker?.()}
              className="w-full px-3 py-2 bg-black border border-gray-700 rounded-md text-sm focus:outline-none focus:border-gray-600"
            />
          </div>

          {/* Date Range - To */}
          <div>
            <label className="text-sm text-gray-400 mb-2 block opacity-0">To</label>
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              onClick={(e) => (e.currentTarget as HTMLInputElement).showPicker?.()}
              className="w-full px-3 py-2 bg-black border border-gray-700 rounded-md text-sm focus:outline-none focus:border-gray-600"
            />
          </div>

          {/* Event Filter - Only for Event Tab */}
          {activeTab === "event" && (
            <div className="relative" ref={eventDropdownRef}>
              <label className="text-sm text-gray-400 mb-2 block">Event Filter</label>
              <button
                onClick={() => setShowEventDropdown((v) => !v)}
                className="w-full px-3 py-2 bg-black border border-gray-700 rounded-md text-sm text-left focus:outline-none focus:border-gray-600 flex justify-between items-center"
              >
                <span>
                  {selectedEventIds.length
                    ? `${selectedEventIds.length} event${
                        selectedEventIds.length > 1 ? "s" : ""
                      } selected`
                    : "All Events"}
                </span>
                <svg
                  className="w-4 h-4 text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </button>

              {showEventDropdown && (
                <div className="absolute z-20 mt-1 w-full bg-black border border-gray-700 rounded-md max-h-48 overflow-y-auto shadow-lg">
                  {events.length === 0 && (
                    <div className="px-3 py-2 text-sm text-gray-400">
                      No events available
                    </div>
                  )}
                  {events.map((event) => (
                    <label
                      key={event.id}
                      className="flex items-center gap-2 px-3 py-2 hover:bg-gray-800 cursor-pointer text-sm"
                    >
                      <input
                        type="checkbox"
                        checked={selectedEventIds.includes(event.id)}
                        onChange={(e) => {
                          setSelectedEventIds((prev) =>
                            e.target.checked
                              ? [...prev, event.id]
                              : prev.filter((id) => id !== event.id)
                          );
                        }}
                        className="rounded border-gray-600"
                      />
                      <span className="text-white">{event.name}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Order Filter Placeholder - Only for Food Tab */}
          {activeTab === "food" && (
            <div>
              <label className="text-sm text-gray-400 mb-2 block">Order Filter</label>
              <select
                className="w-full px-3 py-2 bg-black border border-gray-700 rounded-md text-sm focus:outline-none focus:border-gray-600 appearance-none"
              >
                <option>All Orders</option>
              </select>
            </div>
          )}

          {/* Search */}
          <div>
            <label className="flex items-center gap-2 text-sm text-gray-400 mb-2">
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <circle cx="11" cy="11" r="8" />
                <path d="m21 21-4.35-4.35" />
              </svg>
              Search
            </label>
            <input
              type="text"
              placeholder="Search by User ID / Name"
              value={searchName}
              onChange={(e) => setSearchName(e.target.value)}
              className="w-full px-3 py-2 bg-black border border-gray-700 rounded-md text-sm focus:outline-none focus:border-gray-600"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex items-end gap-2">
            <button
              onClick={fetchTransactions}
              className="px-4 py-2 bg-pink-500 rounded-md text-sm font-medium hover:bg-pink-400 whitespace-nowrap"
            >
              Apply Filters
            </button>
            <button
              onClick={() => {
                setFromDate("");
                setToDate("");
                setSearchName("");
                setSelectedEventIds([]);
                fetchTransactions();
              }}
              className="px-4 py-2 border border-gray-700 rounded-md text-sm hover:bg-gray-900 whitespace-nowrap"
            >
              Reset
            </button>
          </div>
        </div>
      </div>

      {/* TABS */}
      <div className="flex justify-between items-center">
        <div className="flex gap-3">
          <Tab
            label="🎉 Event Bookings"
            active={activeTab === "event"}
            onClick={() => setActiveTab("event")}
          />
          <Tab
            label="🍸 Food & Drinks Orders"
            active={activeTab === "food"}
            onClick={() => setActiveTab("food")}
          />
        </div>

        <button
          onClick={exportPDF}
          className="flex items-center gap-2 px-4 py-2 border border-gray-700 rounded-md text-sm hover:bg-gray-900"
        >
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="7 10 12 15 17 10" />
            <line x1="12" y1="15" x2="12" y2="3" />
          </svg>
          Export PDF
        </button>
      </div>

      {/* TABLE */}
      <div className="bg-[#111] border border-gray-800 rounded-lg overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-800">
          <h2 className="text-base font-semibold">
            {activeTab === "event"
              ? "Event Bookings Transactions"
              : "Food & Drinks Transactions"}
          </h2>
        </div>

        <div className="overflow-y-auto" style={{ maxHeight: "240px" }}>
          <table className="w-full text-xs">
             <thead className="text-gray-400 border-b border-gray-800">
              <tr>
                <th className="px-4 py-2 text-left font-normal">
                  <div className="flex items-center gap-1.5">
                    <span className="text-yellow-500">👤</span>
                    Name
                  </div>
                </th>
                <th className="px-4 py-2 text-center font-normal">
                  <div className="flex items-center justify-center gap-1.5">
                    <span className="text-purple-500">🆔</span>
                    User ID
                  </div>
                </th>
                <th className="px-4 py-2 text-center font-normal">
                  <div className="flex items-center justify-center gap-1.5">
                    <span className="text-blue-500">📅</span>
                    Date
                  </div>
                </th>
                {activeTab === "event" && (
                  <th className="px-4 py-2 text-center font-normal">
                    <div className="flex items-center justify-center gap-1.5">
                      <span className="text-orange-500">🎉</span>
                      Event
                    </div>
                  </th>
                )}
                <th className="px-4 py-2 text-center font-normal">
                  <div className="flex items-center justify-center gap-1.5">
                    <span className="text-green-500">💵</span>
                    Amount (₹)
                  </div>
                </th>
                <th className="px-4 py-2 text-center font-normal">
                  <div className="flex items-center justify-center gap-1.5">
                    <span className="text-gray-500">🧾</span>
                    Transaction ID
                  </div>
                </th>
                <th className="px-4 py-2 text-center font-normal">
                  <div className="flex items-center justify-center gap-1.5">
                    <span className="text-pink-500">🔘</span>
                    Status
                  </div>
                </th>
              </tr>
            </thead>

            <tbody>
              {transactions.length === 0 && (
                <tr>
                  <td
                    colSpan={activeTab === "event" ? 7 : 6}
                    className="px-4 py-6 text-center text-gray-400 text-xs"
                  >
                    No transactions found
                  </td>
                </tr>
              )}
              {transactions.map((t) => (
                <tr
                  key={`${t.user_id}-${t.created_at ?? ""}`}
                  className="border-t border-gray-800 hover:bg-gray-900/30"
                >
                  <td className="px-4 py-4 text-white">{t.users?.name ?? "—"}</td>
                  <td className="px-4 py-4 text-center text-gray-400">
                    {t.user_id}
                  </td>
                  <td className="px-4 py-4 text-center text-white">
                    {new Date(t.created_at).toLocaleString()}
                  </td>
                  {activeTab === "event" && (
                    <td className="px-4 py-4 text-center text-white">{t.event_name ?? "-"}</td>
                  )}
                  <td className="px-4 py-4 text-center font-semibold text-white">
                    ₹{t.amount.toLocaleString("en-IN")}
                  </td>
                  <td className="px-4 py-4 text-center text-gray-400">{t.id}</td>
                  <td className="px-4 py-4 text-center">
                    <StatusBadge status={t.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* SUMMARY CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <SummaryCard
          title="Total Claimed"
          value={summary.totalClaimed}
          color="green"
          description="Already transferred to your account"
        />
        <SummaryCard
          title="Total Pending"
          value={summary.totalPending}
          color="pink"
          description="Available for claim"
          showButton={!summary.payoutInProcess}
          onButtonClick={openPanModal}
        />
        <SummaryCard
          title="Total Refunded"
          value={summary.totalRefunded}
          color="yellow"
          description="Refunded to customers"
        />
      </div>

      {/* CLAIM HISTORY */}
      <div className="bg-[#111] border border-gray-800 rounded-lg p-6">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h2 className="text-lg font-semibold">Claim History</h2>
            <p className="text-sm text-gray-400">
              View your previous payout claims and their status
            </p>
          </div>
          <button
            onClick={() => {
              if (!showClaimHistory) fetchClaimHistory();
              setShowClaimHistory(!showClaimHistory);
            }}
            className="px-4 py-2 border border-gray-700 rounded-md text-sm hover:bg-gray-900"
          >
            {showClaimHistory ? "Hide" : "View Claim History"}
          </button>
        </div>

        {showClaimHistory && (
          <>
            {historyLoading && (
              <div className="flex items-center gap-3 py-2">
                <div className="relative w-4 h-4">
                  <div className="absolute inset-0 rounded-full border-2 border-gray-800" />
                  <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-pink-500 animate-spin" />
                </div>
                <p className="text-sm text-gray-400 animate-pulse">Loading claim history...</p>
              </div>
            )}

            {!historyLoading && payoutHistory.length === 0 && (
              <p className="text-sm text-gray-400">No payout requests yet</p>
            )}

            {!historyLoading && payoutHistory.length > 0 && (
              <div className="overflow-y-auto" style={{ maxHeight: "180px" }}>
                <table className="w-full text-xs">
                  <thead className="sticky top-0 bg-[#0f0f0f] z-10 text-gray-400 text-[11px]">
                    <tr>
                      <th className="px-3 py-2 text-left font-normal">Requested At</th>
                      <th className="px-3 py-2 text-center font-normal">Amount</th>
                      <th className="px-3 py-2 text-center font-normal">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {payoutHistory.map((p) => (
                      <tr key={p.id} className="border-t border-gray-800">
                        <td className="px-3 py-3.5 text-white">
                          {new Date(p.requested_at).toLocaleString()}
                        </td>
                        <td className="px-3 py-3.5 text-center font-semibold text-white">
                          ₹{p.amount.toLocaleString("en-IN")}
                        </td>
                        <td className="px-3 py-3.5 text-center">
                          <StatusBadge status={p.status} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </div>

      {/* TAX INFORMATION */}
      <div className="bg-[#111] border border-gray-800 rounded-lg p-4">
        <div className="flex gap-3">
          <div className="shrink-0">
            <div className="w-6 h-6 rounded-full border border-pink-500 flex items-center justify-center">
              <span className="text-pink-500 text-sm">ⓘ</span>
            </div>
          </div>
          <div>
            <h3 className="font-semibold mb-1">Tax & GST Information</h3>
            <p className="text-sm text-gray-400">
              All amounts shown are inclusive of applicable taxes and GST. Detailed
              tax breakdowns are available in your monthly statements. For tax-related
              queries, please contact our support team.
            </p>
          </div>
        </div>
      </div>

      {/* PAN MODAL */}
      {showPanModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
          <div className="bg-[#0f0f0f] border border-gray-800 rounded-lg p-6 w-full max-w-md">
            <h2 className="text-lg font-semibold mb-1">Confirm PAN Number</h2>
            <p className="text-sm text-gray-400 mb-4">
              This PAN will be used for payout processing
            </p>

            <input
              value={panNo}
              onChange={(e) => setPanNo(e.target.value.toUpperCase())}
              maxLength={10}
              className="w-full px-3 py-2 bg-black border border-gray-700 rounded-md"
              placeholder="Enter PAN (10 characters)"
            />

            {panError && <p className="text-sm text-red-400 mt-2">{panError}</p>}

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setShowPanModal(false)}
                className="px-4 py-2 border border-gray-700 rounded-md"
              >
                Cancel
              </button>
              <button
                disabled={panSaving}
                onClick={confirmPanAndClaim}
                className="px-4 py-2 bg-pink-500 rounded-md disabled:opacity-50"
              >
                Confirm & Proceed
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ================= COMPONENTS ================= */

function SummaryCard({
  title,
  value,
  color,
  description,
  showButton,
  onButtonClick,
}: {
  title: string;
  value: number;
  color: "green" | "pink" | "yellow";
  description: string;
  showButton?: boolean;
  onButtonClick?: () => void;
}) {
  const colorMap = {
    green: "text-green-400",
    pink: "text-pink-400",
    yellow: "text-yellow-400",
  };

  return (
    <div className="bg-[#0f0f0f] border border-gray-800 rounded-lg p-6">
      <p className="text-sm text-gray-400 mb-2">{title}</p>
      <p className={`text-4xl font-bold mb-1 ${colorMap[color]}`}>
        ₹{(value ?? 0).toLocaleString("en-IN")}
      </p>
      <p className="text-xs text-gray-500 mb-4">{description}</p>
      {showButton && (
        <button
          onClick={onButtonClick}
          className="w-full py-2 bg-pink-500 rounded-md text-sm font-medium hover:bg-pink-400"
        >
          Claim Payout
        </button>
      )}
    </div>
  );
}

function Tab({ label, active, onClick }: any) {
  return (
    <button
      onClick={onClick}
      className={`px-5 py-2 rounded-full text-sm font-medium ${
        active ? "bg-pink-500" : "bg-[#1a1a1a] text-gray-400 hover:bg-[#252525]"
      }`}
    >
      {label}
    </button>
  );
}

function StatusBadge({ status }: { status?: string }) {
  if (!status) {
    return (
      <span className="inline-block px-3 py-0.5 rounded-full text-[10px] font-bold bg-gray-600 text-white uppercase">
        N/A
      </span>
    );
  }

  const statusLower = status.toLowerCase();
  
  // Map statuses to Figma design
  const getStatusStyle = () => {
    switch (statusLower) {
      case "success":
      case "paid":
        return "bg-green-500 text-white";
      case "refunded":
        return "bg-yellow-500 text-black";
      case "failed":
        return "bg-red-500 text-white";
      case "pending":
        return "bg-blue-500 text-white";
      case "processing":
        return "bg-yellow-500 text-black";
      default:
        return "bg-gray-600 text-white";
    }
  };

  return (
    <span
      className={`inline-block px-3 py-0.5 rounded-full text-[10px] font-bold uppercase ${getStatusStyle()}`}
    >
      {status.toUpperCase()}
    </span>
  );
}