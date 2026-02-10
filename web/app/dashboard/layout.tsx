import Sidebar from "@/app/components/SideBar";
import TopBar from "@/app/components/TopBar";

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-black text-white">
      {/* Sidebar */}
      <Sidebar />

      {/* Top Bar */}
      <TopBar />

      {/* Page Content */}
      <main className="ml-64 pt-14">
        {children}
      </main>
    </div>
  );
}
