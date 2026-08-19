export type ObservabilityBackend = "sentry" | "vercel-runtime" | "none";

/**
 * CareerOS supports two production observability backends:
 *
 * - Sentry, when both server and browser DSNs are configured.
 * - Vercel Runtime Logs, when the application is running on Vercel. Server
 *   errors already flow through the structured logger and browser failures are
 *   forwarded to a privacy-safe first-party endpoint that writes a fingerprint
 *   into the same runtime logs.
 *
 * Vercel-native observability is sufficient for a controlled free beta. Broad
 * public/paid GA should still use an external alerting backend (Sentry or an
 * equivalent) so incidents are actively surfaced rather than dashboard-only.
 */
export function getObservabilityBackend(
  source: NodeJS.ProcessEnv = process.env,
): ObservabilityBackend {
  if (source.SENTRY_DSN?.trim() && source.NEXT_PUBLIC_SENTRY_DSN?.trim()) {
    return "sentry";
  }

  if (source.VERCEL === "1" && source.VERCEL_ENV?.trim()) {
    return "vercel-runtime";
  }

  return "none";
}

export function hasCoreObservability(source: NodeJS.ProcessEnv = process.env) {
  return getObservabilityBackend(source) !== "none";
}
