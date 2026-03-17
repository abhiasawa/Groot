import Sidebar from "@/components/garden/sidebar";
import BottomNav from "@/components/garden/bottom-nav";
import Prefetcher from "@/components/garden/prefetcher";

export const metadata = {
  title: "Noto",
  description: "Your AI companion dashboard",
};

export default function GardenLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Sidebar />
      <main className="md:pl-64 pb-20 md:pb-0 min-h-screen">
        <div className="mx-auto max-w-5xl px-4 py-6 md:px-8 md:py-8">{children}</div>
      </main>
      <BottomNav />
      <Prefetcher />
    </div>
  );
}
