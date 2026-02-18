import Sidebar from "@/components/garden/sidebar";
import BottomNav from "@/components/garden/bottom-nav";
import Powerbar from "@/components/garden/powerbar";
import PointerEventsGuard from "@/components/garden/pointer-events-guard";

export const metadata = {
  title: "The Garden -- Groot Dashboard",
  description: "Your AI second brain dashboard",
};

export default function GardenLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="bg-background text-foreground min-h-screen">
      <Sidebar />
      <main className="md:ml-[240px] pb-20 md:pb-0 min-h-screen overflow-x-hidden">
        <div className="p-4 md:px-10 md:py-8 max-w-5xl mx-auto">{children}</div>
      </main>
      <BottomNav />
      <Powerbar />
      <PointerEventsGuard />
    </div>
  );
}
