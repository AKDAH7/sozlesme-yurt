"use client";

import * as React from "react";
import Link from "next/link";
import { Bell } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";

import { Button } from "@/components/ui/Button";
import { isLocale, isRtl } from "@/lib/i18n/locales";

type NotificationItem = {
  id: string;
  title: string;
  message: string | null;
  href: string | null;
  created_at: string;
  read_at: string | null;
};

export function NotificationsMenu() {
  const locale = useLocale();
  const rtl = isLocale(locale) ? isRtl(locale) : false;

  const tMenu = useTranslations("notifications.menu");
  const tErrors = useTranslations("notifications.errors");
  const tItems = useTranslations("notifications.items");

  const [open, setOpen] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [items, setItems] = React.useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = React.useState<number>(0);

  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => setMounted(true), []);

  const panelRef = React.useRef<HTMLDivElement | null>(null);

  async function load() {
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/notifications?limit=20", {
        cache: "no-store",
      });
      const json = (await res.json().catch(() => null)) as
        | {
            ok: true;
            notifications: NotificationItem[];
            unreadCount: number;
          }
        | { ok: false; error?: string }
        | null;

      if (!res.ok || !json || json.ok !== true) {
        const msg = json && "error" in json ? json.error ?? "" : "";
        throw new Error(msg || "loadFailed");
      }

      setItems(json.notifications);
      setUnreadCount(json.unreadCount);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "";
      if (msg === "loadFailed") {
        setError(tErrors("loadFailed"));
      } else {
        setError(msg || tErrors("loadFailed"));
      }
    } finally {
      setLoading(false);
    }
  }

  function tryParseJson(value: string | null): Record<string, unknown> | null {
    if (!value) return null;
    if (!value.trim().startsWith("{")) return null;
    try {
      const parsed = JSON.parse(value) as unknown;
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        return parsed as Record<string, unknown>;
      }
    } catch {
      // ignore
    }
    return null;
  }

  function toTranslationValues(
    input: Record<string, unknown>
  ): Record<string, string | number> {
    const out: Record<string, string | number> = {};
    for (const [key, value] of Object.entries(input)) {
      if (typeof value === "string" || typeof value === "number") {
        out[key] = value;
      }
    }
    return out;
  }

  function renderNotificationText(n: NotificationItem): {
    title: string;
    message: string | null;
  } {
    if (n.title.startsWith("kind:")) {
      const kind = n.title.slice("kind:".length).trim();
      const paramsRaw = tryParseJson(n.message) ?? {};
      const params = toTranslationValues(paramsRaw);

      const titleKey = `${kind}.title` as const;
      const messageKey = `${kind}.message` as const;

      try {
        return {
          title: tItems(titleKey, params),
          message: tItems(messageKey, params),
        };
      } catch {
        // If translations are missing, fall back to raw text.
      }
    }

    return { title: n.title, message: n.message };
  }

  async function markRead(id: string) {
    try {
      await fetch(`/api/notifications/${encodeURIComponent(id)}/read`, {
        method: "PATCH",
      });
      setItems((prev) =>
        prev.map((n) =>
          n.id === id ? { ...n, read_at: n.read_at ?? "now" } : n
        )
      );
      setUnreadCount((c) => Math.max(0, c - 1));
    } catch {
      // ignore
    }
  }

  React.useEffect(() => {
    if (!open) return;
    void load();
  }, [open]);

  React.useEffect(() => {
    function onDocMouseDown(e: MouseEvent) {
      if (!open) return;
      const el = panelRef.current;
      if (!el) return;
      const target = e.target as Node | null;
      if (target && !el.contains(target)) setOpen(false);
    }

    document.addEventListener("mousedown", onDocMouseDown);
    return () => document.removeEventListener("mousedown", onDocMouseDown);
  }, [open]);

  return (
    <div className="relative" ref={panelRef}>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        aria-label={tMenu("ariaLabel")}
        onClick={() => setOpen((v) => !v)}
      >
        <div className="relative">
          <Bell />
          {unreadCount > 0 ? (
            <span
              className={
                rtl
                  ? "absolute -left-1 -top-1 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-medium text-primary-foreground"
                  : "absolute -right-1 -top-1 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-medium text-primary-foreground"
              }
            >
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          ) : null}
        </div>
      </Button>

      {open ? (
        <div
          className={
            rtl
              ? "absolute left-0 z-50 mt-2 w-80 rounded-md border border-border bg-background p-2 shadow-sm"
              : "absolute right-0 z-50 mt-2 w-80 rounded-md border border-border bg-background p-2 shadow-sm"
          }
        >
          <div className="flex items-center justify-between px-2 py-1">
            <div className="text-sm font-medium">{tMenu("title")}</div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => void load()}
              disabled={loading}
            >
              {tMenu("refresh")}
            </Button>
          </div>

          {error ? (
            <div className="px-2 py-2 text-sm text-destructive">{error}</div>
          ) : null}

          {loading ? (
            <div className="px-2 py-2 text-sm text-muted-foreground">
              {tMenu("loading")}
            </div>
          ) : items.length === 0 ? (
            <div className="px-2 py-2 text-sm text-muted-foreground">
              {tMenu("empty")}
            </div>
          ) : (
            <div className="max-h-96 overflow-auto">
              {items.map((n) => {
                const rendered = renderNotificationText(n);
                const content = (
                  <div
                    className={
                      n.read_at
                        ? "rounded-md px-2 py-2 text-sm"
                        : "rounded-md px-2 py-2 text-sm bg-secondary"
                    }
                  >
                    <div className="font-medium text-foreground">
                      {rendered.title}
                    </div>
                    {rendered.message ? (
                      <div className="mt-0.5 text-xs text-muted-foreground">
                        {rendered.message}
                      </div>
                    ) : null}
                    <div
                      className="mt-1 text-[11px] text-muted-foreground"
                      suppressHydrationWarning
                    >
                      {mounted
                        ? new Date(n.created_at).toLocaleString()
                        : n.created_at}
                    </div>
                  </div>
                );

                return (
                  <div key={n.id} className="px-1 py-1">
                    {n.href ? (
                      <Link
                        href={n.href}
                        onClick={() => {
                          void markRead(n.id);
                          setOpen(false);
                        }}
                      >
                        {content}
                      </Link>
                    ) : (
                      <button
                        type="button"
                        className={
                          rtl ? "w-full text-right" : "w-full text-left"
                        }
                        onClick={() => void markRead(n.id)}
                      >
                        {content}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}
