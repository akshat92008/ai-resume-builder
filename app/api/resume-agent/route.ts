import { NextResponse } from "next/server";

export const maxDuration = 60; // Max allowed for Vercel Hobby plan
export const runtime = "edge";
import { z } from "zod";
import { requireAppAccess } from "@/lib/careerpath/auth";
import { checkRateLimit } from "@/lib/careerpath/rate-limit";
import {
  getServerResume,
  saveServerResume,
  saveResumeMessage,
  saveResumeVersion,
} from "@/lib/careerpath/db";
import {
  inferIntentLLM,
} from "@/lib/careerpath/orchestrator";
import {
  createResumeRecord,
  auditResume,
  tailorResume,
} from "@/lib/careerpath/agents";
import {
  analyzeJobSearchPerformance,
  buildCareerWorkspaceState,
  createJobApplicationFromCommand,
  createResumeDocumentFromResume,
  extractJobDescription,
  generateApplicationPack,
  generateSmartResumeVersions,
  legacyProfileToCareerProfile,
  mineAchievements,
  routeCareerCommand,
} from "@/lib/careerpath/career-os";
import { handleResumeMessage } from "@/lib/resume/agent";
import { deriveRenderableResume } from "@/lib/resume/render";
import { contentToResumeState } from "@/lib/resume/types";
import type { AgentResponse as ResumeBrainResponse, ResumeState } from "@/lib/resume/types";
import type { AgentIntent, CareerPathResume, CareerWorkspaceState } from "@/lib/careerpath/types";

const RequestSchema = z.object({
  message: z.string().min(1).max(20000),
  resumeId: z.string().uuid().optional(),
});

export async function POST(request: Request) {
  try {
    const auth = await requireAppAccess();
    if (!auth.ok) return auth.response;
    const userId = auth.user.id;

    const json = await request.json().catch(() => ({}));
    const parseResult = RequestSchema.safeParse(json);
    if (!parseResult.success) {
      return NextResponse.json(
        { error: { code: "INVALID_INPUT", message: "Invalid request. Provide a message.", recoverable: true } },
        { status: 400 },
      );
    }
    const { message, resumeId } = parseResult.data;

    // Rate limit
    const ipHash = request.headers.get("x-forwarded-for") || "unknown";
    const rateLimit = await checkRateLimit(userId, ipHash, "resume_agent", 30);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: { code: "RATE_LIMIT_EXCEEDED", message: "You've reached the usage limit. Please wait and try again.", recoverable: true } },
        { status: 429 },
      );
    }

    // Load existing resume if provided
    let currentResume: CareerPathResume | null = null;
    if (resumeId) {
      currentResume = await getServerResume(resumeId, userId);
    }

    // Save user message
    await saveResumeMessage({
      userId,
      resumeId: resumeId || null,
      role: "user",
      content: message,
    });

    const command = routeCareerCommand(message, {
      profile: currentResume?.careerProfile,
      resume: currentResume,
      applications: currentResume?.applications,
    });

    // Infer intent
    let intent: AgentIntent;
    
    if (command.intent === "generate_application_pack") {
      intent = "GENERATE_APPLICATION_PACK";
    } else if (command.intent === "track_job_application") {
      intent = "TRACK_JOB_APPLICATION";
    } else if (command.intent === "analyze_job_search") {
      intent = "ANALYZE_JOB_SEARCH";
    } else if (command.intent === "generate_resume_version") {
      intent = "GENERATE_RESUME_VERSION";
    } else if (message.length > 500) {
      // Fast path: bypass LLM intent inference for massive text blocks
      const { inferIntentKeyword } = await import("@/lib/careerpath/orchestrator");
      intent = inferIntentKeyword(message, !!currentResume).intent;
    } else {
      const result = await inferIntentLLM(message, !!currentResume, { userId, resumeId });
      intent = result.intent;
    }

    // Process based on intent
    const result = await processIntent(intent, message, currentResume, userId, resumeId, command);

    // Save assistant message
    await saveResumeMessage({
      userId,
      resumeId: result.resumeId || resumeId || null,
      role: "assistant",
      content: result.assistantMessage,
      intent,
    });

    return NextResponse.json({
      assistantMessage: result.assistantMessage,
      intent,
      resume: result.resume,
      resumeId: result.resumeId,
      missingFields: result.missingFields,
      versionCreated: result.versionCreated,
      workspace: result.workspace,
    });
  } catch (err) {
    console.error("[resume-agent] Error:", err);
    return NextResponse.json(
      {
        error: {
          code: "AGENT_ERROR",
          message: "Something went wrong. Your data is saved. Please try again.",
          recoverable: true,
        },
      },
      { status: 500 },
    );
  }
}

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

    case "GENERATE_RESUME_VERSION":
      return handleGenerateResumeVersion(message, currentResume);

    case "GENERATE_APPLICATION_PACK":
      return handleGenerateApplicationPack(message, currentResume, userId, metadata);

    case "TRACK_JOB_APPLICATION":
      return handleTrackJobApplication(message, currentResume, userId);

    case "ANALYZE_JOB_SEARCH":
      return handleAnalyzeJobSearch(currentResume);

    case "ADD_INFORMATION":
      return handleAddInformation(message, currentResume, userId, metadata);

    case "REWRITE_SECTION":
      return handleRewriteSection(message, currentResume, userId, metadata);

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

    case "GENERAL_HELP":
      return {
        assistantMessage: `Here's what I can do:\n\n• **Build a resume** — Paste your skills, projects, education, experience and I'll create an ATS-friendly resume.\n• **Improve your resume** — Say "improve this" or "make it ATS friendly" to strengthen your current resume.\n• **Tailor to a job** — Paste a job description and say "tailor this resume to this job."\n• **Add information** — "Add this project: [details]" or "Add certificate: [name]."\n• **Rewrite a section** — "Rewrite my summary" or "Make project bullets stronger."\n• **Download PDF** — Click the Download PDF button to export.\n\nJust type naturally and I'll figure out what you need.`,
        resume: currentResume,
        resumeId: currentResume?.id || null,
        workspace: buildCareerWorkspaceState(currentResume),
      };

    default:
      return {
        assistantMessage: "I'm not sure what you'd like me to do. Try saying something like 'Build my resume' or 'Improve this resume.'",
        resume: currentResume,
        resumeId: currentResume?.id || null,
        workspace: buildCareerWorkspaceState(currentResume),
      };
  }
}

