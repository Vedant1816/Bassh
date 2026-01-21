import "./globals.css";
import Sidebar from "@/app/components/SideBar";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-black text-white">
        <Sidebar />

        {/* MAIN CONTENT SCROLLS */}
        <main className="ml-64 min-h-screen bg-black overflow-y-auto">
          {children}
        </main>
      </body>
    </html>
  );
}
