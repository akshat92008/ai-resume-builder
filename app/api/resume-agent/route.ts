import { NextResponse } from "next/server";

export const maxDuration = 60; // Max allowed for Vercel Hobby plan

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
  extractProfileDataAgent,
  detectGapsAgent,
  writeResumeAgent,
  auditResumeAgent,
  improveResumeAgent,
  tailorResumeAgent,
  starInterviewAgent,
  humanizeResumeAgent,
  estimateImpactAgent,
  analyzeCareerGapAgent,
  generatePersonaResumesAgent,
  generateATSViewAgent,
  generateOutreachAgent,
} from "@/lib/careerpath/orchestrator";
import { validateResumeTruthfulness } from "@/lib/resume/validator";
import {
  createResumeRecord,
  auditResume,
  tailorResume,
} from "@/lib/careerpath/agents";
import {
  analyzeJobSearchPerformance,
  applyAchievementLog,
  buildCareerWorkspaceState,
  createJobApplicationFromCommand,
  createResumeDocumentFromResume,
  extractJobDescription,
  generateApplicationPack,
  generateSmartResumeVersions,
  isAchievementLogInput,
  legacyProfileToCareerProfile,
  mergeCareerMemory,
  mineAchievements,
  refreshCareerProfileInsights,
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
    } else if (command.intent === "optimize_linkedin") {
      intent = "GENERAL_HELP";
    } else if (command.intent === "log_achievement" || (command.intent === "build_career_profile" && currentResume)) {
      intent = currentResume ? "ADD_INFORMATION" : "CREATE_RESUME";
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
          message: `Something went wrong: ${err instanceof Error ? err.message : String(err)}. Please try again.`,
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

    // Differentiation Features
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

    case "GENERAL_HELP":
      if (_command && typeof _command === "object" && "intent" in _command && (_command as { intent?: string }).intent === "optimize_linkedin") {
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
      return {
        assistantMessage: `CareerPath AI V1 is built around Career Memory.\n\nPaste career notes once, then I can generate resumes, tailor to job descriptions, run ATS audits, improve weak bullets, write cover letters, optimize LinkedIn sections, track applications, coach your next steps, and log new achievements as they happen.`,
        resume: currentResume,
        resumeId: currentResume?.id || null,
        workspace: buildCareerWorkspaceState(currentResume),
      };

    default:
      return {
        assistantMessage: "Tell me what to store or generate: build Career Memory, tailor to a job description, audit the resume, write a cover letter, optimize LinkedIn, track an application, or log a new achievement.",
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
    assistantMessage: `Application pack ready for ${job.title || resume.targetRole}. I generated a tailored resume, cover letter, recruiter DM, cold email, LinkedIn message, why-fit answer, and follow-up message.`,
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
  let legacyProfile = input.currentResume?.profile || ({} as any);
  const existingCareerProfile = input.currentResume?.careerProfile
    ? refreshCareerProfileInsights(input.currentResume.careerProfile)
    : null;
  let profile = existingCareerProfile || legacyProfileToCareerProfile(legacyProfile, input.userId, input.message);
  let achievementLogResult: ReturnType<typeof applyAchievementLog>["result"] | null = null;
  let assistantMessage = "";
  
  if (input.mode === "build") {
    legacyProfile = await extractProfileDataAgent(input.message, legacyProfile, input.currentResume?.targetRole || "", input.metadata);
    let gaps = { readyToGenerate: true, questionsToAsk: [] as any[], criticalMissing: [] as string[] };
    if (input.message.length < 50) {
      gaps = await detectGapsAgent(legacyProfile, input.mode, input.metadata);
    }
    if (!gaps.readyToGenerate && gaps.questionsToAsk.length > 0) {
      return {
        assistantMessage: `I need a few details first:\n\n${gaps.questionsToAsk.map((q: any, i: number) => `${i + 1}. ${q.question}`).join('\n')}`,
        resume: input.currentResume,
        resumeId: input.currentResume?.id || null,
        missingFields: gaps.criticalMissing,
        workspace: buildCareerWorkspaceState(input.currentResume),
      };
    }
    const extractedCareerProfile = legacyProfileToCareerProfile(legacyProfile, input.userId, input.message);
    profile = mergeCareerMemory(existingCareerProfile, extractedCareerProfile);
    if (isAchievementLogInput(input.message)) {
      const logged = applyAchievementLog(profile, input.message);
      profile = logged.profile;
      achievementLogResult = logged.result;
    }
    assistantMessage = input.currentResume
      ? "Updated Career Memory and refreshed the resume from the latest information."
      : "Created a first resume draft and saved the details to Career Memory.";
  }

  let content: any;
  let tailoringResult = null;
  let missingKeywords: string[] = [];
  let matchedKeywords: string[] = [];
  
  if (input.mode === "tailor" && input.currentResume) {
    const jobDesc = input.message;
    tailoringResult = await tailorResumeAgent(input.currentResume.content, input.currentResume.targetRole || "", jobDesc, input.metadata);
    content = tailoringResult.tailoredResume;
    missingKeywords = tailoringResult.missingKeywordsNotAdded;
    matchedKeywords = tailoringResult.matchedKeywords;
    assistantMessage = `Tailored the resume toward the job. Matched: ${matchedKeywords.join(", ") || "none yet"}. Missing from your resume: ${missingKeywords.join(", ") || "none detected"}. I did not add missing skills without confirmation.`;
  } else if (input.mode === "improve" && input.currentResume) {
    const audit = await auditResumeAgent(input.currentResume.content, input.currentResume.targetRole || "", input.currentResume.jobDescription || "", input.metadata);
    content = await improveResumeAgent(input.currentResume.content, audit, input.currentResume.targetRole || "", input.metadata);
    assistantMessage = "Improved the wording and formatting while preserving your original details.";
  } else {
    content = await writeResumeAgent(legacyProfile, input.mode, input.currentResume?.jobDescription || "", input.metadata);
    if (!assistantMessage) assistantMessage = "Created a new resume based on your profile.";
  }

  const beforeState = input.currentResume ? contentToResumeState(input.currentResume.content, { id: input.currentResume.id, targetRole: input.currentResume.targetRole }) : null;
  const afterState = contentToResumeState(content, { id: input.currentResume?.id || "new", targetRole: input.currentResume?.targetRole });
  
  const validationMode = input.mode === "tailor" ? "TAILOR_TO_JOB" : input.mode === "improve" ? "IMPROVE_EXISTING_RESUME" : "BUILD_FROM_DATA";
  const validated = validateResumeTruthfulness(beforeState, afterState, input.message, { type: validationMode, confidence: 1, reason: "LLM Orchestrator" } as any);
  
  content = deriveRenderableResume(validated.cleanedResume);
  
  const targetRole = input.currentResume?.targetRole || profile.target?.targetRoles?.[0] || "Target Role";
  
  const audit = input.mode === "build"
    ? {
        score: { overall: 85, atsCompatibility: 90, roleAlignment: 80, keywordCoverage: 80, bulletStrength: 85, clarity: 90, proofAndMetrics: 70, onePageFit: 100, formattingSafety: 100, truthfulness: 100 },
        issues: [{ type: "INFO", section: "general", message: "Initial draft generated. Click 'Improve' to refine and score.", severity: "low" as const }],
        recommendedFixes: ["Review the generated draft and add any missing details."],
        summary: "Initial draft generated."
      }
    : await auditResumeAgent(content, targetRole, input.currentResume?.jobDescription || "", input.metadata);

  const now = new Date().toISOString();

  const nextResume = input.currentResume
    ? {
        ...input.currentResume,
        title: validated.cleanedResume.title || input.currentResume.title,
        targetRole,
        mode: input.mode,
        status: "final" as const,
        content,
        score: audit.score,
        audit,
        jobDescription: validated.cleanedResume.target.jobDescription || input.currentResume.jobDescription,
        version: input.currentResume.version + (input.mode === "build" ? 0 : 1),
        updatedAt: now,
      }
    : createResumeRecord({
        mode: input.mode,
        targetRole,
        content,
        title: validated.cleanedResume.title || `${targetRole || "CareerPath"} Resume`,
      });

  nextResume.userId = input.userId;
  nextResume.profile = legacyProfile;
  nextResume.careerProfile = profile;
  
  if (tailoringResult) {
    nextResume.tailoring = tailoringResult;
  }
  
  decorateResumeForCareerOS(nextResume, input.message, { versionType: input.mode === "tailor" ? "job_specific" : "master" });
  await saveServerResume(nextResume);

  return {
    assistantMessage: achievementLogResult
      ? `${assistantMessage}\n\nLogged achievement: ${achievementLogResult.achievement.text}\nSuggested bullet: ${achievementLogResult.suggestedResumeBullet}`
      : assistantMessage,
    resume: nextResume,
    resumeId: nextResume.id,
    versionCreated: input.versionCreated,
    workspace: buildCareerWorkspaceState(nextResume, input.message),
  };
}

function decorateResumeForCareerOS(
  resume: CareerPathResume,
  rawInput?: string,
  options?: { versionType?: "master" | "job_specific" },
) {
  const profile = refreshCareerProfileInsights(resume.careerProfile || legacyProfileToCareerProfile(resume.profile, resume.userId, rawInput));
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

// ---------------------------------------------------------------------------
// Differentiation Feature Handlers
// ---------------------------------------------------------------------------

async function handleStarInterview(
  currentResume: CareerPathResume | null,
  userId: string,
  metadata: { userId: string; resumeId?: string },
) {
  if (!currentResume) {
    return {
      assistantMessage: "Build a resume first, then I can interview you to extract the hidden value behind your experience and projects.",
      resume: null,
      resumeId: null,
      workspace: buildCareerWorkspaceState(null),
    };
  }
  const profile = currentResume.careerProfile || legacyProfileToCareerProfile(currentResume.profile, userId);
  const result = await starInterviewAgent(profile, currentResume.content, currentResume.targetRole, metadata);
  currentResume.starInterview = result;
  currentResume.updatedAt = new Date().toISOString();
  await saveServerResume(currentResume);

  const questionList = result.questions.map((q, i) => `${i + 1}. **${q.question}**\n   _(${q.context})_`).join("\n\n");
  return {
    assistantMessage: `${result.summary}\n\nAnswer any of these to strengthen your resume:\n\n${questionList}\n\nJust answer in plain language — I'll extract the key points and update your bullets.`,
    resume: currentResume,
    resumeId: currentResume.id,
    workspace: buildCareerWorkspaceState(currentResume),
  };
}

async function handleHumanizeResume(
  currentResume: CareerPathResume | null,
  userId: string,
  metadata: { userId: string; resumeId?: string },
) {
  if (!currentResume) {
    return {
      assistantMessage: "Build a resume first, then I can strip out AI-speak and make it sound genuinely human.",
      resume: null,
      resumeId: null,
      workspace: buildCareerWorkspaceState(null),
    };
  }
  await saveResumeVersion({
    userId,
    resumeId: currentResume.id,
    versionName: `Before humanize v${currentResume.version}`,
    resumeJson: currentResume.content,
    reason: "Pre-humanize snapshot",
  });

  const result = await humanizeResumeAgent(currentResume.content, currentResume.targetRole, metadata);
  currentResume.humanizedResume = result;
  currentResume.content = result.content;
  currentResume.version += 1;
  currentResume.updatedAt = new Date().toISOString();
  await saveServerResume(currentResume);

  const changeCount = result.changes.length;
  const clicheList = result.clisheesRemoved.slice(0, 6).join(", ");
  return {
    assistantMessage: `Humanized ✓ — made ${changeCount} change${changeCount !== 1 ? "s" : ""}. Removed AI clichés: ${clicheList || "none found"}.\n\n${result.summary}\n\nYour resume now sounds like it was written by a human, not an AI.`,
    resume: currentResume,
    resumeId: currentResume.id,
    versionCreated: true,
    workspace: buildCareerWorkspaceState(currentResume),
  };
}

async function handleEstimateImpact(
  currentResume: CareerPathResume | null,
  userId: string,
  metadata: { userId: string; resumeId?: string },
) {
  if (!currentResume) {
    return {
      assistantMessage: "Build a resume first, then I can analyze your bullets and suggest safe, verifiable metrics.",
      resume: null,
      resumeId: null,
      workspace: buildCareerWorkspaceState(null),
    };
  }
  const profile = currentResume.careerProfile || legacyProfileToCareerProfile(currentResume.profile, userId);
  const result = await estimateImpactAgent(profile, currentResume.content, currentResume.targetRole, metadata);
  currentResume.impactEstimates = result;
  currentResume.updatedAt = new Date().toISOString();
  await saveServerResume(currentResume);

  if (!result.suggestions.length) {
    return {
      assistantMessage: "Your bullets already have good quantitative proof. No weak metrics detected that need estimation.",
      resume: currentResume,
      resumeId: currentResume.id,
      workspace: buildCareerWorkspaceState(currentResume),
    };
  }

  const suggestionList = result.suggestions.slice(0, 4).map((s, i) =>
    `${i + 1}. **${s.itemName}** (${s.section})\n   Original: _"${s.bulletText.slice(0, 80)}..."_\n   Suggested: "${s.improvedBullet}"\n   Confidence: ${s.confidence} — ${s.rationale}`
  ).join("\n\n");

  return {
    assistantMessage: `Found ${result.suggestions.length} bullet${result.suggestions.length !== 1 ? "s" : ""} that could use metrics. Here are conservative estimates you can verify:\n\n${suggestionList}\n\nCheck the **Impact Estimator** tab to accept or reject each suggestion.`,
    resume: currentResume,
    resumeId: currentResume.id,
    workspace: buildCareerWorkspaceState(currentResume),
  };
}

async function handleGapAnalysis(
  message: string,
  currentResume: CareerPathResume | null,
  userId: string,
  metadata: { userId: string; resumeId?: string },
) {
  if (!currentResume) {
    return {
      assistantMessage: "Build a resume first, then say 'gap analysis for [target role]' to see how close you are and what to build next.",
      resume: null,
      resumeId: null,
      workspace: buildCareerWorkspaceState(null),
    };
  }
  const profile = currentResume.careerProfile || legacyProfileToCareerProfile(currentResume.profile, userId);
  const targetRole = message.match(/gap analysis(?:\s+for)?\s+(.{3,80})/i)?.[1]?.trim() || currentResume.targetRole;
  const result = await analyzeCareerGapAgent(profile, targetRole, metadata);
  currentResume.gapAnalysis = result;
  currentResume.updatedAt = new Date().toISOString();
  await saveServerResume(currentResume);

  const gapList = result.gaps.slice(0, 4).map(g => `• **${g.skill}** (${g.importance}) — ${g.evidence}${g.projectIdea ? `\n  _Project idea: ${g.projectIdea}_` : ""}`).join("\n");
  const status = result.readyToApply ? "✅ **Ready to apply**" : "🔧 **Focus on building proof first**";

  return {
    assistantMessage: `**Gap Analysis for ${targetRole}**\n\nMatch score: **${result.matchScore}/100** — ${status}\n\n${result.summary}\n\n**Gaps to address:**\n${gapList}\n\nCheck the **Gap Analysis** tab for the full breakdown and project ideas.`,
    resume: currentResume,
    resumeId: currentResume.id,
    workspace: buildCareerWorkspaceState(currentResume),
  };
}

async function handleMultiPersona(
  currentResume: CareerPathResume | null,
  userId: string,
  metadata: { userId: string; resumeId?: string },
) {
  if (!currentResume) {
    return {
      assistantMessage: "Build a master resume first, then I can generate 3 distinctly positioned versions targeting different roles.",
      resume: null,
      resumeId: null,
      workspace: buildCareerWorkspaceState(null),
    };
  }
  const profile = currentResume.careerProfile || legacyProfileToCareerProfile(currentResume.profile, userId);
  const result = await generatePersonaResumesAgent(profile, currentResume.content, metadata);
  currentResume.multiPersona = result;
  currentResume.updatedAt = new Date().toISOString();
  await saveServerResume(currentResume);

  const personaList = result.personas.map(p => `• **${p.persona}** — ${p.whenToUse}`).join("\n");
  return {
    assistantMessage: `Generated ${result.personas.length} persona resumes from your master profile.\n\n${personaList}\n\nCheck the **Personas** tab to preview each version and save the ones you want to use.`,
    resume: currentResume,
    resumeId: currentResume.id,
    workspace: buildCareerWorkspaceState(currentResume),
  };
}

async function handleVisualizeATS(
  currentResume: CareerPathResume | null,
  userId: string,
  metadata: { userId: string; resumeId?: string },
) {
  if (!currentResume) {
    return {
      assistantMessage: "Build a resume first, then say 'show ATS view' to see exactly how a robot parses your resume.",
      resume: null,
      resumeId: null,
      workspace: buildCareerWorkspaceState(null),
    };
  }
  const result = await generateATSViewAgent(currentResume.content, currentResume.targetRole, metadata);
  currentResume.atsView = result;
  currentResume.updatedAt = new Date().toISOString();
  await saveServerResume(currentResume);

  const criticalIssues = result.criticalFailures.length;
  const statusEmoji = result.overallATSScore >= 85 ? "✅" : result.overallATSScore >= 70 ? "⚠️" : "❌";
  return {
    assistantMessage: `**ATS Compatibility: ${result.overallATSScore}/100** ${statusEmoji}\n\n${result.summary}\n\n${criticalIssues > 0 ? `**${criticalIssues} critical issue${criticalIssues !== 1 ? "s" : ""} detected:** ${result.criticalFailures.join("; ")}` : "**No critical ATS failures detected.**"}\n\nCheck the **ATS View** tab to see a full section-by-section parse breakdown.`,
    resume: currentResume,
    resumeId: currentResume.id,
    workspace: buildCareerWorkspaceState(currentResume),
  };
}

async function handleGenerateOutreach(
  message: string,
  currentResume: CareerPathResume | null,
  userId: string,
  metadata: { userId: string; resumeId?: string },
) {
  if (!currentResume) {
    return {
      assistantMessage: "Build a resume first, then paste a job description and say 'write cover letter' or 'write outreach' to generate your full application pack.",
      resume: null,
      resumeId: null,
      workspace: buildCareerWorkspaceState(null),
    };
  }
  const profile = currentResume.careerProfile || legacyProfileToCareerProfile(currentResume.profile, userId);
  const jobDescription = message.length > 100 ? message : currentResume.jobDescription || "";
  const result = await generateOutreachAgent(profile, currentResume.content, jobDescription, currentResume.targetRole, metadata);
  currentResume.outreachPack = result;
  currentResume.updatedAt = new Date().toISOString();
  await saveServerResume(currentResume);

  return {
    assistantMessage: `Outreach pack ready for **${result.jobTitle || currentResume.targetRole}** at **${result.company || "the company"}**.\n\nGenerated: Cover Letter, LinkedIn DM, Cold Email, LinkedIn Message, Why-Fit Answer, Follow-up Message, ${result.interviewQuestions.length} Interview Q&As, and a preparation plan.\n\nCheck the **Outreach** tab to copy each piece individually.`,
    resume: currentResume,
    resumeId: currentResume.id,
    workspace: buildCareerWorkspaceState(currentResume),
  };
}
