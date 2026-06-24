import { NextRequest, NextResponse } from "next/server";
import { generateCoverLetter } from "@/lib/ai/nim";

import type { ResumeContent, UserVault } from "@/lib/types";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const jobDescription = String(body.jobDescription ?? body.job_description ?? "");
    if (jobDescription.length < 30) {
      return NextResponse.json({ error: "Job description is required." }, { status: 400 });
    }
    const vault = body.userVault as UserVault | undefined;
    if (!vault) throw new Error("Vault required");
    const resume = body.resume as ResumeContent | undefined;
    const result = await generateCoverLetter(vault, jobDescription, resume);
    return NextResponse.json(result);
  } catch {
    return NextResponse.json({ error: "Unable to generate cover letter." }, { status: 400 });
  }
}
