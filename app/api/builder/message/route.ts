import { NextResponse } from "next/server";

export const maxDuration = 60; // Max allowed for Vercel Hobby plan


import { createResumeRecord } from "@/lib/careerpath/agents";
import { getSession, saveServerResume, saveSession, getSupabaseUser } from "@/lib/careerpath/db";
import type { BuilderSession, CareerPathResume } from "@/lib/careerpath/types";
import { createId } from "@/lib/careerpath/agents";
import { checkRateLimit } from "@/lib/careerpath/rate-limit";
import { z } from "zod";
import {
  inferIntentAgent,
  extractProfileDataAgent,
  detectGapsAgent,
  writeResumeAgent,
  auditResumeAgent,
  improveResumeAgent,
  tailorResumeAgent,
} from "@/lib/careerpath/orchestrator";

import { requireAiAccess } from "@/lib/careerpath/auth";

const MessageRequestSchema = z.object({
  sessionId: z.string().uuid(),
  message: z.string().max(20000),
});

export async function POST(request: Request) {
  try {
    const auth = await requireAiAccess();
    if (!auth.ok) return auth.response;

    const json = await request.json().catch(() => ({}));
    const parseResult = MessageRequestSchema.safeParse(json);
    
    if (!parseResult.success) {
      return NextResponse.json(
        { error: { code: "INVALID_INPUT", message: "Invalid payload or size exceeded.", recoverable: true } },
        { status: 400 },
      );
    }
    const body = parseResult.data;

    const ipHash = request.headers.get("x-forwarded-for") || "unknown";
    const rateLimit = await checkRateLimit(auth.user?.id || null, ipHash, "builder_message", 15);
    
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: { code: "RATE_LIMIT_EXCEEDED", message: "Usage limit exceeded.", recoverable: true } },
        { status: 429 },
      );
    }

    const session = await getSession(body.sessionId);
    if (!session) {
      return NextResponse.json(
        { error: { code: "SESSION_NOT_FOUND", message: "Builder session not found.", recoverable: true } },
        { status: 404 },
      );
    }

    const userMessage = body.message.trim();
    session.messages.push({
      id: createId(),
      role: "user",
      content: userMessage,
      createdAt: new Date().toISOString(),
    });

    const response = await runSessionTurn(session, userMessage, auth.user?.id);
    await saveSession(response.session);

    if (response.resume) await saveServerResume(response.resume);

    return NextResponse.json({
      sessionId: response.session.id,
      assistantMessage: response.assistantMessage,
      state: response.session.currentStep,
      resumeId: response.resume?.id ?? response.session.resumeId,
      resume: response.resume,
      session: response.session,
    });
  } catch (err) {
    console.error("[builder/message] Error:", err);
    return NextResponse.json(
      {
        error: {
          code: "INTERNAL_ERROR",
          message: "Something went wrong generating your resume. Your data is saved. Try again.",
          recoverable: true,
        },
      },
      { status: 500 },
    );
  }
}

