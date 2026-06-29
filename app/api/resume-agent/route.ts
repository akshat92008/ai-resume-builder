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
  writeResumeAgent,
  improveResumeAgent,
  tailorResumeAgent,
} from "@/lib/careerpath/orchestrator";
import {
  createResumeRecord,
  emptyCareerPathProfile,
  extractProfileData,
  auditResume,
} from "@/lib/careerpath/agents";
import { mergeResumeContent } from "@/lib/careerpath/types";
import type { AgentIntent, CareerPathResume, CareerPathResumeContent } from "@/lib/careerpath/types";

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

    // Infer intent
    let intent: AgentIntent;
    
    if (message.length > 500) {
      // Fast path: bypass LLM intent inference for massive text blocks
      const { inferIntentKeyword } = await import("@/lib/careerpath/orchestrator");
      intent = inferIntentKeyword(message, !!currentResume).intent;
    } else {
      const result = await inferIntentLLM(message, !!currentResume, { userId, resumeId });
      intent = result.intent;
    }

    // Process based on intent
    const result = await processIntent(intent, message, currentResume, userId, resumeId);

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
): Promise<{
  assistantMessage: string;
  resume: CareerPathResume | null;
  resumeId: string | null;
  missingFields?: string[];
  versionCreated?: boolean;
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

    case "ASK_MISSING_INFO":
      return {
        assistantMessage: "What information would you like to provide? You can share your education, skills, projects, experience, or any career details.",
        resume: currentResume,
        resumeId: currentResume?.id || null,
      };

    case "GENERATE_PDF":
      return {
        assistantMessage: "To download your resume as PDF, click the **Download PDF** button in the top bar. It will open a print dialog where you can save it as a PDF file.",
        resume: currentResume,
        resumeId: currentResume?.id || null,
      };

    case "GENERAL_HELP":
      return {
        assistantMessage: `Here's what I can do:\n\n• **Build a resume** — Paste your skills, projects, education, experience and I'll create an ATS-friendly resume.\n• **Improve your resume** — Say "improve this" or "make it ATS friendly" to strengthen your current resume.\n• **Tailor to a job** — Paste a job description and say "tailor this resume to this job."\n• **Add information** — "Add this project: [details]" or "Add certificate: [name]."\n• **Rewrite a section** — "Rewrite my summary" or "Make project bullets stronger."\n• **Download PDF** — Click the Download PDF button to export.\n\nJust type naturally and I'll figure out what you need.`,
        resume: currentResume,
        resumeId: currentResume?.id || null,
      };

    default:
      return {
        assistantMessage: "I'm not sure what you'd like me to do. Try saying something like 'Build my resume' or 'Improve this resume.'",
        resume: currentResume,
        resumeId: currentResume?.id || null,
      };
  }
}

async function handleCreateResume(
  message: string,
  userId: string,
  metadata: { userId: string; resumeId?: string },
) {
  // Extract profile from message using regex/sync (Instant)
  const profile = emptyCareerPathProfile();
  profile.userId = userId;

  const extractedProfile = extractProfileData(message, profile, profile.target.role);
  // Ensure the LLM knows to look at the raw notes for context
  extractedProfile.rawNotes = message;

  // Build resume
  const content = await writeResumeAgent(extractedProfile, "build", "", metadata);

  const resume = createResumeRecord({
    mode: "build",
    targetRole: extractedProfile.target.role || "Target Role",
    content,
    profile: extractedProfile,
    title: `${extractedProfile.target.role || "CareerPath"} Resume`,
  });
  resume.userId = userId;

  await saveServerResume(resume);

  const score = resume.score?.overall ?? 0;
  const fixes = resume.audit?.recommendedFixes?.slice(0, 2).join(" ") || "";

  return {
    assistantMessage: `Your resume is ready! Score: ${score}/100. ${fixes}\n\nYou can now say things like "Add a project", "Improve this", "Tailor to a job description", or "Rewrite my summary".`,
    resume,
    resumeId: resume.id,
  };
}

async function handleImproveResume(
  message: string,
  currentResume: CareerPathResume | null,
  userId: string,
  metadata: { userId: string; resumeId?: string },
) {
  if (!currentResume) {
    // If no resume, try to create one from the pasted text
    if (message.length > 100) {
      return handleCreateResume(message, userId, metadata);
    }
    return {
      assistantMessage: "I don't have a resume to improve yet. Paste your resume text or career details and I'll build one first.",
      resume: null,
      resumeId: null,
      missingFields: ["resume content"],
    };
  }

  // Save version before improving
  await saveResumeVersion({
    userId,
    resumeId: currentResume.id,
    versionName: `Before improvement v${currentResume.version}`,
    resumeJson: currentResume.content,
    reason: "Pre-improvement snapshot",
  });

  // Skip the initial audit to prevent Vercel 60s timeout
  const genericAudit: any = {
    score: { overall: 50 },
    issues: [{ type: "general", section: "all", message: "Make the resume more professional, concise, and ATS-friendly.", severity: "medium" }],
    recommendedFixes: ["Strengthen action verbs and metrics."],
    summary: "Generic improvement requested."
  };

  const improved = await improveResumeAgent(
    currentResume.content,
    genericAudit,
    currentResume.targetRole,
    metadata,
  );

  const finalAudit = auditResume(
    improved,
    currentResume.targetRole,
    currentResume.jobDescription || ""
  );

  const updatedResume: CareerPathResume = {
    ...currentResume,
    content: improved,
    audit: finalAudit,
    score: finalAudit.score,
    version: currentResume.version + 1,
    updatedAt: new Date().toISOString(),
  };

  await saveServerResume(updatedResume);

  const scoreDelta = (finalAudit.score?.overall ?? 0) - (currentResume.score?.overall ?? 0);
  const deltaText = scoreDelta > 0 ? ` (+${scoreDelta} points)` : "";

  return {
    assistantMessage: `Resume improved! New score: ${finalAudit.score?.overall ?? 0}/100${deltaText}. I strengthened bullets, tightened the summary, and improved ATS alignment without adding fake claims.`,
    resume: updatedResume,
    resumeId: updatedResume.id,
    versionCreated: true,
  };
}

