"use client";

import { useEffect } from "react";
import { AlertCircle } from "lucide-react";
import { Button } from "@/components/ui";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error("Error boundary caught:", error);
  }, [error]);

  return (
    <div className="flex h-[50vh] flex-col items-center justify-center p-4 text-center">
      <AlertCircle className="mb-4 h-12 w-12 text-red-600" />
      <h2 className="mb-2 text-2xl font-bold tracking-tight text-slate-900">Something went wrong!</h2>
      <p className="mb-6 max-w-md text-slate-600">
        We encountered an error while loading this content.
      </p>
      <Button onClick={() => reset()}>Try again</Button>
    </div>
  );
}
