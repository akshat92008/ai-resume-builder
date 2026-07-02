/**
 * CareerOS — Analytics DB Methods
 *
 * Persistence for telemetry and job search insights.
 */

import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getSupabaseUser } from "./db";
import type { JobSearchInsight } from "./types";

// ---------------------------------------------------------------------------
// Telemetry Events
// ---------------------------------------------------------------------------

export type AnalyticsEvent = {
  eventType: string;
  eventData?: Record<string, any>;
};

export async function logAnalyticsEvent(event: AnalyticsEvent): Promise<void> {
  const supabase = await createServerSupabaseClient();
  if (!supabase) return; // Silent fail in dev without Supabase

  const user = await getSupabaseUser();
  if (!user) return;

  const payload = {
    user_id: user.id,
    event_type: event.eventType,
    event_data: event.eventData || {},
  };

  const { error } = await supabase.from("analytics_events").insert(payload);
  if (error) {
    console.error("[db-analytics] Error logging analytics event:", error);
  }
}

// ---------------------------------------------------------------------------
// Job Search Insights
// ---------------------------------------------------------------------------

export async function saveJobSearchInsights(insights: JobSearchInsight[]): Promise<void> {
  const supabase = await createServerSupabaseClient();
  if (!supabase || insights.length === 0) return;

  const user = await getSupabaseUser();
  if (!user) return;

  // Clear existing insights for the user (we recalculate them fully)
  await supabase.from("job_search_insights").delete().eq("user_id", user.id);

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
    console.error("[db-analytics] Error saving job search insights:", error);
  }
}
