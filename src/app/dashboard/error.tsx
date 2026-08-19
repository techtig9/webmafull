"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/Button";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Dashboard error:", error);
  }, [error]);

  return (
    <div className="flex h-64 flex-col items-center justify-center gap-3 text-center">
      <p className="font-display font-bold">Something went wrong.</p>
      <p className="max-w-sm text-sm text-ink/50">
        That page hit an unexpected error. Try again, or head back to the dashboard.
      </p>
      <Button variant="secondary" onClick={reset}>
        Try again
      </Button>
    </div>
  );
}
