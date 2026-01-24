import Sidebar from "@/app/components/SideBar";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <Sidebar />

      {/* MAIN CONTENT */}
      <main className="ml-64 min-h-screen bg-black overflow-y-auto">
        {children}
      </main>
    </>
  );
}
