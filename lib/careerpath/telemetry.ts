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

/** Provider failures may contain prompts or provider response bodies with resume PII. */
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

function parseRate(value: string | undefined): number | undefined {
  if (!value?.trim()) return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : undefined;
}

/** Pricing is deployment configuration because provider rates change over time. */
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
 * agent_runs is metadata-only by design. Resume text, job descriptions, prompts,
 * and model output belong in product tables with the correct ownership controls,
 * never in operational telemetry.
 */
export async function saveAgentTelemetry(run: AgentTelemetryRun): Promise<void> {
  if (!isServerSupabaseConfigured) return;
  const client = createSupabaseAdminClient();
  if (!client) return;

  const usage = run.usage;
  const provider = run.provider ?? inferProvider(run.model);
  const estimatedCostUsd = run.estimatedCostUsd ?? estimateAgentCostUsd(provider, usage);

  const { error } = await client.from("agent_runs").insert({
    id: crypto.randomUUID(),
    user_id: run.userId || null,
    resume_id: run.resumeId || null,
    session_id: run.sessionId || null,
    agent_name: run.agentName,
    input_json: {},
    output_json: {},
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
