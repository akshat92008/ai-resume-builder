"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { AlertTriangle, FileText, Mail, Sparkles } from "lucide-react";
import { Alert, Badge, Button, Card, CardContent, CardHeader, CardTitle, LoadingState, EmptyState } from "@/components/ui";
import { trackEvent } from "@/lib/events";
import type { Job, Resume, ResumeContent, ResumeWarning, UserVault } from "@/lib/types";
import { getJob, getCurrentVault, saveResume, getCurrentUser } from "@/lib/repositories";

export default function JobDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [job, setJob] = useState<Job | null>(null);
  const [vault, setVault] = useState<UserVault | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingResume, setLoadingResume] = useState(false);
  const [coverLetter, setCoverLetter] = useState("");
  const [overrideWeakData, setOverrideWeakData] = useState(false);
  const [qualityGate, setQualityGate] = useState<{
    message: string;
    blockingIssues: string[];
    missingFields: string[];
    nextActions: string[];
    proofScore: number;
    missingProof: string[];
  } | null>(null);

  useEffect(() => {
    async function loadData() {
      const jobData = await getJob(params.id);
      if (jobData) setJob(jobData);

      const vaultData = await getCurrentVault();
      setVault(vaultData);
      setLoading(false);
    }
    loadData();
  }, [params.id]);

  async function generateResume(force = false) {
    if (!job || !vault) return;

    setOverrideWeakData(false);
    setQualityGate(null);
    
    setLoadingResume(true);
    const response = await fetch("/api/ai/generate-resume", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ jobAnalysis: job.analysis_json, style: job.style, userVault: vault, force }),
    });
    const data = (await response.json()) as {
      content?: ResumeContent;
      warnings?: ResumeWarning[];
      proofScore?: { total: number };
      resumeCritic?: { resumeQualityScore: number };
      qualityGate?: typeof qualityGate;
      error?: string;
    };
    if (response.status === 409 && data.qualityGate) {
      setQualityGate(data.qualityGate);
      setOverrideWeakData(true);
      setLoadingResume(false);
      return;
    }
    if (!response.ok || !data.content) {
      setCoverLetter(data.error ?? "Unable to generate resume.");
      setLoadingResume(false);
      return;
    }

    const newResumeData = await saveResume({
      id: crypto.randomUUID(),
      job_id: job.id,
      title: `${job.job_title} resume`,
      style: job.style,
      content_json: data.content,
      proof_score: data.resumeCritic?.resumeQualityScore ?? data.proofScore?.total ?? 0,
      warnings: data.warnings ?? [],
      created_at: new Date().toISOString(),
    });

    if (newResumeData) {
      await trackEvent("resume_generated", { job_id: job.id, resume_id: newResumeData.id, proof_score: newResumeData.proof_score });
      router.push(`/resumes/${newResumeData.id}`);
    }
    setLoadingResume(false);
  }

  async function generateCoverLetter() {
    if (!job || !vault) return;
    const response = await fetch("/api/ai/generate-cover-letter", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ jobDescription: job.job_description, userVault: vault }),
    });
    const data = (await response.json()) as { content?: string };
    setCoverLetter(data.content ?? "Unable to generate cover letter.");
  }

  if (loading) return <LoadingState label="Loading job analysis..." />;
  if (!job || !vault) return <EmptyState title="Not found" description="Job not found." />;

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
          <Button onClick={() => generateResume(false)} disabled={loadingResume}>
            <FileText className="mr-2 h-4 w-4" />
            {loadingResume ? "Generating..." : "Generate Resume"}
          </Button>
          <Button variant="outline" onClick={generateCoverLetter}>
            <Mail className="mr-2 h-4 w-4" />
            Generate Cover Letter
          </Button>
        </div>
      </div>
      
      {overrideWeakData && (
        <Alert variant="warning" className="border-amber-200 bg-amber-50">
          <strong>{qualityGate?.message ?? "Your resume will be weak if I generate it now."}</strong>
          <div className="mt-2 space-y-1 text-sm">
            {(qualityGate?.blockingIssues.length ? qualityGate.blockingIssues : ["Add project details, skills, and proof links for your strongest work."]).slice(0, 4).map((issue) => (
              <div key={issue}>- {issue}</div>
            ))}
          </div>
          <div className="mt-4 flex gap-3">
            <Button size="sm" asChild className="bg-amber-600 hover:bg-amber-700">
              <Link href="/vault">Improve before applying</Link>
            </Button>
            <Button size="sm" variant="outline" onClick={() => generateResume(true)} className="border-amber-600 text-amber-700 hover:bg-amber-100">
              Generate draft anyway
            </Button>
          </div>
        </Alert>
      )}

      <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
        <Card>
          <CardHeader>
            <CardTitle>Job Fit Score</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-5xl font-bold text-slate-950">{analysis.fitScore}<span className="text-xl font-normal text-slate-400">/100</span></div>
            <p className="mt-4 text-sm leading-6 text-slate-600">Job Fit Score measures how well the job requirements map to your proof-backed skills and projects.</p>
            <p className="mt-3 text-sm leading-6 text-slate-600">{analysis.resumeAngle}</p>
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
              const project = vault?.projects.find((item) => item.id === projectId);
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
              Claims without proof
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
