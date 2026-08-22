import { buildCareerWorkspaceState } from "@/lib/careerpath/career-os";
import { answerCareerQuestionAgent } from "@/lib/careerpath/orchestrator";
import { answerCareerMemoryQuery, isReadOnlyCareerMemoryQuery } from "@/lib/careerpath/read-only-memory";
import { isFabricationInstruction } from "@/lib/careerpath/source-safety";
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
} from "@/inngest/handlers";
import type {
  AgentIntent,
  CareerPathResume,
  CareerWorkspaceState,
} from "@/lib/careerpath/types";

export type CareerIntentResult = {
  assistantMessage: string;
  resume: CareerPathResume | null;
  resumeId: string | null;
  missingFields?: string[];
  versionCreated?: boolean;
  workspace?: CareerWorkspaceState;
};

export async function processCareerIntent(
  intent: AgentIntent,
  message: string,
  currentResume: CareerPathResume | null,
  userId: string,
  resumeId?: string,
  command?: unknown,
): Promise<CareerIntentResult> {
  const metadata = { userId, resumeId };

  // Career Memory recall is a deterministic product action. It must never
  // mutate the workspace, call an LLM, or consume an AI action.
  if (isReadOnlyCareerMemoryQuery(message)) {
    const workspace = buildCareerWorkspaceState(currentResume);
    return {
      assistantMessage: answerCareerMemoryQuery(message, workspace.careerProfile),
      resume: currentResume,
      resumeId: currentResume?.id || null,
      workspace,
    };
  }

  // Instructions to fabricate or inject unverified claims are commands, not
  // career evidence. Stop them before any handler can append raw notes, log an
  // achievement, rewrite the resume, or mutate Career Memory.
  if (isFabricationInstruction(message)) {
    return {
      assistantMessage: "I won’t store or generate those requested claims as facts because Career Memory does not contain evidence for them. I left your profile and resume unchanged. If any number, skill, leadership claim, or user count is real, provide the supporting context and I can add the verified version.",
      resume: currentResume,
      resumeId: currentResume?.id || null,
      workspace: buildCareerWorkspaceState(currentResume),
    };
  }

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
        assistantMessage: currentResume
          ? "Click the **PDF** button in the top bar. CareerOS will generate the canonical server PDF, re-parse it, verify the ATS artifact, and only then download it."
          : "Build or open a resume first. Then the **PDF** button will generate and verify the canonical ATS-safe artifact before download.",
        resume: currentResume,
        resumeId: currentResume?.id || null,
        workspace: buildCareerWorkspaceState(currentResume),
      };
    case "GENERAL_HELP": {
      if (
        command &&
        typeof command === "object" &&
        "intent" in command &&
        (command as { intent?: string }).intent === "optimize_linkedin"
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

      const workspace = buildCareerWorkspaceState(currentResume);
      const answer = await answerCareerQuestionAgent(message, workspace, {
        ...metadata,
        fast: true,
      });
      return {
        assistantMessage: answer,
        resume: currentResume,
        resumeId: currentResume?.id || null,
        workspace,
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