async function handleCreateResume(
  message: string,
  userId: string,
  metadata: { userId: string; resumeId?: string },
) {
  return applyBrainToResume({
    message,
    currentResume: null,
    userId,
    mode: "build",
    metadata,
  });
}

async function handleImproveResume(
  message: string,
  currentResume: CareerPathResume | null,
  userId: string,
  metadata: { userId: string; resumeId?: string },
) {
  if (!currentResume) {
    return applyBrainToResume({ message, currentResume: null, userId, mode: "improve", metadata });
  }

  // Save version before improving
  await saveResumeVersion({
    userId,
    resumeId: currentResume.id,
    versionName: `Before improvement v${currentResume.version}`,
    resumeJson: currentResume.content,
    reason: "Pre-improvement snapshot",
  });

  return applyBrainToResume({ message, currentResume, userId, mode: "improve", metadata, versionCreated: true });
}

async function handleTailorToJob(
  message: string,
  currentResume: CareerPathResume | null,
  userId: string,
  metadata: { userId: string; resumeId?: string },
) {
  if (!currentResume) {
    return applyBrainToResume({ message, currentResume: null, userId, mode: "tailor", metadata });
  }

  // Save version before tailoring
  await saveResumeVersion({
    userId,
    resumeId: currentResume.id,
    versionName: `Before tailoring v${currentResume.version}`,
    resumeJson: currentResume.content,
    reason: "Pre-tailoring snapshot",
  });

  return applyBrainToResume({ message, currentResume, userId, mode: "tailor", metadata, versionCreated: true });
}

async function handleAddInformation(
  message: string,
  currentResume: CareerPathResume | null,
  userId: string,
  metadata: { userId: string; resumeId?: string },
) {
  if (!currentResume) {
    return applyBrainToResume({ message, currentResume: null, userId, mode: "build", metadata });
  }
  return applyBrainToResume({ message, currentResume, userId, mode: "build", metadata });
}

async function handleRewriteSection(
  message: string,
  currentResume: CareerPathResume | null,
  userId: string,
  metadata: { userId: string; resumeId?: string },
) {
  if (!currentResume) {
    return {
      assistantMessage: "I don't have a resume to edit. Build one first by sharing your career details.",
      resume: null,
      resumeId: null,
    };
  }

  return applyBrainToResume({ message, currentResume, userId, mode: "improve", metadata });
}

