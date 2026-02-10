"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";

const tabs = [
  {
    label: "Club Information",
    href: "/dashboard/settings/club_info",
    icon: "info",
  },
  {
    label: "Operational Details",
    href: "/dashboard/settings/op_details",
    icon: "clock",
  },
  {
    label: "Visuals",
    href: "/dashboard/settings/visuals",
    icon: "image",
  },
  {
    label: "Legal & Policies",
    href: "/dashboard/settings/legals",
    icon: "file",
  },
  
];

const TabIcon = ({ icon, isActive }: { icon: string; isActive: boolean }) => {
  const className = clsx("w-5 h-5", isActive ? "text-pink-500" : "text-gray-400");

  switch (icon) {
    case "info":
      return (
        <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      );
    case "clock":
      return (
        <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      );
    case "image":
      return (
        <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
          />
        </svg>
      );
    case "file":
      return (
        <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
          />
        </svg>
      );
    default:
      return null;
  }
};

export default function SettingsTabs() {
  const pathname = usePathname();

  return (
    <div className="border-b border-gray-800 mb-8 bg-black px-8">
      <div className="flex gap-8">
        {tabs.map((tab) => {
          const isActive = pathname === tab.href;

          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={clsx(
                "relative flex items-center gap-2 pb-3 pt-4 text-sm font-medium transition-colors",
                isActive
                  ? "text-pink-500"
                  : "text-gray-400 hover:text-white"
              )}
            >
              <TabIcon icon={tab.icon} isActive={isActive} />
              {tab.label}

              {/* Active underline */}
              {isActive && (
                <span className="absolute -bottom-px left-0 h-0.5 w-full bg-pink-500" />
              )}
            </Link>
          );
        })}
      </div>
    </div>
  );
}