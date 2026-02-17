import "@/styles/design-tokens.css";
import Sidebar from "@/components/garden/sidebar";
import BottomNav from "@/components/garden/bottom-nav";

export const metadata = {
  title: "The Garden — Groot Dashboard",
  description: "Your AI second brain dashboard",
};

export default function GardenLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div style={{ backgroundColor: "var(--color-bg)", color: "var(--color-text)", minHeight: "100vh" }}>
      <Sidebar />
      <main
        className="md:ml-[260px] pb-20 md:pb-0 min-h-screen"
        style={{ maxWidth: "100%" }}
      >
        <div className="p-4 md:p-8 max-w-6xl mx-auto">{children}</div>
      </main>
      <BottomNav />
    </div>
  );
}