async function handleGenerateResumeVersion(
  message: string,
  currentResume: CareerPathResume | null,
) {
  if (!currentResume) {
    return {
      assistantMessage: "Build a resume first, then I can generate master, fresher, internship, frontend, full stack, AI product, startup, corporate, and job-specific versions.",
      resume: null,
      resumeId: null,
      missingFields: ["resume"],
      workspace: buildCareerWorkspaceState(null),
    };
  }

  decorateResumeForCareerOS(currentResume, message);
  const versions = generateSmartResumeVersions(currentResume, currentResume.careerProfile!);
  const requested = versions.find((version) => message.toLowerCase().includes(version.versionType.replace("_", " "))) || versions[0];
  return {
    assistantMessage: `${requested.title} is ready as a smart version strategy.\n\nUse it when: ${requested.whenToUse}\n\nEmphasizes: ${requested.emphasizes.join(", ")}.\nReduces: ${requested.reduces.join(", ")}.\nMissing: ${(requested.missing.length ? requested.missing : ["nothing critical"]).join(", ")}.`,
    resume: currentResume,
    resumeId: currentResume.id,
    workspace: buildCareerWorkspaceState(currentResume, message),
  };
}

async function handleGenerateApplicationPack(
  message: string,
  currentResume: CareerPathResume | null,
  userId: string,
  metadata: { userId: string; resumeId?: string },
) {
  let resume = currentResume;
  if (!resume && message.length > 100) {
    const created = await handleCreateResume(message, userId, metadata);
    resume = created.resume;
  }
  if (!resume) {
    return {
      assistantMessage: "I need a resume or enough career details before I can prepare the full application pack. Paste your career info and the job description together.",
      resume: null,
      resumeId: null,
      missingFields: ["resume", "career profile"],
      workspace: buildCareerWorkspaceState(null),
    };
  }

  const job = extractJobDescription(message || resume.jobDescription || "");
  if (message.length > 80) {
    const tailoring = tailorResume(resume, resume.profile, message);
    const finalAudit = auditResume(tailoring.tailoredResume, resume.targetRole, message);
    resume = {
      ...resume,
      content: tailoring.tailoredResume,
      tailoring,
      jobDescription: message,
      audit: finalAudit,
      score: finalAudit.score,
      version: resume.version + 1,
      updatedAt: new Date().toISOString(),
    };
  }

  decorateResumeForCareerOS(resume, message, { versionType: "job_specific" });
  const pack = generateApplicationPack(resume.careerProfile!, resume, job);
  resume.applicationPack = pack;
  resume.jobSearchInsights = analyzeJobSearchPerformance(resume.applications || [], [resume.resumeDocument!]);
  await saveServerResume(resume);

  return {
    assistantMessage: `Application pack ready for ${job.title || resume.targetRole}. I generated a tailored resume, cover letter, recruiter DM, cold email, LinkedIn message, why-fit answer, interview questions, prep plan, and follow-up message.`,
    resume,
    resumeId: resume.id,
    versionCreated: true,
    workspace: buildCareerWorkspaceState(resume, message),
  };
}

async function handleTrackJobApplication(
  message: string,
  currentResume: CareerPathResume | null,
  userId: string,
) {
  if (!currentResume) {
    return {
      assistantMessage: "I can track applications after there is a resume in the workspace. Build or paste your resume details first, then say what job you applied to.",
      resume: null,
      resumeId: null,
      missingFields: ["resume"],
      workspace: buildCareerWorkspaceState(null),
    };
  }

  decorateResumeForCareerOS(currentResume, message);
  const job = currentResume.jobDescription ? extractJobDescription(currentResume.jobDescription) : extractJobDescription(message);
  const application = createJobApplicationFromCommand(message, userId, currentResume, job);
  const applications = [application, ...(currentResume.applications || [])].slice(0, 50);
  currentResume.applications = applications;
  currentResume.jobSearchInsights = analyzeJobSearchPerformance(applications, [currentResume.resumeDocument!]);
  currentResume.updatedAt = new Date().toISOString();
  await saveServerResume(currentResume);

  return {
    assistantMessage: `Tracked ${application.company} — ${application.role} as ${application.status.replaceAll("_", " ")}. Next action: ${application.followUpAt ? "follow up in about 5 days if there is no reply" : "prepare the application pack before applying"}.`,
    resume: currentResume,
    resumeId: currentResume.id,
    workspace: buildCareerWorkspaceState(currentResume, message),
  };
}

