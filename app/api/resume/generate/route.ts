import { NextResponse } from "next/server";
import { auditResumeAgent, improveResumeAgent, writeResumeAgent } from "@/lib/careerpath/orchestrator";
import { createResumeRecord } from "@/lib/careerpath/agents";
import { getSession, saveServerResume, saveSession } from "@/lib/careerpath/db";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as { sessionId?: string };
  if (!body.sessionId) return NextResponse.json({ error: "sessionId is required." }, { status: 400 });

  const session = await getSession(body.sessionId);
  if (!session) return NextResponse.json({ error: "Builder session not found." }, { status: 404 });

  const draft = await writeResumeAgent(session.profile, session.mode, session.profile.rawNotes);
  const draftAudit = await auditResumeAgent(draft, session.targetRole);
  const improved = await improveResumeAgent(draft, draftAudit, session.targetRole);
  const resume = createResumeRecord({
    mode: session.mode,
    targetRole: session.targetRole,
    content: improved,
    profile: session.profile,
    title: `${session.targetRole || "CareerPath"} Resume`,
  });

  session.currentStep = "generated";
  session.resumeId = resume.id;
  await saveSession(session);
  await saveServerResume(resume);

  return NextResponse.json({
    resumeId: resume.id,
    content: resume.content,
    score: resume.score,
    audit: resume.audit,
    resume,
  });
}
