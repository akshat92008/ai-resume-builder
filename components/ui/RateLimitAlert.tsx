"use client";

import { useEffect, useState } from "react";
import { Alert } from "@/components/ui";

export function RateLimitAlert({ until, onClear }: { until: number | null, onClear?: () => void }) {
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null);

  useEffect(() => {
    if (!until) {
      setSecondsLeft(null);
      return;
    }

    const interval = setInterval(() => {
      const now = Date.now();
      const diff = Math.max(0, Math.ceil((until - now) / 1000));
      setSecondsLeft(diff);
      if (diff === 0) {
        clearInterval(interval);
        if (onClear) onClear();
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [until, onClear]);

  if (!until || secondsLeft === null || secondsLeft === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 animate-in slide-in-from-bottom-5 fade-in duration-300">
      <Alert variant="warning" className="shadow-lg border border-yellow-200 bg-yellow-50 min-w-[300px]">
        <p className="font-semibold text-yellow-800 text-sm">Usage limit exceeded</p>
        <p className="text-yellow-700 text-sm mt-1">
          Please wait <strong>{secondsLeft}s</strong> before trying again.
        </p>
      </Alert>
    </div>
  );
}
