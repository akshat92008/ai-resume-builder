import { NextRequest, NextResponse } from "next/server";
import { generateTailoredResume } from "@/lib/ai/nim";
import { calculateProofScore } from "@/lib/proof-score";
import { mockVault } from "@/lib/mock-data";
import type { JobAnalysis, Resume, UserVault } from "@/lib/types";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    if (!body.jobAnalysis) {
      return NextResponse.json({ error: "Job analysis context is required." }, { status: 400 });
    }

    const vault = (body.userVault as UserVault | undefined) ?? mockVault;
    const jobAnalysis = body.jobAnalysis as JobAnalysis;
    const style = typeof body.style === "string" ? body.style : "ATS Formal";
    const { content, warnings } = await generateTailoredResume(vault, jobAnalysis, style);
    const resume: Resume = {
      id: "api-preview",
      job_id: null,
      title: `${jobAnalysis.resumeAngle || "Proof-backed"} resume`,
      style,
      content_json: content,
      proof_score: 0,
      warnings,
      created_at: new Date().toISOString(),
    };
    const proofScore = calculateProofScore(vault, resume, jobAnalysis);

    return NextResponse.json({ content, warnings, proofScore });
  } catch {
    return NextResponse.json({ error: "Unable to generate the resume right now." }, { status: 400 });
  }
}
