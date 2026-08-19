import * as Sentry from "@sentry/nextjs";

type LogLevel = "info" | "warn" | "error";
type LogContext = Record<string, unknown>;

let globalContext: LogContext = {};
const breadcrumbs: Array<{ timestamp: string; message: string; level: LogLevel }> = [];
const MAX_BREADCRUMBS = 20;
const MAX_STRING_LENGTH = 2_000;
const MAX_ARRAY_ITEMS = 25;
const MAX_OBJECT_KEYS = 50;
const MAX_DEPTH = 5;
const REDACTED = "[REDACTED]";
const PRODUCTION_ERROR_MESSAGE = "[REDACTED_ERROR_MESSAGE]";

const SENSITIVE_KEY = /(?:authorization|cookie|set-cookie|password|passwd|secret|token|api[-_]?key|service[-_]?role|signature|credential|session|raw[-_]?body|job[-_]?description|resume[-_]?text|prompt|payload|content|email)/i;
const EMAIL_PATTERN = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi;
const BEARER_PATTERN = /\bBearer\s+[A-Za-z0-9._~+\/-]+=*/gi;
const SECRET_PATTERN = /\b(?:sk|key|token|secret|rzp)_[A-Za-z0-9_-]{8,}\b/gi;

function sanitizeString(value: string) {
  const redacted = value
    .replace(EMAIL_PATTERN, "[REDACTED_EMAIL]")
    .replace(BEARER_PATTERN, "Bearer [REDACTED]")
    .replace(SECRET_PATTERN, REDACTED);
  return redacted.length > MAX_STRING_LENGTH
    ? `${redacted.slice(0, MAX_STRING_LENGTH)}…[TRUNCATED]`
    : redacted;
}

function safeErrorName(value: string) {
  const sanitized = sanitizeString(value);
  return /^[A-Za-z][A-Za-z0-9_.:-]{0,79}$/.test(sanitized) ? sanitized : "Error";
}

export function sanitizeLogValue(value: unknown, key = "", depth = 0): unknown {
  if (SENSITIVE_KEY.test(key)) return REDACTED;
  if (depth > MAX_DEPTH) return "[MAX_DEPTH]";

  if (value instanceof Error) {
    return {
      name: safeErrorName(value.name),
      message: process.env.NODE_ENV === "production" ? PRODUCTION_ERROR_MESSAGE : sanitizeString(value.message),
      stack: process.env.NODE_ENV === "production" ? undefined : sanitizeString(value.stack || ""),
    };
  }

  if (typeof value === "string") return sanitizeString(value);
  if (typeof value === "number" || typeof value === "boolean" || value == null) return value;
  if (typeof value === "bigint") return value.toString();

  if (Array.isArray(value)) {
    return value.slice(0, MAX_ARRAY_ITEMS).map((item) => sanitizeLogValue(item, "", depth + 1));
  }

  if (typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .slice(0, MAX_OBJECT_KEYS)
        .map(([childKey, childValue]) => [childKey, sanitizeLogValue(childValue, childKey, depth + 1)]),
    );
  }

  return sanitizeString(String(value));
}

export function sanitizeLogContext(context: LogContext): LogContext {
  return Object.fromEntries(
    Object.entries(context).map(([key, value]) => [key, sanitizeLogValue(value, key)]),
  );
}

function reportErrorToSentry(message: string, context: LogContext) {
  if (!process.env.SENTRY_DSN && !process.env.NEXT_PUBLIC_SENTRY_DSN) return;
  const candidate = context.error;
  if (candidate instanceof Error) {
    const safeError = new Error(process.env.NODE_ENV === "production" ? PRODUCTION_ERROR_MESSAGE : sanitizeString(candidate.message));
    safeError.name = safeErrorName(candidate.name);
    Sentry.captureException(safeError);
  } else {
    Sentry.captureMessage(sanitizeString(message), "error");
  }
}

function write(level: LogLevel, message: string, context: LogContext = {}) {
  const normalizedContext = sanitizeLogContext(context);
  const safeGlobalContext = sanitizeLogContext(globalContext);
  const safeMessage = sanitizeString(message);

  breadcrumbs.push({ timestamp: new Date().toISOString(), message: safeMessage, level });
  if (breadcrumbs.length > MAX_BREADCRUMBS) breadcrumbs.shift();

  if (level === "error") reportErrorToSentry(safeMessage, context);

  if (process.env.NODE_ENV === "production") {
    console[level](JSON.stringify({
      level,
      message: safeMessage,
      timestamp: new Date().toISOString(),
      ...safeGlobalContext,
      ...normalizedContext,
    }));
    return;
  }

  console[level](safeMessage, { ...safeGlobalContext, ...normalizedContext });
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
