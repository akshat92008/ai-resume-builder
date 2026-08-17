export type AgentTokenUsage = {
  inputTokens?: number;
  outputTokens?: number;
  totalTokens?: number;
};

function finiteNumber(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function safeString(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed ? trimmed.slice(0, 80) : undefined;
}

/**
 * Provider failures can contain request/response bodies with resume PII.
 * Keep operationally useful metadata only; never persist or log raw provider errors.
 */
export function safeErrorSummary(error: unknown): string {
  if (!error || typeof error !== "object") return "ProviderError";

  const record = error as Record<string, unknown>;
  const name = safeString(error instanceof Error ? error.name : record.name) || "ProviderError";
  const status = finiteNumber(record.status) ?? finiteNumber(record.statusCode);
  const code = safeString(record.code);

  return [name, status !== undefined ? `status=${status}` : undefined, code ? `code=${code}` : undefined]
    .filter(Boolean)
    .join(" ");
}

export function shouldCaptureAgentPayloads(source: NodeJS.ProcessEnv = process.env): boolean {
  return source.NODE_ENV !== "production" && source.AGENT_TELEMETRY_CAPTURE_PAYLOADS === "true";
}

function parseRate(value: string | undefined): number | undefined {
  if (!value?.trim()) return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : undefined;
}

/**
 * Estimate inference cost from configured per-million-token rates.
 * Rates are configuration, not hard-coded assumptions, because provider pricing changes.
 */
export function estimateAgentCostUsd(
  provider: "nvidia" | "anthropic" | "openai" | "unknown",
  usage: AgentTokenUsage | undefined,
  source: NodeJS.ProcessEnv = process.env,
): number | undefined {
  if (!usage) return undefined;

  const prefix = provider === "unknown" ? "AI" : provider.toUpperCase();
  const inputRate = parseRate(source[`${prefix}_INPUT_COST_PER_MILLION_USD`]);
  const outputRate = parseRate(source[`${prefix}_OUTPUT_COST_PER_MILLION_USD`]);
  if (inputRate === undefined && outputRate === undefined) return undefined;

  const inputCost = ((usage.inputTokens ?? 0) / 1_000_000) * (inputRate ?? 0);
  const outputCost = ((usage.outputTokens ?? 0) / 1_000_000) * (outputRate ?? 0);
  return Number((inputCost + outputCost).toFixed(6));
}
