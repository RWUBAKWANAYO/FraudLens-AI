"use client";
import { AppSidebar } from "@/components/dashboard/app-sidebar";
import { Header } from "@/components/dashboard/app-header";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { getNavigationLinks } from "@/config/sidebar";
import { useRequireAuth } from "@/hooks/useRequireAuth";
import { StatusMessage } from "@/components/common/status-message";

export default function Layout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const role = "admin";
  const navItems = getNavigationLinks(role);
  const { loading } = useRequireAuth();

  return (
    <main>
      <SidebarProvider>
        <AppSidebar navItems={navItems} />
        <SidebarInset>
          <Header navItems={navItems} />
          <section className="p-4 sm:p-6">
            {loading ? (
              <StatusMessage isLoading={loading} height="calc(100vh - 120px)" />
            ) : (
              children
            )}
          </section>
        </SidebarInset>
      </SidebarProvider>
    </main>
  );
}
