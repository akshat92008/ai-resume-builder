/**
 * CareerOS — Analytics DB Methods
 * Persistence for telemetry and job-search insights.
 */

import { createServerSupabaseClient } from "@/lib/supabase/server";
import { logger } from "@/lib/observability/logger";
import { DatabaseUnavailableError } from "./db-errors";
import { getSupabaseUser } from "./db";
import type { JobSearchInsight } from "./types";

export type AnalyticsEvent = {
  eventType: string;
  eventData?: Record<string, unknown>;
};

export async function logAnalyticsEvent(event: AnalyticsEvent): Promise<void> {
  // Telemetry is deliberately best-effort: analytics must not turn a successful
  // user operation into a failure. Product data below is not best-effort.
  const supabase = await createServerSupabaseClient();
  if (!supabase) return;

  const user = await getSupabaseUser();
  if (!user) return;

  const payload = {
    user_id: user.id,
    event_type: event.eventType,
    event_data: event.eventData || {},
  };

  const { error } = await supabase.from("analytics_events").insert(payload);
  if (error) logger.error("[db-analytics] Failed to log analytics event", { error });
}

export async function saveJobSearchInsights(insights: JobSearchInsight[]): Promise<void> {
  if (insights.length === 0) return;
  const supabase = await createServerSupabaseClient();
  if (!supabase) throw new DatabaseUnavailableError("job-search insight save");

  const user = await getSupabaseUser();
  if (!user) throw new Error("Authentication required");

  const { error: deleteError } = await supabase
    .from("job_search_insights")
    .delete()
    .eq("user_id", user.id);
  if (deleteError) {
    logger.error("[db-analytics] Failed to replace existing job-search insights", { error: deleteError });
    throw new DatabaseUnavailableError("job-search insight replacement");
  }

  const payload = insights.map((insight) => ({
    id: insight.id,
    user_id: user.id,
    insight: {
      type: insight.type,
      title: insight.title,
      explanation: insight.explanation,
      suggestedAction: insight.suggestedAction,
      priority: insight.priority,
    },
  }));

  const { error } = await supabase.from("job_search_insights").insert(payload);
  if (error) {
    logger.error("[db-analytics] Failed to save job-search insights", { error });
    throw new DatabaseUnavailableError("job-search insight save");
  }
}
