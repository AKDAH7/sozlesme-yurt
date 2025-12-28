"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import {
  BarChart3,
  Building2,
  FileText,
  LayoutDashboard,
  PenSquare,
  ScrollText,
} from "lucide-react";

import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { Button } from "@/components/ui/Button";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarSeparator,
} from "@/components/ui/sidebar";
import { isRtl, type Locale } from "@/lib/i18n/locales";

const navItems = [
  { href: "/", labelKey: "dashboard", icon: LayoutDashboard },
  { href: "/documents", labelKey: "documents", icon: ScrollText },
  { href: "/documents/new", labelKey: "newDocument", icon: PenSquare },
  { href: "/reports", labelKey: "reports", icon: BarChart3 },
  { href: "/templates", labelKey: "templates", icon: FileText },
  { href: "/companies", labelKey: "companies", icon: Building2 },
] as const;

export function AppSidebar() {
  const pathname = usePathname();
  const tApp = useTranslations("app");
  const tNav = useTranslations("nav");
  const tActions = useTranslations("actions");
  const locale = useLocale() as Locale;
  const rtl = isRtl(locale);

  const [role, setRole] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const res = await fetch("/api/auth/me", { cache: "no-store" }).catch(
        () => null
      );
      if (!res || cancelled) return;
      const data = (await res.json().catch(() => null)) as
        | { ok: true; user: { role: string } | null }
        | { ok: false }
        | null;

      if (cancelled) return;
      if (data && "ok" in data && data.ok === true) {
        setRole(data.user?.role ?? null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const visibleNavItems = useMemo(() => {
    // Company users can create documents and view scoped reports, but cannot
    // manage templates/companies.
    if (role === "company") {
      return navItems.filter(
        (i) => i.href !== "/templates" && i.href !== "/companies"
      );
    }
    return navItems;
  }, [role]);

  return (
    <Sidebar side={rtl ? "right" : "left"}>
      <SidebarHeader>
        <div
          className={
            rtl
              ? "flex items-start justify-between gap-3 px-2 py-1 flex-row-reverse"
              : "flex items-start justify-between gap-3 px-2 py-1"
          }
        >
          <div className="min-w-0">
            <div className="truncate text-sm font-semibold tracking-tight">
              {tApp("controlPanel")}
            </div>
            <div className="truncate text-xs text-muted-foreground">
              {tApp("documentIssuance")}
            </div>
          </div>
          <ThemeToggle />
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>{tNav("navigation")}</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {visibleNavItems.map((item) => {
                const isActive =
                  item.href === "/"
                    ? pathname === "/"
                    : pathname === item.href ||
                      pathname.startsWith(`${item.href}/`);

                return (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton asChild isActive={isActive}>
                      <Link href={item.href}>
                        <item.icon className="size-4" />
                        <span>{tNav(item.labelKey)}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <SidebarSeparator />
        <div className="p-2">
          <Button asChild variant="secondary" className="w-full">
            <Link href="/logout">{tActions("logout")}</Link>
          </Button>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
