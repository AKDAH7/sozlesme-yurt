"use client";

import * as React from "react";
import { Contrast } from "lucide-react";
import { useTheme } from "next-themes";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/Button";

export function ThemeToggle() {
  const t = useTranslations("theme");
  const { setTheme, theme, resolvedTheme } = useTheme();

  // next-themes resolves the real theme on the client.
  // Render a stable initial UI to avoid SSR/client hydration mismatches.
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => setMounted(true), []);

  const effectiveTheme = mounted ? resolvedTheme ?? theme : null;
  const isDark = effectiveTheme === "dark";
  const ariaLabel = mounted
    ? isDark
      ? t("switchToLight")
      : t("switchToDark")
    : t("switchToDark");

  return (
    <Button
      type="button"
      variant="outline"
      size="icon"
      className="rounded-full"
      onClick={() => setTheme(isDark ? "light" : "dark")}
      aria-label={ariaLabel}
      aria-pressed={mounted ? isDark : false}
      disabled={!mounted}
    >
      <Contrast className="h-4 w-4" />
    </Button>
  );
}
