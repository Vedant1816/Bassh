"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import supabasePublic from "@/app/services/supabase-public";
import { withAuthHeaders } from "@/app/services/auth-fetch";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

/* ================= TYPES ================= */

type RevenueDay = {
  date: string;
  revenue: number;
};

type RevenueResponse = {
  revenueToday?: number;
  revenueChange?: number;
  revenueTrend?: RevenueDay[];
};

type BookingSummary = {
  bookingsToday?: number;
  bookingsChange?: number;
};

type ActiveDiscountsResponse = {
  activeDiscounts?: number;
};

type UpcomingEvent = {
  id: string;
  name: string;
  dj_name: string;
  event_date: string;
  start_time: string | null;
};

type UpcomingEventsResponse = {
  totalUpcomingEvents?: number;
  topEvents?: UpcomingEvent[];
};

/* ================= PAGE ================= */

export default function HomePage() {
  const router = useRouter();

  const [checkingAuth, setCheckingAuth] = useState(true);

  const [revenue, setRevenue] = useState<RevenueResponse | null>(null);
  const [bookings, setBookings] = useState<BookingSummary | null>(null);
  const [discounts, setDiscounts] = useState<ActiveDiscountsResponse | null>(null);
  const [events, setEvents] = useState<UpcomingEventsResponse | null>(null);

  const [loadingRevenue, setLoadingRevenue] = useState(true);
  const [loadingBookings, setLoadingBookings] = useState(true);
  const [loadingDiscounts, setLoadingDiscounts] = useState(true);
  const [loadingEvents, setLoadingEvents] = useState(true);

  /* 🔐 AUTH CHECK */
  useEffect(() => {
    const checkAuth = async () => {
      const { data } = await supabasePublic.auth.getSession();
      if (!data.session) {
        router.replace("/auth/login");
      } else {
        setCheckingAuth(false);
      }
    };
    checkAuth();
  }, [router]);

  /* 💰 FETCH REVENUE */
  useEffect(() => {
    if (checkingAuth) return;

    const fetchRevenue = async () => {
      const options = await withAuthHeaders({ method: "GET" });
      const res = await fetch("/api/club/revenue", options);
      setRevenue(await res.json());
      setLoadingRevenue(false);
    };

    fetchRevenue();
  }, [checkingAuth]);

  /* 📅 FETCH BOOKINGS */
  useEffect(() => {
    if (checkingAuth) return;

    const fetchBookings = async () => {
      const options = await withAuthHeaders({ method: "GET" });
      const res = await fetch("/api/club/bookings", options);
      setBookings(await res.json());
      setLoadingBookings(false);
    };

    fetchBookings();
  }, [checkingAuth]);

  /* 🎟 FETCH ACTIVE DISCOUNTS */
  useEffect(() => {
    if (checkingAuth) return;

    const fetchDiscounts = async () => {
      const options = await withAuthHeaders({ method: "GET" });
      const res = await fetch("/api/club/discounts", options);
      setDiscounts(await res.json());
      setLoadingDiscounts(false);
    };

    fetchDiscounts();
  }, [checkingAuth]);

  /* 🎉 FETCH UPCOMING EVENTS */
  useEffect(() => {
    if (checkingAuth) return;

    const fetchEvents = async () => {
      const options = await withAuthHeaders({ method: "GET" });
      const res = await fetch("/api/club/events/upcoming", options);
      setEvents(await res.json());
      setLoadingEvents(false);
    };

    fetchEvents();
  }, [checkingAuth]);

  /* ⏳ LOADING */
  if (
    checkingAuth ||
    loadingRevenue ||
    loadingBookings ||
    loadingDiscounts ||
    loadingEvents
  ) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <div className="relative w-12 h-12">
          <div className="absolute inset-0 rounded-full border-4 border-gray-800" />
          <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-pink-500 animate-spin" />
        </div>
        <p className="text-sm text-gray-500 animate-pulse">Loading dashboard...</p>
      </div>
    );
  }

  if (!revenue || !bookings || !discounts || !events) {
    return (
      <div className="flex-1 flex items-center justify-center text-red-400">
        Failed to load dashboard
      </div>
    );
  }

  /* ================= SAFE VALUES ================= */

  const revenueToday = revenue.revenueToday ?? 0;
  const revenueChange = revenue.revenueChange ?? 0;
  const revenueTrend = revenue.revenueTrend ?? [];

  const bookingsToday = bookings.bookingsToday ?? 0;
  const bookingsChange = bookings.bookingsChange ?? 0;

  const activeDiscounts = discounts.activeDiscounts ?? 0;

  const upcomingEventsCount = events.totalUpcomingEvents ?? 0;
  const topEvents = events.topEvents ?? [];

  const todayStr = new Date().toISOString().slice(0, 10);

  const getEventStatus = (eventDate: string) =>
    eventDate === todayStr ? "Live" : "Upcoming";

  return (
    <div className="p-8 space-y-8 text-white bg-black min-h-screen">
      <h1 className="text-2xl font-semibold">Dashboard Overview</h1>

      {/* ===== STATS ===== */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <StatCard
          title="Revenue Today"
          value={`₹${revenueToday.toLocaleString("en-IN")}`}
          change={revenueChange}
          icon="rupee"
        />

        <StatCard
          title="Current Bookings"
          value={bookingsToday.toString()}
          change={bookingsChange}
          icon="calendar"
        />

        <StatCard
          title="Active Discounts"
          value={activeDiscounts.toString()}
          icon="tag"
        />

        <StatCard
          title="Upcoming Events"
          value={upcomingEventsCount.toString()}
          icon="calendar-event"
        />
      </div>

      {/* ===== REVENUE TRENDS ===== */}
      <div className="rounded-lg bg-[#0f0f0f] border border-gray-800 p-6">
        <h2 className="text-xl font-semibold mb-1">Revenue Trends</h2>
        <p className="text-sm text-gray-400 mb-6">
          Last 7 days revenue overview
        </p>

        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={revenueTrend}>
              <XAxis
                dataKey="date"
                tickFormatter={(d) =>
                  new Date(d).toLocaleDateString("en-US", { weekday: "short" })
                }
                stroke="#666"
                style={{ fontSize: "12px" }}
              />
              <YAxis
                stroke="#666"
                tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`}
                style={{ fontSize: "12px" }}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#1a1a1a",
                  border: "1px solid #333",
                  borderRadius: "8px",
                  color: "#fff",
                }}
                formatter={(v) => {
                  const val = typeof v === "number" ? v : 0;
                  return [`₹${val.toLocaleString("en-IN")}`, "Revenue"];
                }}
              />
              <Line
                type="monotone"
                dataKey="revenue"
                stroke="#ec4899"
                strokeWidth={3}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* ===== UPCOMING EVENTS ===== */}
      <div className="rounded-lg bg-[#0f0f0f] border border-gray-800 p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold">Upcoming Events</h2>
          <span
            className="text-sm text-pink-500 cursor-pointer hover:text-pink-400 transition-colors"
            onClick={() => router.push("/dashboard/events/viewAll")}
          >
            View all
          </span>
        </div>

        {topEvents.length === 0 && (
          <p className="text-sm text-gray-400">No upcoming events</p>
        )}

        <div className="space-y-0">
          {topEvents.map((event) => (
            <EventItem
              key={event.id}
              title={event.name}
              time={`${getEventTimeString(event)} • DJ ${event.dj_name}`}
              status={getEventStatus(event.event_date)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

/* ================= HELPER FUNCTIONS ================= */

function getEventTimeString(event: UpcomingEvent): string {
  const date = new Date(event.event_date);
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const dateStr = date.toISOString().slice(0, 10);
  const todayStr = today.toISOString().slice(0, 10);
  const tomorrowStr = tomorrow.toISOString().slice(0, 10);

  let dayString = "";
  if (dateStr === todayStr) {
    dayString = "Tonight";
  } else if (dateStr === tomorrowStr) {
    dayString = "Tomorrow";
  } else {
    dayString = date.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
    });
  }

  const timeString = event.start_time
    ? event.start_time.slice(0, 5) + " PM"
    : "";

  return timeString ? `${dayString}, ${timeString}` : dayString;
}

/* ================= COMPONENTS ================= */

function StatCard({
  title,
  value,
  change,
  icon,
}: {
  title: string;
  value: string;
  change?: number;
  icon: "rupee" | "calendar" | "tag" | "calendar-event";
}) {
  const showChange = typeof change === "number" && change !== 0;

  return (
    <div className="rounded-lg bg-[#0f0f0f] border border-gray-800 p-5 relative">
      {/* Icon in top-right */}
      <div className="absolute top-4 right-4">
        <StatIcon type={icon} />
      </div>

      <p className="text-sm text-gray-400 mb-2">{title}</p>
      <p className="text-3xl font-semibold mb-1">{value}</p>
      {showChange && (
        <p
          className={`text-sm ${
            change! > 0 ? "text-green-400" : "text-red-400"
          }`}
        >
          {change! > 0 ? "+" : ""}
          {change!.toFixed(1)}% from last period
        </p>
      )}
    </div>
  );
}

function StatIcon({ type }: { type: string }) {
  const iconClass = "w-6 h-6 text-pink-500";

  switch (type) {
    case "rupee":
      return (
        <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      );
    case "calendar":
      return (
        <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
          />
        </svg>
      );
    case "tag":
      return (
        <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"
          />
        </svg>
      );
    case "calendar-event":
      return (
        <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
          />
        </svg>
      );
    default:
      return null;
  }
}

function EventItem({
  title,
  time,
  status,
}: {
  title: string;
  time: string;
  status: "Live" | "Upcoming";
}) {
  return (
    <div className="flex justify-between items-center py-4 border-b border-gray-800 last:border-none">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-md bg-pink-500/10 flex items-center justify-center shrink-0">
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
              d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
            />
          </svg>
        </div>
        <div>
          <p className="font-medium text-white">{title}</p>
          <p className="text-sm text-gray-400">{time}</p>
        </div>
      </div>

      <span
        className={`text-xs px-3 py-1.5 rounded-full font-medium ${
          status === "Live"
            ? "bg-green-500/20 text-green-400"
            : "bg-pink-500/20 text-pink-400"
        }`}
      >
        {status}
      </span>
    </div>
  );
}