"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { AlertTriangle, FileText, Mail, Sparkles } from "lucide-react";
import { Alert, Badge, Button, Card, CardContent, CardHeader, CardTitle, LoadingState } from "@/components/ui";
import { getDemoJobs, getDemoVault, makeId, upsertDemoResume } from "@/lib/storage";
import { trackEvent } from "@/lib/events";
import type { Job, Resume, ResumeContent, ResumeWarning } from "@/lib/types";

export default function JobDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [job] = useState<Job | null>(() => getDemoJobs().find((item) => item.id === params.id) ?? null);
  const [loadingResume, setLoadingResume] = useState(false);
  const [coverLetter, setCoverLetter] = useState("");

  async function generateResume() {
    if (!job) return;
    setLoadingResume(true);
    const response = await fetch("/api/ai/generate-resume", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ jobAnalysis: job.analysis_json, style: job.style, userVault: getDemoVault() }),
    });
    const data = (await response.json()) as {
      content: ResumeContent;
      warnings: ResumeWarning[];
      proofScore: { total: number };
    };
    const resume: Resume = {
      id: makeId("resume"),
      job_id: job.id,
      title: `${job.job_title} resume`,
      style: job.style,
      content_json: data.content,
      warnings: data.warnings ?? [],
      proof_score: data.proofScore?.total ?? 0,
      created_at: new Date().toISOString(),
    };
    upsertDemoResume(resume);
    await trackEvent("resume_generated", { job_id: job.id, resume_id: resume.id, proof_score: resume.proof_score });
    router.push(`/resumes/${resume.id}`);
  }

  async function generateCoverLetter() {
    if (!job) return;
    const response = await fetch("/api/ai/generate-cover-letter", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ jobDescription: job.job_description, userVault: getDemoVault() }),
    });
    const data = (await response.json()) as { content?: string };
    setCoverLetter(data.content ?? "Unable to generate cover letter.");
  }

  if (!job) return <LoadingState label="Loading job analysis..." />;

  const analysis = job.analysis_json;

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-blue-700">Job Analysis</p>
          <h1 className="font-display text-3xl font-bold text-slate-950">{job.job_title}</h1>
          <p className="mt-2 text-slate-600">{job.company_name || "Company not added"} | {job.experience_level}</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button onClick={generateResume} disabled={loadingResume}>
            <FileText className="mr-2 h-4 w-4" />
            {loadingResume ? "Generating..." : "Generate Resume"}
          </Button>
          <Button variant="outline" onClick={generateCoverLetter}>
            <Mail className="mr-2 h-4 w-4" />
            Generate Cover Letter
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
        <Card>
          <CardHeader>
            <CardTitle>Fit score</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-5xl font-bold text-slate-950">{analysis.fitScore}<span className="text-xl font-normal text-slate-400">/100</span></div>
            <p className="mt-4 text-sm leading-6 text-slate-600">{analysis.resumeAngle}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Skill match</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-5 md:grid-cols-2">
            <SkillGroup title="Required skills" items={analysis.requiredSkills} />
            <SkillGroup title="Preferred skills" items={analysis.preferredSkills} />
            <SkillGroup title="Matching skills" items={analysis.matchingSkills} tone="success" />
            <SkillGroup title="Missing skills" items={analysis.missingSkills} tone="warning" />
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-blue-600" />
              Recommended projects
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-slate-600">
            {analysis.recommendedProjects.map((projectId) => {
              const project = getDemoVault().projects.find((item) => item.id === projectId);
              return (
                <div key={projectId} className="rounded-md border bg-slate-50 p-3">
                  {project?.title ?? projectId}
                </div>
              );
            })}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-600" />
              Warnings
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {analysis.warnings.map((warning) => (
              <Alert key={warning} variant="warning">{warning}</Alert>
            ))}
          </CardContent>
        </Card>
      </div>

      {coverLetter && (
        <Card>
          <CardHeader>
            <CardTitle>Generated cover letter</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="whitespace-pre-wrap rounded-lg bg-slate-50 p-4 text-sm leading-6 text-slate-700">{coverLetter}</pre>
          </CardContent>
        </Card>
      )}

      <Button variant="outline" asChild>
        <Link href="/jobs">Back to jobs</Link>
      </Button>
    </div>
  );
}

function SkillGroup({ title, items, tone = "default" }: { title: string; items: string[]; tone?: "default" | "success" | "warning" }) {
  return (
    <div>
      <div className="mb-2 text-sm font-semibold text-slate-700">{title}</div>
      <div className="flex flex-wrap gap-2">
        {(items.length ? items : ["None detected"]).map((item) => (
          <Badge key={item} variant={tone === "warning" ? "outline" : tone === "success" ? "default" : "secondary"}>
            {item}
          </Badge>
        ))}
      </div>
    </div>
  );
}
