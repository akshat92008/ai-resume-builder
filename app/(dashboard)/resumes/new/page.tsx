"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { FileText } from "lucide-react";
import { Alert, Button, Card, CardContent, CardHeader, CardTitle, Select } from "@/components/ui";
import { makeId } from "@/lib/utils";
import { getCurrentVault, getJobs, saveResume } from "@/lib/repositories";
import { trackEvent } from "@/lib/events";
import type { JobAnalysis, Resume, ResumeContent, ResumeWarning } from "@/lib/types";

export default function NewResumePage() {
  const router = useRouter();
  const [style, setStyle] = useState("ATS Formal");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [overrideWeakData, setOverrideWeakData] = useState(false);

  async function generate(force = false) {
    setLoading(true);
    setError("");
    try {
      const vault = await getCurrentVault();
      if (!vault) throw new Error("Vault not found. Please log in.");
      
      const hasStrongProjects = vault.projects.some(p => p.title && p.short_description && p.tech_stack.length > 0);
      if (!hasStrongProjects && !force) {
        setOverrideWeakData(true);
        setLoading(false);
        return;
      }
      setOverrideWeakData(false);
      
      const jobs = await getJobs();
      const latestJob = jobs?.[0];
      const analysis: JobAnalysis =
        latestJob?.analysis_json ??
        {
          requiredSkills: vault.skills.slice(0, 6).map((skill) => skill.name),
          preferredSkills: ["GitHub proof", "Live demo", "Clear project impact"],
          missingSkills: [],
          matchingSkills: vault.skills.slice(0, 6).map((skill) => skill.name),
          recommendedProjects: vault.projects.slice(0, 3).map((project) => project.id),
          fitScore: 72,
          resumeAngle: `Lead with ${vault.projects[0]?.title || "your strongest verified project"} and avoid unsupported claims.`,
          warnings: ["No JD was selected, so this is a general proof-backed resume."],
        };

      const response = await fetch("/api/ai/generate-resume", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobAnalysis: analysis, style, userVault: vault }),
      });
      const data = (await response.json()) as {
        content?: ResumeContent;
        warnings?: ResumeWarning[];
        proofScore?: { total: number };
        error?: string;
      };
      if (!response.ok || !data.content) throw new Error(data.error || "Unable to generate resume.");
      const resume: Resume = {
        id: makeId("resume"),
        job_id: latestJob?.id ?? null,
        title: latestJob ? `${latestJob.job_title} resume` : "Proof-backed resume",
        style,
        content_json: data.content,
        warnings: data.warnings ?? [],
        proof_score: data.proofScore?.total ?? 0,
        created_at: new Date().toISOString(),
      };
      await saveResume(resume);
      await trackEvent("resume_generated", { resume_id: resume.id, source: "resumes-new", proof_score: resume.proof_score });
      router.push(`/resumes/${resume.id}`);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to generate resume.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <p className="text-sm font-semibold uppercase tracking-wide text-blue-700">Resume Generator</p>
        <h1 className="font-display text-3xl font-bold text-slate-950">Generate a proof-backed resume.</h1>
        <p className="mt-2 text-slate-600">This uses your Career Vault and latest saved job analysis. It will not invent credentials.</p>
      </div>

      <Card>
        <CardHeader>
          <FileText className="h-8 w-8 text-blue-600" />
          <CardTitle>Resume settings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="space-y-2">
            <label className="text-sm font-medium">Style</label>
            <Select value={style} onChange={(event) => setStyle(event.target.value)}>
              <option>ATS Formal</option>
              <option>Technical Heavy</option>
              <option>Startup/Modern</option>
            </Select>
          </div>
          {error && <Alert variant="error">{error}</Alert>}
          
          {overrideWeakData && (
            <Alert variant="warning" className="border-amber-200 bg-amber-50">
              <strong>Weak project data detected:</strong> Your Career Vault project details are too thin to generate a strong resume. Add a description, tech stack, and proof link for at least one project.
              <div className="mt-4 flex gap-3">
                <Button size="sm" asChild className="bg-amber-600 hover:bg-amber-700">
                  <Link href="/vault">Improve project in Career Vault</Link>
                </Button>
                <Button size="sm" variant="outline" onClick={() => generate(true)} className="border-amber-600 text-amber-700 hover:bg-amber-100">
                  Generate anyway
                </Button>
              </div>
            </Alert>
          )}

          <Button onClick={() => generate(false)} disabled={loading} className="w-full">
            {loading ? "Generating..." : "Generate resume"}
          </Button>
          <Button variant="outline" asChild className="w-full">
            <Link href="/jobs/new">Analyze a job first</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