async function handleTailorToJob(
  message: string,
  currentResume: CareerPathResume | null,
  userId: string,
  metadata: { userId: string; resumeId?: string },
) {
  if (!currentResume) {
    return {
      assistantMessage: "I need a resume to tailor. Please build a resume first by pasting your career details, then share the job description.",
      resume: null,
      resumeId: null,
      missingFields: ["resume"],
    };
  }

  // Save version before tailoring
  await saveResumeVersion({
    userId,
    resumeId: currentResume.id,
    versionName: `Before tailoring v${currentResume.version}`,
    resumeJson: currentResume.content,
    reason: "Pre-tailoring snapshot",
  });

  const tailoring = await tailorResumeAgent(
    currentResume.content,
    currentResume.targetRole,
    message,
    metadata,
  );

  const finalAudit = auditResume(
    tailoring.tailoredResume,
    currentResume.targetRole,
    message
  );

  const updatedResume: CareerPathResume = {
    ...currentResume,
    content: tailoring.tailoredResume,
    tailoring,
    jobDescription: message,
    audit: finalAudit,
    score: finalAudit.score,
    version: currentResume.version + 1,
    updatedAt: new Date().toISOString(),
  };

  await saveServerResume(updatedResume);

  const matchInfo = tailoring.missingKeywordsNotAdded.length
    ? `\n\nSkills I left out (not in your background): ${tailoring.missingKeywordsNotAdded.slice(0, 5).join(", ")}.`
    : "";

  return {
    assistantMessage: `Resume tailored! Match score: ${tailoring.matchScore}/100. I reordered skills, rewrote the summary, and aligned bullets to the job description — only using skills you actually have.${matchInfo}`,
    resume: updatedResume,
    resumeId: updatedResume.id,
    versionCreated: true,
  };
}

async function handleAddInformation(
  message: string,
  currentResume: CareerPathResume | null,
  userId: string,
  metadata: { userId: string; resumeId?: string },
) {
  if (!currentResume) {
    // No resume — just create one from the info
    return handleCreateResume(message, userId, metadata);
  }

  // Extract new profile data from message, using current resume content as base
  const baseProfile = emptyCareerPathProfile(currentResume.targetRole);
  baseProfile.userId = userId;

  // Parse current resume back to profile shape for merging
  const extractedNew = extractProfileData(message, baseProfile, currentResume.targetRole);

  // Generate updated resume by re-writing with merged info
  const updatedContent = await writeResumeAgent(
    extractedNew,
    currentResume.mode,
    currentResume.jobDescription || "",
    metadata,
  );

  // Merge — preserve existing content and add new content
  const merged = mergeResumeContent(currentResume.content, updatedContent);

  const audit = auditResume(
    merged,
    currentResume.targetRole,
    currentResume.jobDescription || ""
  );

  const updatedResume: CareerPathResume = {
    ...currentResume,
    content: merged,
    audit,
    score: audit.score,
    updatedAt: new Date().toISOString(),
  };

  await saveServerResume(updatedResume);

  return {
    assistantMessage: `Information added! I've updated your resume preview. Score: ${audit.score?.overall ?? 0}/100. Previous content is preserved.`,
    resume: updatedResume,
    resumeId: updatedResume.id,
  };
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

  // Skip the initial audit to save time
  // Add the user's instruction as an issue to focus the improvement
  const customAudit: any = {
    score: { overall: 50 },
    issues: [
      { type: "user_request", section: "User Request", message, severity: "high" },
    ],
    recommendedFixes: [message],
    summary: "User requested a specific section rewrite."
  };

  const improved = await improveResumeAgent(
    currentResume.content,
    customAudit,
    currentResume.targetRole,
    metadata,
  );

  const finalAudit = auditResume(
    improved,
    currentResume.targetRole,
    currentResume.jobDescription || ""
  );

  const updatedResume: CareerPathResume = {
    ...currentResume,
    content: improved,
    audit: finalAudit,
    score: finalAudit.score,
    updatedAt: new Date().toISOString(),
  };

  await saveServerResume(updatedResume);

  return {
    assistantMessage: `Section updated! Score: ${finalAudit.score?.overall ?? 0}/100. Check the preview — I applied your changes while keeping everything else intact.`,
    resume: updatedResume,
    resumeId: updatedResume.id,
  };
}
