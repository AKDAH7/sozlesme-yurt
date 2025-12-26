"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function LogoutPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function run() {
      try {
        const res = await fetch("/api/auth/logout", {
          method: "POST",
          headers: { "content-type": "application/json" },
        });

        if (!res.ok) {
          const data = (await res.json().catch(() => null)) as {
            error?: string;
          } | null;
          throw new Error(data?.error ?? "Logout failed");
        }

        if (!cancelled) {
          router.replace("/login");
          router.refresh();
        }
      } catch (e) {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : "Logout failed");
      }
    }

    void run();
    return () => {
      cancelled = true;
    };
  }, [router]);

  if (error) {
    return <main style={{ padding: 24 }}>Logout error: {error}</main>;
  }

  return <main style={{ padding: 24 }}>Logging out…</main>;
}
