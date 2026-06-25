import { NextResponse } from "next/server";
import {
  createResumeRecord,
  detectGaps,
  extractProfileData,
  inferIntent,
  improveResume,
  tailorResume,
  writeResume,
  auditResume,
} from "@/lib/careerpath/agents";
import { getSession, saveServerResume, saveSession } from "@/lib/careerpath/server-store";
import type { BuilderSession, CareerPathResume } from "@/lib/careerpath/types";
import { createCareerPathId } from "@/lib/careerpath/agents";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as {
    sessionId?: string;
    message?: string;
  };

  if (!body.sessionId || !body.message?.trim()) {
    return NextResponse.json({ error: "sessionId and message are required." }, { status: 400 });
  }

  const session = getSession(body.sessionId);
  if (!session) {
    return NextResponse.json({ error: "Builder session not found." }, { status: 404 });
  }

  const userMessage = body.message.trim();
  session.messages.push({
    id: createCareerPathId("msg"),
    role: "user",
    content: userMessage,
    createdAt: new Date().toISOString(),
  });

  const response = runSessionTurn(session, userMessage);
  saveSession(response.session);

  if (response.resume) saveServerResume(response.resume);

  return NextResponse.json({
    sessionId: response.session.id,
    assistantMessage: response.assistantMessage,
    state: response.session.currentStep,
    resumeId: response.resume?.id ?? response.session.resumeId,
    resume: response.resume,
    session: response.session,
  });
}

function runSessionTurn(session: BuilderSession, userMessage: string): {
  session: BuilderSession;
  assistantMessage: string;
  resume?: CareerPathResume;
} {
  if (session.currentStep === "collect_goal") {
    const intent = inferIntent(userMessage);
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
    session.profile = extractProfileData(userMessage, session.profile, session.targetRole);
    session.currentStep = "collect_job";
    const assistantMessage = "Now paste the job description. I will only tailor with skills and claims supported by your resume.";
    session.messages.push(systemMessage(assistantMessage));
    return { session, assistantMessage };
  }

  if (session.mode === "tailor" && session.currentStep === "collect_job") {
    const resume = generateFinalResume(session, userMessage);
    session.currentStep = "generated";
    session.resumeId = resume.id;
    const assistantMessage = `Your tailored resume is ready. Match score: ${resume.tailoring?.matchScore ?? resume.score?.overall ?? 0}/100. I left unsupported job keywords out instead of inventing them.`;
    session.messages.push(systemMessage(assistantMessage));
    return { session, assistantMessage, resume };
  }

  session.profile = extractProfileData(userMessage, session.profile, session.targetRole);
  const gapReport = detectGaps(session.profile, session.mode);
  const hasAlreadyAskedQuestions = session.currentStep === "needs_info";

  if (gapReport.questionsToAsk.length && !hasAlreadyAskedQuestions) {
    session.currentStep = "needs_info";
    session.missingQuestions = gapReport.questionsToAsk;
    const assistantMessage = [
      `I found ${foundSummary(session)}. I need ${gapReport.questionsToAsk.length} missing detail${gapReport.questionsToAsk.length > 1 ? "s" : ""} to make this stronger:`,
      ...gapReport.questionsToAsk.map((question, index) => `${index + 1}. ${question.question}`),
      "You can answer messily or skip anything you do not know.",
    ].join("\n");
    session.messages.push(systemMessage(assistantMessage));
    return { session, assistantMessage };
  }

  const resume = generateFinalResume(session);
  session.currentStep = "generated";
  session.resumeId = resume.id;
  const assistantMessage = `Your resume is ready. Resume Score: ${resume.score?.overall ?? 0}/100. Top fixes: ${(resume.audit?.recommendedFixes ?? []).slice(0, 3).join(" ")}`;
  session.messages.push(systemMessage(assistantMessage));
  return { session, assistantMessage, resume };
}

function generateFinalResume(session: BuilderSession, jobDescription = "") {
  const draft = writeResume(session.profile, session.mode, jobDescription);
  const draftAudit = auditResume(draft, session.targetRole, jobDescription);
  const improved = improveResume(draft, draftAudit, session.targetRole);
  const resume = createResumeRecord({
    mode: session.mode,
    targetRole: session.targetRole,
    content: improved,
    profile: session.profile,
    jobDescription,
    title: `${session.targetRole || "CareerPath"} Resume`,
  });

  if (session.mode === "tailor") {
    const tailoring = tailorResume(resume, session.profile, jobDescription);
    resume.content = tailoring.tailoredResume;
    resume.tailoring = tailoring;
    const finalAudit = auditResume(resume.content, session.targetRole, jobDescription);
    resume.audit = finalAudit;
    resume.score = finalAudit.score;
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
    id: createCareerPathId("msg"),
    role: "assistant" as const,
    content,
    createdAt: new Date().toISOString(),
  };
}
