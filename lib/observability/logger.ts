/**
 * Structured logger for CareerOS.
 *
 * In production, outputs JSON lines suitable for ingestion by
 * Datadog, Axiom, Sentry, or any structured log collector.
 * In development, outputs human-readable console messages.
 *
 * Future integration points:
 *   - Call `setContext()` at the start of each request to attach userId/requestId.
 *   - Call `flush()` at the end of serverless invocations to ensure delivery.
 *   - Replace `console[level]` with a transport to Sentry/Axiom when ready.
 */

type LogLevel = "info" | "warn" | "error";

type LogContext = Record<string, unknown>;

/** Global context attached to every log entry (e.g., userId, requestId). */
let globalContext: LogContext = {};

/** Breadcrumb trail for structured tracing. */
const breadcrumbs: Array<{ timestamp: string; message: string; level: LogLevel }> = [];
const MAX_BREADCRUMBS = 20;

function normalizeValue(value: unknown): unknown {
  if (value instanceof Error) {
    return {
      name: value.name,
      message: value.message,
      stack: process.env.NODE_ENV === "production" ? undefined : value.stack,
    };
  }
  return value;
}

function write(level: LogLevel, message: string, context: LogContext = {}) {
  const normalizedContext = Object.fromEntries(
    Object.entries(context).map(([key, value]) => [key, normalizeValue(value)]),
  );

  // Add breadcrumb
  breadcrumbs.push({
    timestamp: new Date().toISOString(),
    message,
    level,
  });
  if (breadcrumbs.length > MAX_BREADCRUMBS) {
    breadcrumbs.shift();
  }

  if (process.env.NODE_ENV === "production") {
    const entry = JSON.stringify({
      level,
      message,
      timestamp: new Date().toISOString(),
      ...globalContext,
      ...normalizedContext,
    });
    console[level](entry);

    // Future: Send to Sentry/Axiom here
    // if (level === "error" && process.env.SENTRY_DSN) {
    //   Sentry.captureException(context.error || new Error(message));
    // }
    return;
  }

  console[level](message, { ...globalContext, ...normalizedContext });
}

export const logger = {
  info: (message: string, context?: LogContext) => write("info", message, context),
  warn: (message: string, context?: LogContext) => write("warn", message, context),
  error: (message: string, context?: LogContext) => write("error", message, context),

  /**
   * Set global context that will be attached to every subsequent log entry.
   * Useful for attaching userId, requestId, or traceId at the start of a request.
   *
   * @example
   * logger.setContext({ userId: auth.user.id, requestId: crypto.randomUUID() });
   */
  setContext: (context: LogContext) => {
    globalContext = { ...globalContext, ...context };
  },

  /**
   * Clear global context. Call at the end of a request or between invocations.
   */
  clearContext: () => {
    globalContext = {};
  },

  /**
   * Get the current breadcrumb trail for debugging.
   */
  getBreadcrumbs: () => [...breadcrumbs],

  /**
   * Flush logs to external services. Stub for future Sentry/Axiom integration.
   * Call at the end of serverless function invocations to ensure delivery.
   */
  flush: async () => {
    // Future: await Sentry.flush(2000);
    // Future: await axiom.flush();
  },
};
