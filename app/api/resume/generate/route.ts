import { NextResponse } from "next/server";
import { auditResume, createResumeRecord, improveResume, writeResume } from "@/lib/careerpath/agents";
import { getSession, saveServerResume, saveSession } from "@/lib/careerpath/server-store";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as { sessionId?: string };
  if (!body.sessionId) return NextResponse.json({ error: "sessionId is required." }, { status: 400 });

  const session = getSession(body.sessionId);
  if (!session) return NextResponse.json({ error: "Builder session not found." }, { status: 404 });

  const draft = writeResume(session.profile, session.mode, session.profile.rawNotes);
  const draftAudit = auditResume(draft, session.targetRole);
  const improved = improveResume(draft, draftAudit, session.targetRole);
  const resume = createResumeRecord({
    mode: session.mode,
    targetRole: session.targetRole,
    content: improved,
    profile: session.profile,
    title: `${session.targetRole || "CareerPath"} Resume`,
  });

  session.currentStep = "generated";
  session.resumeId = resume.id;
  saveSession(session);
  saveServerResume(resume);

  return NextResponse.json({
    resumeId: resume.id,
    content: resume.content,
    score: resume.score,
    audit: resume.audit,
    resume,
  });
}
