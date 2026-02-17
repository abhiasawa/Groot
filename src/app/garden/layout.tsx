import "@/styles/design-tokens.css";
import { redirect } from "next/navigation";
import Sidebar from "@/components/garden/sidebar";
import BottomNav from "@/components/garden/bottom-nav";
import { getAuthenticatedPortalUser, PortalAuthError } from "@/lib/auth/portal-user";

export const metadata = {
  title: "The Garden — Groot Dashboard",
  description: "Your AI second brain dashboard",
};

export default async function GardenLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  try {
    await getAuthenticatedPortalUser();
  } catch (error) {
    // Any auth failure (PortalAuthError or unexpected) → redirect to login
    // Next.js redirect() throws internally, so re-throw those
    if (error && typeof error === "object" && "digest" in error) {
      throw error; // Next.js internal redirect/notFound — let framework handle
    }
    redirect("/login?next=/garden");
  }

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
