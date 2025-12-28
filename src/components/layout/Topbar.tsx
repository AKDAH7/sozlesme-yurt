"use client";

import Link from "next/link";
import { useTranslations, useLocale } from "next-intl";

import { Button } from "@/components/ui/Button";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { LanguageSwitcher } from "@/components/layout/LanguageSwitcher";
import { NotificationsMenu } from "@/components/layout/NotificationsMenu";
import { isRtl, type Locale } from "@/lib/i18n/locales";

export function Topbar() {
  const tApp = useTranslations("app");
  const tActions = useTranslations("actions");
  const locale = useLocale() as Locale;
  const rtl = isRtl(locale);

  return (
    <header className="flex h-14 items-center justify-between border-b border-border bg-background px-4">
      <div className="flex items-center gap-2">
        <SidebarTrigger className="-ml-1" />
        <div className="text-sm font-medium text-foreground">
          {tApp("controlPanel")}
        </div>
      </div>

      <div
        className={
          rtl
            ? "flex items-center gap-2 flex-row-reverse"
            : "flex items-center gap-2"
        }
      >
        <LanguageSwitcher />
        <NotificationsMenu />
        <Button asChild variant="secondary" size="sm">
          <Link href="/documents/new">{tActions("newDocument")}</Link>
        </Button>
        <Button asChild variant="ghost" size="sm">
          <Link href="/logout">{tActions("logout")}</Link>
        </Button>
      </div>
    </header>
  );
}