async function runSessionTurn(session: BuilderSession, userMessage: string, userId?: string): Promise<{
  session: BuilderSession;
  assistantMessage: string;
  resume?: CareerPathResume;
}> {
  if (session.currentStep === "collect_goal") {
    const intent = inferIntentAgent(userMessage);
    session.targetRole = intent.targetRole || userMessage.replace(/[.?!]/g, "").trim();
    session.profile.target.role = session.targetRole;
    session.profile.target.industry = session.profile.target.industry || "Software";
    session.currentStep = session.mode === "tailor" ? "collect_profile" : "collect_profile";
    const assistantMessage =
      session.mode === "tailor"
        ? "Great. Paste your current resume text first. After that I will ask for the job description."
        : "Paste your details. Messy is fine. Include education, skills, projects, certificates, experience, links, or anything you remember.";
    session.messages.push(systemMessage(assistantMessage));
    return { session, assistantMessage };
  }

  if (session.mode === "tailor" && session.currentStep === "collect_profile") {
    session.profile = await extractProfileDataAgent(userMessage, session.profile, session.targetRole, { userId, sessionId: session.id, resumeId: session.resumeId });
    session.currentStep = "collect_job";
    const assistantMessage = "Now paste the job description. I will only tailor with skills and claims supported by your resume.";
    session.messages.push(systemMessage(assistantMessage));
    return { session, assistantMessage };
  }

  if (session.mode === "tailor" && session.currentStep === "collect_job") {
    const resume = await generateFinalResume(session, userMessage, userId);
    session.currentStep = "generated";
    session.resumeId = resume.id;
    const assistantMessage = `Your tailored resume is ready. Match score: ${resume.tailoring?.matchScore ?? resume.score?.overall ?? 0}/100. I left unsupported job keywords out instead of inventing them.`;
    session.messages.push(systemMessage(assistantMessage));
    return { session, assistantMessage, resume };
  }

  session.profile = await extractProfileDataAgent(userMessage, session.profile, session.targetRole, { userId, sessionId: session.id, resumeId: session.resumeId });
  if (!session.targetRole && session.profile.target.role) {
    session.targetRole = session.profile.target.role;
  }

  const hasAlreadyAskedQuestions = session.currentStep === "needs_info";

  if (!hasAlreadyAskedQuestions) {
    const gapReport = await detectGapsAgent(session.profile, session.mode, { userId, sessionId: session.id, resumeId: session.resumeId });
    if (gapReport.questionsToAsk.length) {
      session.currentStep = "needs_info";
      session.missingQuestions = gapReport.questionsToAsk;
      const assistantMessage = [
        session.mode === "improve" && gapReport.questionsToAsk.length === 1 && gapReport.questionsToAsk[0].question.includes("optimize")
          ? ""
          : `I found ${foundSummary(session)}. I need ${gapReport.questionsToAsk.length} missing detail${gapReport.questionsToAsk.length > 1 ? "s" : ""} to make this stronger:`,
        ...gapReport.questionsToAsk.map((question, index) => gapReport.questionsToAsk.length === 1 ? question.question : `${index + 1}. ${question.question}`),
        session.mode === "improve" ? "You can skip if you want to keep it general." : "You can answer messily or skip anything you do not know.",
      ].filter(Boolean).join("\n");
      session.messages.push(systemMessage(assistantMessage));
      return { session, assistantMessage };
    }
  }

  const resume = await generateFinalResume(session, "", userId);
  session.currentStep = "generated";
  session.resumeId = resume.id;
  const assistantMessage = `Your resume is ready! Use the "Gap analysis for my target role" or "Show ATS view" buttons to get feedback.`;
  session.messages.push(systemMessage(assistantMessage));
  return { session, assistantMessage, resume };
}

async function generateFinalResume(session: BuilderSession, jobDescription = "", userId?: string) {
  const metadata = { userId, sessionId: session.id, resumeId: session.resumeId };
  const draft = await writeResumeAgent(session.profile, session.mode, jobDescription, metadata);
  
  const resume = createResumeRecord({
    mode: session.mode,
    targetRole: session.targetRole,
    content: draft,
    profile: session.profile,
    jobDescription,
    title: `${session.targetRole || "CareerPath"} Resume`,
  });

  if (session.mode === "tailor") {
    const tailoring = await tailorResumeAgent(resume.content, session.targetRole, jobDescription, metadata);
    resume.content = tailoring.tailoredResume;
    resume.tailoring = tailoring;
    // Skip synchronous audit to prevent Vercel timeout
  } else {
    // Skip synchronous audit to prevent Vercel timeout
  }

  return resume;
}

function foundSummary(session: BuilderSession) {
  const parts = [
    session.profile.education.length ? `${session.profile.education.length} education item${session.profile.education.length > 1 ? "s" : ""}` : "",
    session.profile.projects.length ? `${session.profile.projects.length} project${session.profile.projects.length > 1 ? "s" : ""}` : "",
    Object.values(session.profile.skills).flat().length ? `${Object.values(session.profile.skills).flat().length} skill${Object.values(session.profile.skills).flat().length > 1 ? "s" : ""}` : "",
    session.profile.certifications.length ? `${session.profile.certifications.length} certificate${session.profile.certifications.length > 1 ? "s" : ""}` : "",
  ].filter(Boolean);
  return parts.length ? parts.join(", ") : "a starting point";
}

function systemMessage(content: string) {
  return {
    id: createId(),
    role: "assistant" as const,
    content,
    createdAt: new Date().toISOString(),
  };
}
