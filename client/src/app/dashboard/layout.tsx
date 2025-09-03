import { AppSidebar } from "@/components/dashboard/app-sidebar";
import { Header } from "@/components/dashboard/app-header";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { getNavigationLinks } from "@/config/sidebar";

export default function Layout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const role = "admin";
  const navItems = getNavigationLinks(role);

  return (
    <main>
      <SidebarProvider>
        <AppSidebar navItems={navItems} />
        <SidebarInset>
          <Header navItems={navItems} />
          <section>{children}</section>
        </SidebarInset>
      </SidebarProvider>
    </main>
  );
}
