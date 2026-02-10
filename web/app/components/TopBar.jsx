"use client";

import Link from "next/link";
import { Bell, User } from "lucide-react";

export default function TopBar() {
  return (
    <header className="fixed top-0 left-64 right-0 h-14 bg-black border-b border-white/10 flex items-center justify-between px-6 z-40">
      {/* LEFT */}
      <div className="text-pink-500 font-semibold text-lg">
      </div>

      {/* RIGHT */}
      <div className="flex items-center gap-4">
        {/* NOTIFICATION BELL WITH BADGE */}
        <button className="relative text-gray-400 hover:text-white transition-colors">
          <Bell size={20} strokeWidth={2} />
          {/* <span className="absolute -top-1 -right-1 w-4 h-4 bg-pink-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
            
          </span> */}
        </button>

        {/* PROFILE ICON */}
        <Link href="/dashboard/settings">
  <button className="w-9 h-9 rounded-full bg-white flex items-center justify-center hover:bg-gray-200 transition-colors">
    <User size={20} strokeWidth={2} className="text-gray-800" />
  </button>
</Link>
      </div>
    </header>
  );
}