import Link from "next/link";

import { Button } from "@/components/ui/Button";
import { SidebarTrigger } from "@/components/ui/sidebar";

export function Topbar() {
  return (
    <header className="flex h-14 items-center justify-between border-b border-border bg-background px-4">
      <div className="flex items-center gap-2">
        <SidebarTrigger className="-ml-1" />
        <div className="text-sm font-medium text-foreground">Control Panel</div>
      </div>

      <div className="flex items-center gap-2">
        <Button asChild variant="secondary" size="sm">
          <Link href="/documents/new">New document</Link>
        </Button>
        <Button asChild variant="ghost" size="sm">
          <Link href="/logout">Logout</Link>
        </Button>
      </div>
    </header>
  );
}
