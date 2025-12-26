import type { ReactNode } from "react";

import { AppShell } from "@/components/layout/AppShell";
import { requireUserIdOrRedirect } from "@/lib/auth/requireUserPage";

export default async function DashboardLayout({
  children,
}: {
  children: ReactNode;
}) {
  await requireUserIdOrRedirect();
  return <AppShell>{children}</AppShell>;
}
