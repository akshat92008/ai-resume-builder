import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { isServerSupabaseConfigured } from "@/lib/supabase/server";
import { logger } from "@/lib/observability/logger";

export type AgentTokenUsage = {
  inputTokens?: number;
  outputTokens?: number;
  totalTokens?: number;
};

export type AgentProvider = "nvidia" | "anthropic" | "openai" | "unknown";

export type AgentTelemetryRun = {
  agentName: string;
  userId?: string;
  resumeId?: string;
  sessionId?: string;
  inputJson?: unknown;
  outputJson?: unknown;
  status: "completed" | "failed" | string;
  error?: string;
  latencyMs?: number;
  model?: string;
  provider?: AgentProvider;
  usage?: AgentTokenUsage;
  attempts?: number;
  estimatedCostUsd?: number;
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
  provider: AgentProvider,
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

export function inferProvider(modelName?: string): AgentProvider {
  const model = (modelName || "").toLowerCase();
  if (model.includes("claude")) return "anthropic";
  if (model.includes("gpt") || model.includes("openai")) return "openai";
  if (model.includes("llama") || model.includes("nvidia")) return "nvidia";
  return "unknown";
}

/**
 * Persist only operational metadata in production. Raw payloads are available only
 * through an explicit local-development opt-in to prevent accidental resume PII capture.
 */
export async function saveAgentTelemetry(run: AgentTelemetryRun): Promise<void> {
  if (!isServerSupabaseConfigured) return;
  const client = createSupabaseAdminClient();
  if (!client) return;

  const capturePayloads = shouldCaptureAgentPayloads();
  const usage = run.usage;
  const provider = run.provider ?? inferProvider(run.model);
  const estimatedCostUsd = run.estimatedCostUsd ?? estimateAgentCostUsd(provider, usage);

  const { error } = await client.from("agent_runs").insert({
    id: crypto.randomUUID(),
    user_id: run.userId || null,
    resume_id: run.resumeId || null,
    session_id: run.sessionId || null,
    agent_name: run.agentName,
    input_json: capturePayloads ? (run.inputJson ?? {}) : {},
    output_json: capturePayloads ? (run.outputJson ?? {}) : {},
    status: run.status,
    error: run.error ? run.error.slice(0, 240) : null,
    latency_ms: run.latencyMs ?? null,
    model: run.model || null,
    provider,
    input_tokens: usage?.inputTokens ?? null,
    output_tokens: usage?.outputTokens ?? null,
    total_tokens: usage?.totalTokens ?? null,
    estimated_cost_usd: estimatedCostUsd ?? null,
    attempts: Math.max(1, run.attempts ?? 1),
  });

  if (error) {
    logger.error("[agent_runs] privacy-safe telemetry insert failed", {
      code: typeof error.code === "string" ? error.code : undefined,
    });
  }
}
