import { NextResponse } from "next/server";

export const maxDuration = 60;

import { auditResume, createId, createResumeRecord } from "@/lib/careerpath/agents";
import { getSession, saveServerResume, saveSession } from "@/lib/careerpath/db";
import type { BuilderSession, CareerPathResume } from "@/lib/careerpath/types";
import { checkAiActionRateLimit } from "@/lib/careerpath/rate-limit";
import { getCurrentUserEntitlements } from "@/lib/careerpath/entitlements";
import { getClientIp, readJsonLimited } from "@/lib/http/request";
import { logger } from "@/lib/observability/logger";
import { z } from "zod";
import {
  inferIntentAgent,
  extractProfileDataAgent,
  detectGapsAgent,
  writeResumeAgent,
  tailorResumeAgent,
} from "@/lib/careerpath/orchestrator";
import { requireAiAccess } from "@/lib/careerpath/auth";

const MessageRequestSchema = z.object({
  sessionId: z.string().uuid(),
  message: z.string().trim().min(1).max(20_000),
}).strict();

export async function POST(request: Request) {
  try {
    const auth = await requireAiAccess();
    if (!auth.ok) return auth.response;

    const parsedBody = await readJsonLimited(request, 30_000, MessageRequestSchema);
    if (!parsedBody.ok) {
      const status = parsedBody.code === "PAYLOAD_TOO_LARGE" ? 413 : 400;
      return NextResponse.json(
        { error: { code: parsedBody.code, message: "Invalid builder request.", recoverable: true } },
        { status },
      );
    }
    const body = parsedBody.data;

    const ipHash = getClientIp(request);
    const entitlements = await getCurrentUserEntitlements();
    const rateLimit = await checkAiActionRateLimit(auth.user.id, ipHash, entitlements.aiActionsPerDay);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: { code: "RATE_LIMIT_EXCEEDED", message: "Usage limit exceeded.", recoverable: true } },
        { status: 429 },
      );
    }

    const session = await getSession(body.sessionId);
    if (!session || session.userId !== auth.user.id) {
      return NextResponse.json(
        { error: { code: "SESSION_NOT_FOUND", message: "Builder session not found.", recoverable: true } },
        { status: 404 },
      );
    }

    const userMessage = body.message;
    session.messages.push({
      id: createId(),
      role: "user",
      content: userMessage,
      createdAt: new Date().toISOString(),
    });

    const response = await runSessionTurn(session, userMessage, auth.user.id);
    response.session.userId = auth.user.id;
    await saveSession(response.session);

    if (response.resume) await saveServerResume(response.resume, auth.user.id);

    return NextResponse.json({
      sessionId: response.session.id,
      assistantMessage: response.assistantMessage,
      state: response.session.currentStep,
      resumeId: response.resume?.id ?? response.session.resumeId,
      resume: response.resume,
      session: response.session,
    });
  } catch (err) {
    logger.error("[builder/message] Error", { error: err });
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
    session.currentStep = "collect_profile";
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
  if (!session.targetRole && session.profile.target.role) session.targetRole = session.profile.target.role;

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
  const assistantMessage = "Your resume is ready and has passed the built-in audit. Use the Gap analysis or ATS view for additional feedback.";
  session.messages.push(systemMessage(assistantMessage));
  return { session, assistantMessage, resume };
}

async function generateFinalResume(session: BuilderSession, jobDescription = "", userId?: string) {
  const metadata = { userId, sessionId: session.id, resumeId: session.resumeId };
  const draft = await writeResumeAgent(session.profile, session.mode, jobDescription, metadata);

  const resume = createResumeRecord({
    userId: userId || session.userId,
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
  }

  const audit = auditResume(resume.content, session.targetRole, jobDescription);
  resume.audit = audit;
  resume.score = audit.score;
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
