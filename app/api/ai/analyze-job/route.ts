import { NextRequest, NextResponse } from "next/server";
import { analyzeJobDescription } from "@/lib/ai/nim";
import { mockVault } from "@/lib/mock-data";
import type { UserVault } from "@/lib/types";
import { jobSchema } from "@/lib/validations";

export async function POST(req: NextRequest) {
  try {
    const raw = await req.json();
    const normalized = {
      job_title: raw.job_title ?? raw.title ?? "Untitled role",
      company_name: raw.company_name ?? raw.company ?? "",
      job_description: raw.job_description ?? raw.jobDescription ?? raw.description ?? "",
      role_category: raw.role_category ?? "",
      experience_level: raw.experience_level ?? "",
      style: raw.style ?? "ATS Formal",
      userVault: raw.userVault,
    };
    const input = jobSchema.parse(normalized);
    const vault = (input.userVault as UserVault | undefined) ?? mockVault;
    const analysis = await analyzeJobDescription(vault, input.job_description);

    return NextResponse.json({
      ...analysis,
      job: {
        job_title: input.job_title,
        company_name: input.company_name,
        job_description: input.job_description,
        role_category: input.role_category,
        experience_level: input.experience_level,
        style: input.style || "ATS Formal",
      },
    });
  } catch {
    return NextResponse.json({ error: "Unable to analyze this job description. Check the input and try again." }, { status: 400 });
  }
}
