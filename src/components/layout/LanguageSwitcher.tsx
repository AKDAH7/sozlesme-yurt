"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";

import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";
import { locales, type Locale } from "@/lib/i18n/locales";

const LOCALE_COOKIE = "NEXT_LOCALE";
const LOCALE_STORAGE_KEY = "locale";

function setLocalePersistence(locale: Locale) {
  try {
    localStorage.setItem(LOCALE_STORAGE_KEY, locale);
  } catch {
    // ignore
  }

  // 1 year
  document.cookie = `${LOCALE_COOKIE}=${locale}; path=/; max-age=${
    60 * 60 * 24 * 365
  }`;

  // Update immediately for client-side perceived instant switch.
  document.documentElement.lang = locale;
  document.documentElement.dir = locale === "ar" ? "rtl" : "ltr";
}

export function LanguageSwitcher(props: { className?: string }) {
  const t = useTranslations("language");
  const activeLocale = useLocale() as Locale;
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function onChange(locale: Locale) {
    if (locale === activeLocale) return;
    setLocalePersistence(locale);

    startTransition(() => {
      // Re-render server components with the new cookie locale.
      router.refresh();
    });
  }

  return (
    <div
      className={cn(
        "inline-flex items-center gap-1 rounded-md border border-border bg-background p-1",
        props.className
      )}
      aria-label={t("label")}
    >
      {locales.map((locale) => {
        const isActive = locale === activeLocale;
        return (
          <Button
            key={locale}
            type="button"
            size="sm"
            variant={isActive ? "secondary" : "ghost"}
            onClick={() => onChange(locale)}
            disabled={isPending}
            className="h-7 px-2"
          >
            {t(locale)}
          </Button>
        );
      })}
    </div>
  );
}