async function handleAnalyzeJobSearch(currentResume: CareerPathResume | null) {
  if (!currentResume) {
    return {
      assistantMessage: "I need tracked applications before I can analyze your job search. Start by tracking saved or applied jobs.",
      resume: null,
      resumeId: null,
      missingFields: ["tracked applications"],
      workspace: buildCareerWorkspaceState(null),
    };
  }

  decorateResumeForCareerOS(currentResume);
  const insights = analyzeJobSearchPerformance(currentResume.applications || [], [currentResume.resumeDocument!]);
  currentResume.jobSearchInsights = insights;
  currentResume.updatedAt = new Date().toISOString();
  await saveServerResume(currentResume);

  return {
    assistantMessage: insights.map((item) => `• ${item.title}: ${item.suggestedAction}`).join("\n"),
    resume: currentResume,
    resumeId: currentResume.id,
    workspace: buildCareerWorkspaceState(currentResume),
  };
}

async function applyBrainToResume(input: {
  message: string;
  currentResume: CareerPathResume | null;
  userId: string;
  mode: "build" | "improve" | "tailor";
  metadata?: { userId: string; resumeId?: string };
  versionCreated?: boolean;
}) {
  const currentState = input.currentResume
    ? contentToResumeState(input.currentResume.content, {
        id: input.currentResume.id,
        targetRole: input.currentResume.targetRole,
      })
    : null;
  const brain = await handleResumeMessage({
    userMessage: input.message,
    currentResume: currentState,
    activeResumeId: input.currentResume?.id || null,
  });

  if (!brain.resume || brain.type === "questions" || (brain.type === "message" && !input.currentResume)) {
    return {
      assistantMessage: brain.message,
      resume: input.currentResume,
      resumeId: input.currentResume?.id || null,
      missingFields: brain.resume?.missingFields?.map((item) => item.field),
      workspace: buildCareerWorkspaceState(input.currentResume),
    };
  }

  const nextResume = await resumeRecordFromBrain(input.currentResume, brain, input);
  await saveServerResume(nextResume);

  return {
    assistantMessage: brain.message,
    resume: nextResume,
    resumeId: nextResume.id,
    versionCreated: input.versionCreated,
    workspace: buildCareerWorkspaceState(nextResume, input.message),
  };
}

async function resumeRecordFromBrain(
  currentResume: CareerPathResume | null,
  brain: ResumeBrainResponse,
  input: {
    message: string;
    userId: string;
    mode: "build" | "improve" | "tailor";
  },
): Promise<CareerPathResume> {
  const state = brain.resume as ResumeState;
  const content = deriveRenderableResume(state);
  const targetRole = state.target.role || currentResume?.targetRole || "";
  const audit = auditResume(content, targetRole, state.target.jobDescription || currentResume?.jobDescription || "");
  const now = new Date().toISOString();

  const resume = currentResume
    ? {
        ...currentResume,
        title: state.title || currentResume.title,
        targetRole,
        mode: input.mode,
        status: "final" as const,
        content,
        score: audit.score,
        audit,
        jobDescription: state.target.jobDescription || currentResume.jobDescription,
        version: currentResume.version + (input.mode === "build" ? 0 : 1),
        updatedAt: now,
      }
    : createResumeRecord({
        mode: input.mode,
        targetRole: targetRole || "Target Role",
        content,
        title: state.title || `${targetRole || "CareerPath"} Resume`,
      });

  resume.userId = input.userId;
  resume.audit = audit;
  resume.score = audit.score;
  if (brain.matchedKeywords || brain.missingKeywords) {
    resume.tailoring = {
      matchScore: audit.score.roleAlignment,
      matchedKeywords: brain.matchedKeywords || [],
      safeKeywordsAdded: [],
      missingKeywordsNotAdded: brain.missingKeywords || [],
      tailoringSummary: ["Reordered supported resume facts toward the job description without adding unsupported keywords."],
      tailoredResume: content,
    };
  }
  decorateResumeForCareerOS(resume, input.message, { versionType: input.mode === "tailor" ? "job_specific" : "master" });
  return resume;
}

function decorateResumeForCareerOS(
  resume: CareerPathResume,
  rawInput?: string,
  options?: { versionType?: "master" | "job_specific" },
) {
  const profile = resume.careerProfile || legacyProfileToCareerProfile(resume.profile, resume.userId, rawInput);
  resume.careerProfile = profile;
  resume.resumeDocument = createResumeDocumentFromResume(resume, profile, options?.versionType || (resume.jobDescription ? "job_specific" : "master"));
  resume.jobSearchInsights = resume.jobSearchInsights || analyzeJobSearchPerformance(resume.applications || [], [resume.resumeDocument]);
  const mining = mineAchievements(profile);
  if (mining.suggestedAchievements.length) {
    resume.careerProfile.achievements = [
      ...resume.careerProfile.achievements,
      ...mining.suggestedAchievements.filter((item) => !resume.careerProfile!.achievements.some((existing) => existing.text === item.text)),
    ].slice(0, 12);
  }
}
