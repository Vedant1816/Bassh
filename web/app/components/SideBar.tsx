"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { useRouter } from "next/navigation";
import supabasePublic from "@/app/services/supabase-public";

export default function Sidebar() {
  const router = useRouter();

  const handleLogout = async () => {
    await supabasePublic.auth.signOut();
    router.replace("/auth/login");
  };

  return (
    <aside className="fixed left-0 top-0 h-screen w-64 bg-black border-r border-white/10 flex flex-col z-50">

      {/* TOP */}
      <div className="p-6">
        <h1 className="text-xl font-bold text-pink-500">
          BASSH
        </h1>
      </div>

      {/* NAV (NOT SCROLLABLE) */}
      <nav className="px-4 space-y-1 text-sm">
        <NavItem label="Overview" href="/dashboard"/>
        <NavItem label="Menu Management" href="/dashboard/menu"/>
        <NavItem label="Discounts & Offers" href="/dashboard/discount"/>
        <NavItem label="Event Management" href="/dashboard/events" />
        <NavItem label="Guest List" href="/dashboard/guest"/>
        <NavItem label="Billing & Receipts" href="/dashboard/billing"/>
        <NavItem label="Settings" href="/dashboard/settings"/>
      </nav>

      {/* PUSH LOGOUT TO BOTTOM */}
      <div className="mt-auto border-t border-white/10 p-4">
        <button
          onClick={handleLogout}
          className="text-sm text-gray-400 hover:text-red-400"
        >
          Log Out
        </button>
      </div>
    </aside>
  );
}

function NavItem({
  label,
  href,
}: {
  label: string,
  href?: string,
}) {
  const pathName = usePathname();
  var isActive = false;
  if(href && href === "/dashboard"){
     isActive = href === pathName ? true : false;
  }
  else{
     isActive = href ? pathName.startsWith(href) : false;
  }  

  const className = `block px-3 py-2 rounded-md ${
    isActive
      ? "bg-pink-600 text-white"
      : "text-gray-400 hover:text-white hover:bg-white/5"
  }`;
  if (href) {
    return (
      <Link href={href} className={className}>
        {label}
      </Link>
    );
  }

  return <div className={className}>{label}</div>;
}