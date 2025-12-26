import type { ReactNode } from "react";

import { AppSidebar } from "@/components/layout/Sidebar";
import { Topbar } from "@/components/layout/Topbar";

import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset className="min-h-screen bg-background text-foreground">
        <Topbar />
        <main className="p-4">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  );
}
