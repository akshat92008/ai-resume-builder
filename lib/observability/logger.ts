import * as Sentry from "@sentry/nextjs";

type LogLevel = "info" | "warn" | "error";
type LogContext = Record<string, unknown>;

let globalContext: LogContext = {};
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

function reportErrorToSentry(message: string, context: LogContext) {
  if (!process.env.SENTRY_DSN && !process.env.NEXT_PUBLIC_SENTRY_DSN) return;
  const candidate = context.error;
  if (candidate instanceof Error) Sentry.captureException(candidate);
  else Sentry.captureMessage(message, "error");
}

function write(level: LogLevel, message: string, context: LogContext = {}) {
  const normalizedContext = Object.fromEntries(
    Object.entries(context).map(([key, value]) => [key, normalizeValue(value)]),
  );

  breadcrumbs.push({ timestamp: new Date().toISOString(), message, level });
  if (breadcrumbs.length > MAX_BREADCRUMBS) breadcrumbs.shift();

  if (level === "error") reportErrorToSentry(message, context);

  if (process.env.NODE_ENV === "production") {
    console[level](JSON.stringify({
      level,
      message,
      timestamp: new Date().toISOString(),
      ...globalContext,
      ...normalizedContext,
    }));
    return;
  }

  console[level](message, { ...globalContext, ...normalizedContext });
}

export const logger = {
  info: (message: string, context?: LogContext) => write("info", message, context),
  warn: (message: string, context?: LogContext) => write("warn", message, context),
  error: (message: string, context?: LogContext) => write("error", message, context),
  setContext: (context: LogContext) => { globalContext = { ...globalContext, ...context }; },
  clearContext: () => { globalContext = {}; },
  getBreadcrumbs: () => [...breadcrumbs],
  flush: async () => { await Sentry.flush(2000); },
};
