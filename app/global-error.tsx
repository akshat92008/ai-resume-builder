"use client";

import { useEffect } from "react";
import { AlertCircle } from "lucide-react";
import { Button } from "@/components/ui";
import * as Sentry from "@sentry/nextjs";
import { reportClientError } from "@/components/observability/ClientErrorReporter";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Always emit a privacy-safe fingerprint into the first-party observability
    // path. Raw messages/stacks never leave the browser through this channel.
    void reportClientError(error, "react-boundary", error.digest);

    // Keep Sentry as an optional richer backend for deployments that configure
    // it explicitly. The SDK is inert when NEXT_PUBLIC_SENTRY_DSN is absent.
    if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
      Sentry.captureException(error);
    }
  }, [error]);

  return (
    <html lang="en">
      <body>
        <div className="flex min-h-screen flex-col items-center justify-center p-4 text-center">
          <AlertCircle className="mb-4 h-12 w-12 text-red-600" />
          <h2 className="mb-2 text-2xl font-bold tracking-tight text-slate-900">Something went wrong!</h2>
          <p className="mb-6 max-w-md text-slate-600">
            A critical error occurred while loading this page. Our team has been notified.
          </p>
          {error.digest && (
            <p className="mb-4 text-xs text-slate-400 font-mono">
              Error ID: {error.digest}
            </p>
          )}
          <Button onClick={() => reset()}>Try again</Button>
        </div>
      </body>
    </html>
  );
}
