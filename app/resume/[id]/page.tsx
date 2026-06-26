"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Copy, Loader2, Printer, Save, Sparkles, Trash2, Wand2 } from "lucide-react";
import { Alert, Badge, Button, Card, CardContent, CardHeader, CardTitle, Textarea } from "@/components/ui";
import { MarketingNav } from "@/components/layout/MarketingNav";
import { ResumeDocument } from "@/components/careerpath/ResumeDocument";
import { ScorePanel } from "@/components/careerpath/ScorePanel";
import {
  deleteCareerPathResume,
  duplicateCareerPathResume,
  getCareerPathResume,
  saveCareerPathResume,
} from "@/lib/careerpath/client-store";
import type { CareerPathResume } from "@/lib/careerpath/types";
import { getApiError } from "@/lib/utils";

export default function ResumeDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [resume, setResume] = useState<CareerPathResume | null>(null);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [editing, setEditing] = useState(false);
  const [jobDescription, setJobDescription] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadResume() {
      // Try server first (ensures fresh data if logged in)
      try {
        const response = await fetch(`/api/resume/${params.id}`);
        if (response.ok) {
          const data = (await response.json()) as { resume?: CareerPathResume };
          if (data.resume) {
            setResume(saveCareerPathResume(data.resume));
            setLoading(false);
            return;
          }
        }
      } catch {
        // ignore
      }

      // Try localStorage as fallback (fast, offline, demo mode)
      const local = getCareerPathResume(params.id);
      if (local) {
        setResume(local);
        setLoading(false);
        return;
      }
      setLoading(false);
    }
    loadResume();
  }, [params.id]);

  function updateResume(next: CareerPathResume, status = "Saved changes.") {
    const saved = saveCareerPathResume(next);
    setResume(saved);
    setMessage(status);
    window.setTimeout(() => setMessage(""), 1800);

    // Also save to server
    fetch(`/api/resume/${saved.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(saved),
    }).catch(() => {});
  }

  async function autoImprove() {
    if (!resume) return;
    setWorking(true);
    setError("");
    try {
      const response = await fetch("/api/resume/improve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resumeId: resume.id }),
      });
      const data = (await response.json()) as { resume?: CareerPathResume; error?: { message?: string } };
      if (!response.ok || !data.resume) throw data;
      updateResume(data.resume, "Improved resume automatically.");
    } catch (caught) {
      setError(getApiError(caught, "Unable to improve resume."));
    } finally {
      setWorking(false);
    }
  }

  async function tailorToJob() {
    if (!resume || !jobDescription.trim()) return;
    setWorking(true);
    setError("");
    try {
      const response = await fetch("/api/resume/tailor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resumeId: resume.id, jobDescription }),
      });
      const data = (await response.json()) as { resume?: CareerPathResume; error?: { message?: string } };
      if (!response.ok || !data.resume) throw data;
      const saved = saveCareerPathResume(data.resume);
      router.push(`/resume/${saved.id}`);
    } catch (caught) {
      setError(getApiError(caught, "Unable to tailor resume."));
    } finally {
      setWorking(false);
    }
  }

  async function saveVersion() {
    if (!resume) return;
    try {
      const res = await fetch(`/api/resume/${resume.id}/duplicate`, { method: "POST" });
      if (res.ok) {
        const data = (await res.json()) as { resume?: CareerPathResume };
        if (data.resume) {
          saveCareerPathResume(data.resume);
          router.push(`/resume/${data.resume.id}`);
          return;
        }
      }
    } catch {
      // fallback to client
    }
    const copy = duplicateCareerPathResume(resume);
    router.push(`/resume/${copy.id}`);
  }

  async function deleteResume() {
    if (!resume) return;
    deleteCareerPathResume(resume.id);
    try {
      await fetch(`/api/resume/${resume.id}`, { method: "DELETE" });
    } catch {
      // ignore
    }
    router.push("/dashboard");
  }

  function updateSummary(summary: string) {
    if (!resume) return;
    setResume({ ...resume, content: { ...resume.content, summary } });
  }

  function updateProjectBullet(projectIndex: number, bulletIndex: number, value: string) {
    if (!resume) return;
    setResume({
      ...resume,
      content: {
        ...resume.content,
        projects: resume.content.projects.map((project, currentProjectIndex) =>
          currentProjectIndex === projectIndex
            ? {
                ...project,
                bullets: project.bullets.map((bullet, currentBulletIndex) => (currentBulletIndex === bulletIndex ? value : bullet)),
              }
            : project,
        ),
      },
    });
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50">
        <MarketingNav />
        <div className="mx-auto flex max-w-6xl items-center justify-center px-4 py-20 text-slate-500">
          <Loader2 className="mr-2 h-5 w-5 animate-spin" />
          Loading resume...
        </div>
      </div>
    );
  }

  if (!resume) {
    return (
      <div className="min-h-screen bg-slate-50">
        <MarketingNav />
        <main className="mx-auto max-w-3xl px-4 py-12">
          <Alert variant="error">Resume not found. It may have been deleted.</Alert>
          <div className="mt-4 flex gap-3">
            <Button asChild><Link href="/builder">Build a new resume</Link></Button>
            <Button asChild variant="outline"><Link href="/dashboard">Saved resumes</Link></Button>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <MarketingNav />
      <main className="mx-auto grid max-w-7xl gap-6 px-4 py-8 sm:px-6 lg:grid-cols-[360px_1fr]">
        <aside className="space-y-5 no-print">
          <div>
            <Badge className="bg-white text-blue-700 ring-1 ring-blue-100 hover:bg-white">Final Resume Preview</Badge>
            <h1 className="mt-3 text-3xl font-bold tracking-tight text-slate-950">{resume.title}</h1>
            <p className="mt-2 text-sm text-slate-600">{resume.targetRole} | Version {resume.version}</p>
          </div>

          {message && <Alert variant="success">{message}</Alert>}
          {error && <Alert variant="error">{error}</Alert>}

          <ScorePanel score={resume.score} audit={resume.audit} />

          <Card>
            <CardHeader>
              <CardTitle>Section feedback</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              {(resume.audit?.issues.length ? resume.audit.issues : [{ section: "All sections", message: "No major issues found.", severity: "low", type: "ok" }]).slice(0, 5).map((issue, index) => (
                <div key={`${issue.section}-${index}`} className="rounded-md border bg-slate-50 p-3">
                  <div className="font-semibold text-slate-950">{issue.section}</div>
                  <div className="mt-1 leading-6 text-slate-600">{issue.message}</div>
                </div>
              ))}
            </CardContent>
          </Card>

          <div className="grid gap-3">
            <Button onClick={() => setEditing((current) => !current)} variant="outline">
              <Save className="mr-2 h-4 w-4" />
              Edit Section
            </Button>
            <Button onClick={autoImprove} disabled={working}>
              {working ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
              Improve Automatically
            </Button>
            <Button variant="outline" onClick={() => window.print()}>
              <Printer className="mr-2 h-4 w-4" />
              Print / Save as PDF
            </Button>
            <Button variant="outline" onClick={saveVersion}>
              <Copy className="mr-2 h-4 w-4" />
              Duplicate Version
            </Button>
            <Button variant="outline" onClick={deleteResume} className="text-red-600">
              <Trash2 className="mr-2 h-4 w-4" />
              Delete
            </Button>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Wand2 className="h-5 w-5 text-blue-600" />
                Tailor to job
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Textarea
                rows={6}
                value={jobDescription}
                onChange={(event) => setJobDescription(event.target.value)}
                placeholder="Paste the job description..."
              />
              <Button onClick={tailorToJob} disabled={working || !jobDescription.trim()} className="w-full">
                Tailor to Job
              </Button>
            </CardContent>
          </Card>
        </aside>

        <section className="space-y-5">
          {editing && (
            <Card className="no-print">
              <CardHeader>
                <CardTitle>Edit resume sections</CardTitle>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Summary</label>
                  <Textarea rows={4} value={resume.content.summary} onChange={(event) => updateSummary(event.target.value)} />
                </div>
                {resume.content.projects.map((project, projectIndex) => (
                  <div key={`${project.name}-${projectIndex}`} className="space-y-3 rounded-md border bg-slate-50 p-4">
                    <div className="font-semibold text-slate-950">{project.name}</div>
                    {project.bullets.map((bullet, bulletIndex) => (
                      <Textarea
                        key={`${project.name}-${bulletIndex}`}
                        rows={2}
                        value={bullet}
                        onChange={(event) => updateProjectBullet(projectIndex, bulletIndex, event.target.value)}
                      />
                    ))}
                  </div>
                ))}
                <Button onClick={() => updateResume(resume)}>Save edited sections</Button>
              </CardContent>
            </Card>
          )}

          <ResumeDocument content={resume.content} />
          <div className="no-print rounded-lg bg-yellow-50 p-4 text-sm text-yellow-800 ring-1 ring-yellow-200">
            <strong>Safety notice:</strong> Review before sending. CareerPath AI improves wording but should not add fake projects, internships, certificates, links, marks, or metrics.
          </div>
        </section>
      </main>
    </div>
  );
}
