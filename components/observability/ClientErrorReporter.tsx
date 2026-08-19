"use client";

import { useEffect } from "react";

type ClientErrorSource = "window-error" | "unhandled-rejection" | "react-boundary";

function normalizeError(reason: unknown) {
  if (reason instanceof Error) return reason;
  if (typeof reason === "string") return new Error(reason);
  return new Error("Unknown client error");
}

function safeErrorName(name: string) {
  return /^[A-Za-z][A-Za-z0-9_.:-]{0,79}$/.test(name) ? name : "Error";
}

async function fingerprintError(error: Error) {
  const input = `${error.name}\n${error.message}\n${error.stack || ""}`;
  const bytes = new TextEncoder().encode(input);
  const hash = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(hash))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

export async function reportClientError(
  reason: unknown,
  source: ClientErrorSource,
  digest?: string,
) {
  if (typeof window === "undefined") return;

  try {
    const error = normalizeError(reason);
    const fingerprint = await fingerprintError(error);
    const route = window.location.pathname || "/";
    const body = JSON.stringify({
      source,
      errorName: safeErrorName(error.name || "Error"),
      fingerprint,
      route: route.startsWith("/") && !route.startsWith("//") ? route.slice(0, 300) : "/",
      digest: digest?.slice(0, 128) || undefined,
    });

    await fetch("/api/observability/client-error", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
      keepalive: true,
      credentials: "same-origin",
    }).catch(() => undefined);
  } catch {
    // Observability must never throw into the product's own error path.
  }
}

export function ClientErrorReporter() {
  useEffect(() => {
    const onError = (event: ErrorEvent) => {
      void reportClientError(event.error || event.message, "window-error");
    };
    const onUnhandledRejection = (event: PromiseRejectionEvent) => {
      void reportClientError(event.reason, "unhandled-rejection");
    };

    window.addEventListener("error", onError);
    window.addEventListener("unhandledrejection", onUnhandledRejection);
    return () => {
      window.removeEventListener("error", onError);
      window.removeEventListener("unhandledrejection", onUnhandledRejection);
    };
  }, []);

  return null;
}
