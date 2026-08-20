/**
 * Inngest function definitions for the CareerOS AI orchestrator.
 *
 * Interactive requests use the same processor directly from the API route.
 * This worker remains available for durable/background execution without
 * duplicating the business logic.
 */

import { inngest } from "./client";
import { getServerResume, saveResumeMessage } from "@/lib/careerpath/db";
import { buildCareerWorkspaceState } from "@/lib/careerpath/career-os";
import { processCareerIntent } from "@/lib/careerpath/process-intent";
import { safeErrorSummary } from "@/lib/careerpath/telemetry";
import { logger } from "@/lib/observability/logger";
import type { AgentIntent, CareerPathResume } from "@/lib/careerpath/types";

type ProcessResumeIntentEvent = {
  data: {
    intent: AgentIntent;
    message: string;
    currentResume: CareerPathResume | null;
    userId: string;
    resumeId?: string;
    command?: unknown;
    operationId: string;
  };
};

type InngestStep = {
  run<T>(name: string, fn: () => Promise<T>): Promise<T>;
};

// @ts-ignore — Inngest typing workaround for generic event payloads
export const processResumeIntent = (inngest as any).createFunction(
  {
    id: "process-resume-intent",
    triggers: [{ event: "resume/process.intent" }],
    concurrency: {
      limit: 1,
      key: "event.data.userId",
    },
  },
  async ({
    event,
    step,
  }: {
    event: ProcessResumeIntentEvent;
    step: InngestStep;
  }) => {
    const { intent, message, currentResume, userId, resumeId, command, operationId } = event.data;

    const result = await step.run("process-intent", async () => {
      const latestResume = resumeId
        ? await getServerResume(resumeId, userId)
        : currentResume;

      try {
        return await processCareerIntent(
          intent,
          message,
          latestResume,
          userId,
          resumeId,
          command,
        );
      } catch (error) {
        logger.warn("[process-resume-intent] Operation failed cleanly", {
          intent,
          operationId,
          error: safeErrorSummary(error),
        });
        return {
          assistantMessage: "CareerOS could not finish this run within the execution window. Your last saved workspace state is still available. Please retry once.",
          resume: latestResume,
          resumeId: latestResume?.id || resumeId || null,
          workspace: buildCareerWorkspaceState(latestResume),
        };
      }
    });

    await step.run("save-message", async () => {
      await saveResumeMessage({
        userId,
        resumeId: result.resumeId || resumeId || null,
        role: "assistant",
        content: result.assistantMessage,
        intent,
        operationId,
      });
    });

    return { ...result, operationId };
  },
);
