import { NextRequest, NextResponse } from "next/server";
import { generateTailoredResume } from "@/lib/ai/nim";
import { calculateProofScore } from "@/lib/proof-score";
import { inspectCareerVault } from "@/lib/agents/career-vault-agent";
import { auditProof } from "@/lib/agents/proof-auditor-agent";
import { critiqueResumeWithAgent } from "@/lib/agents/resume-critic-agent";

import type { JobAnalysis, Resume, UserVault } from "@/lib/types";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    if (!body.jobAnalysis) {
      return NextResponse.json({ error: "Job analysis context is required." }, { status: 400 });
    }

    const vault = body.userVault as UserVault | undefined;
    if (!vault) throw new Error("Vault required");
    const jobAnalysis = body.jobAnalysis as JobAnalysis;
    const style = typeof body.style === "string" ? body.style : "ATS Formal";
    const force = Boolean(body.force);
    const vaultReport = inspectCareerVault(vault);

    if (!vaultReport.canGenerateResume && !force) {
      const proofAudit = auditProof(vault, null, jobAnalysis);
      return NextResponse.json(
        {
          error: "Resume quality gate failed.",
          qualityGate: {
            message: "Your resume will be weak if I generate it now.",
            blockingIssues: vaultReport.blockingIssues,
            missingFields: vaultReport.missingFields,
            nextActions: vaultReport.nextActions,
            proofScore: proofAudit.proofScore,
            missingProof: proofAudit.missingProof,
          },
        },
        { status: 409 },
      );
    }

    const { content, warnings } = await generateTailoredResume(vault, jobAnalysis, style);
    const resumeProofAudit = auditProof(vault, content, jobAnalysis);
    const resumeCritic = critiqueResumeWithAgent(content, vault, resumeProofAudit);
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

    return NextResponse.json({ content, warnings, proofScore, resumeCritic, proofAudit: resumeProofAudit });
  } catch {
    return NextResponse.json({ error: "Unable to generate the resume right now." }, { status: 400 });
  }
}
