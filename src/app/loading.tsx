import { Download } from "lucide-react";

export default function Loading() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <Download className="h-8 w-8 animate-pulse text-muted-foreground" />
    </div>
  );
}
