/**
 * Inngest function definitions for the CareerOS AI orchestrator.
 *
 * This file is a thin dispatcher. All business logic lives in
 * `./handlers/` modules, organized by domain.
 */

import { inngest } from "./client";
import { getServerResume, saveResumeMessage } from "@/lib/careerpath/db";
import { buildCareerWorkspaceState } from "@/lib/careerpath/career-os";
import { answerCareerQuestionAgent } from "@/lib/careerpath/orchestrator";
import {
  handleCreateResume,
  handleImproveResume,
  handleTailorToJob,
  handleAddInformation,
  handleRewriteSection,
  handleGenerateResumeVersion,
  handleGenerateApplicationPack,
  handleTrackJobApplication,
  handleAnalyzeJobSearch,
  handleStarInterview,
  handleHumanizeResume,
  handleEstimateImpact,
  handleGapAnalysis,
  handleMultiPersona,
  handleVisualizeATS,
  handleGenerateOutreach,
} from "./handlers";
import type {
  AgentIntent,
  CareerPathResume,
  CareerWorkspaceState,
} from "@/lib/careerpath/types";

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
      // Event payloads are snapshots. A previous queued operation may have
      // completed while this one waited for the per-user concurrency slot, so
      // always reload the resume immediately before mutation.
      const latestResume = resumeId
        ? await getServerResume(resumeId, userId)
        : currentResume;
      return processIntent(
        intent,
        message,
        latestResume,
        userId,
        resumeId,
        command,
      );
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

async function processIntent(
  intent: AgentIntent,
  message: string,
  currentResume: CareerPathResume | null,
  userId: string,
  resumeId?: string,
  _command?: unknown,
): Promise<{
  assistantMessage: string;
  resume: CareerPathResume | null;
  resumeId: string | null;
  missingFields?: string[];
  versionCreated?: boolean;
  workspace?: CareerWorkspaceState;
}> {
  const metadata = { userId, resumeId };

  switch (intent) {
    case "CREATE_RESUME":
      return handleCreateResume(message, userId, metadata);
    case "IMPROVE_RESUME":
      return handleImproveResume(message, currentResume, userId, metadata);
    case "TAILOR_TO_JOB":
      return handleTailorToJob(message, currentResume, userId, metadata);
    case "ADD_INFORMATION":
      return handleAddInformation(message, currentResume, userId, metadata);
    case "REWRITE_SECTION":
      return handleRewriteSection(message, currentResume, userId, metadata);
    case "GENERATE_RESUME_VERSION":
      return handleGenerateResumeVersion(message, currentResume);
    case "GENERATE_APPLICATION_PACK":
      return handleGenerateApplicationPack(message, currentResume, userId, metadata);
    case "TRACK_JOB_APPLICATION":
      return handleTrackJobApplication(message, currentResume, userId);
    case "ANALYZE_JOB_SEARCH":
      return handleAnalyzeJobSearch(currentResume);
    case "STAR_INTERVIEW":
      return handleStarInterview(currentResume, userId, metadata);
    case "HUMANIZE_RESUME":
      return handleHumanizeResume(currentResume, userId, metadata);
    case "ESTIMATE_IMPACT":
      return handleEstimateImpact(currentResume, userId, metadata);
    case "GAP_ANALYSIS":
      return handleGapAnalysis(message, currentResume, userId, metadata);
    case "MULTI_PERSONA":
      return handleMultiPersona(currentResume, userId, metadata);
    case "VISUALIZE_ATS":
      return handleVisualizeATS(currentResume, userId, metadata);
    case "GENERATE_OUTREACH":
      return handleGenerateOutreach(message, currentResume, userId, metadata);
    case "ASK_MISSING_INFO":
      return {
        assistantMessage: "What information would you like to provide? You can share your education, skills, projects, experience, or any career details.",
        resume: currentResume,
        resumeId: currentResume?.id || null,
        workspace: buildCareerWorkspaceState(currentResume),
      };
    case "GENERATE_PDF":
      return {
        assistantMessage: "To download your resume as PDF, click the **Download PDF** button in the top bar. It will open a print dialog where you can save it as a PDF file.",
        resume: currentResume,
        resumeId: currentResume?.id || null,
        workspace: buildCareerWorkspaceState(currentResume),
      };
    case "GENERAL_HELP": {
      if (
        _command &&
        typeof _command === "object" &&
        "intent" in _command &&
        (_command as { intent?: string }).intent === "optimize_linkedin"
      ) {
        const workspace = buildCareerWorkspaceState(currentResume);
        const linkedIn = workspace.linkedInOptimization;
        return {
          assistantMessage: linkedIn
            ? `LinkedIn optimization is ready.\n\nHeadline: ${linkedIn.headline}\n\nAbout: ${linkedIn.about}\n\nTop skills: ${linkedIn.skills.slice(0, 8).join(", ") || "Add more skills to Career Memory."}`
            : "Build Career Memory first, then I can generate LinkedIn headline, About, experience updates, skills, Featured items, and SEO keywords.",
          resume: currentResume,
          resumeId: currentResume?.id || null,
          workspace,
        };
      }
      const generalWorkspace = buildCareerWorkspaceState(currentResume);
      const answer = await answerCareerQuestionAgent(message, generalWorkspace, {
        ...metadata,
        fast: true,
      });
      return {
        assistantMessage: answer,
        resume: currentResume,
        resumeId: currentResume?.id || null,
        workspace: generalWorkspace,
      };
    }
    default:
      return {
        assistantMessage: "Tell me what to store or generate: build Career Memory, tailor to a job description, audit the resume, write a cover letter, optimize LinkedIn, track an application, or log a new achievement.",
        resume: currentResume,
        resumeId: currentResume?.id || null,
        workspace: buildCareerWorkspaceState(currentResume),
      };
  }
}
