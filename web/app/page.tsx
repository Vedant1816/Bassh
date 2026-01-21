"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import supabasePublic from "@/app/services/supabase-public";

export default function HomePage() {
  const router = useRouter();
  const [checkingAuth, setCheckingAuth] = useState(true);

  /* 🔐 AUTH CHECK */
  useEffect(() => {
    const checkAuth = async () => {
      const {
        data: { session },
      } = await supabasePublic.auth.getSession();

      if (!session) {
        router.replace("/login");
      } else {
        setCheckingAuth(false);
      }
    };

    checkAuth();
  }, [router]);

  /* ⏳ LOADING */
  if (checkingAuth) {
    return (
      <div className="flex-1 flex items-center justify-center text-gray-400">
        Checking authentication…
      </div>
    );
  }

  return (
    <div className="p-8 space-y-8 text-white bg-black">

      {/* ===== HEADER ===== */}
      <h1 className="text-2xl font-semibold">
        Dashboard Overview
      </h1>

      {/* ===== STATS ===== */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <StatCard
          title="Revenue Today"
          value="$4,289.00"
          sub="+12.5% from last period"
        />
        <StatCard
          title="Current Bookings"
          value="128"
          sub="+8.2% from last period"
        />
        <StatCard
          title="Active Discounts"
          value="5"
        />
        <StatCard
          title="Upcoming Events"
          value="3"
          sub="+1 from last period"
        />
      </div>

      {/* ===== REVENUE TRENDS ===== */}
      <div className="rounded-xl bg-[#0b0b0b] border border-white/10 p-6">
        <h2 className="font-medium mb-1">
          Revenue Trends
        </h2>
        <p className="text-sm text-gray-400 mb-6">
          Last 7 days revenue overview
        </p>

        {/* Chart placeholder */}
        <div className="h-72 flex items-center justify-center rounded-lg border border-dashed border-white/10 text-gray-500">
          Line chart will be placed here
        </div>
      </div>

      {/* ===== UPCOMING EVENTS ===== */}
      <div className="rounded-xl bg-[#0b0b0b] border border-white/10 p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="font-medium">
            Upcoming Events
          </h2>
          <span className="text-sm text-pink-500 cursor-pointer">
            View all
          </span>
        </div>

        <EventItem
          title="Neon Night"
          time="Tonight, 10:00 PM · DJ Electra"
          status="Live"
        />
        <EventItem
          title="Retro Vibes"
          time="Tomorrow, 8:00 PM · DJ Funk Master"
          status="Upcoming"
        />
        <EventItem
          title="Summer Bash"
          time="Sat, 9:00 PM · DJ Phoenix"
          status="Upcoming"
        />
      </div>
    </div>
  );
}

/* ================= COMPONENTS ================= */

function StatCard({
  title,
  value,
  sub,
}: {
  title: string;
  value: string;
  sub?: string;
}) {
  return (
    <div className="rounded-xl bg-[#0b0b0b] border border-white/10 p-5">
      <p className="text-sm text-gray-400">{title}</p>
      <p className="text-2xl font-semibold mt-2">{value}</p>
      {sub && (
        <p className="text-xs text-green-400 mt-1">
          {sub}
        </p>
      )}
    </div>
  );
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
    <div className="flex justify-between items-center py-4 border-b border-white/5 last:border-none">
      <div className="flex items-center gap-4">
        <div className="w-9 h-9 rounded-full bg-pink-500/20 flex items-center justify-center">
          🎵
        </div>
        <div>
          <p className="font-medium">{title}</p>
          <p className="text-sm text-gray-400">{time}</p>
        </div>
      </div>

      <span
        className={`text-xs px-3 py-1 rounded-full ${
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
