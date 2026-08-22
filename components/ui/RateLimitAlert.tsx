"use client";

import { useEffect, useState } from "react";
import { Alert } from "@/components/ui";

function secondsUntil(until: number) {
  return Math.max(0, Math.ceil((until - Date.now()) / 1000));
}

function formatWait(seconds: number) {
  if (seconds < 120) return `${seconds}s`;
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.ceil((seconds % 3600) / 60);
  if (hours > 0) return `${hours}h${minutes ? ` ${minutes}m` : ""}`;
  return `${Math.ceil(seconds / 60)}m`;
}

export function RateLimitAlert({ until, onClear }: { until: number | null, onClear?: () => void }) {
  const [secondsLeft, setSecondsLeft] = useState<number | null>(() => until ? secondsUntil(until) : null);

  useEffect(() => {
    if (!until) {
      setSecondsLeft(null);
      return;
    }

    const update = () => {
      const diff = secondsUntil(until);
      setSecondsLeft(diff);
      if (diff === 0 && onClear) onClear();
      return diff;
    };

    update();
    const interval = setInterval(() => {
      if (update() === 0) clearInterval(interval);
    }, 1000);

    return () => clearInterval(interval);
  }, [until, onClear]);

  if (!until || secondsLeft === null || secondsLeft === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 animate-in slide-in-from-bottom-5 fade-in duration-300">
      <Alert variant="warning" className="shadow-lg border border-yellow-200 bg-yellow-50 min-w-[300px] max-w-[380px]">
        <p className="font-semibold text-yellow-800 text-sm">AI action limit reached</p>
        <p className="text-yellow-700 text-sm mt-1">
          AI actions reset in approximately <strong>{formatWait(secondsLeft)}</strong>. Career Memory lookups remain available and do not use AI quota.
        </p>
      </Alert>
    </div>
  );
}
