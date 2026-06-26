"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Copy, FileText, Loader2, Plus, Printer, Trash2 } from "lucide-react";
import { Badge, Button, Card, CardContent, EmptyState } from "@/components/ui";
import { deleteCareerPathResume, getCareerPathResumes } from "@/lib/careerpath/client-store";
import type { CareerPathResume } from "@/lib/careerpath/types";

type LoadState = "loading" | "loaded" | "error";

export default function DashboardPage() {
  const [resumes, setResumes] = useState<CareerPathResume[]>([]);
  const [state, setState] = useState<LoadState>("loading");

  useEffect(() => {
    loadResumes();
  }, []);

  async function loadResumes() {
    setState("loading");
    try {
      // Try server first
      const res = await fetch("/api/resumes");
      if (res.ok) {
        const data = (await res.json()) as { resumes?: CareerPathResume[] };
        if (data.resumes?.length) {
          setResumes(data.resumes);
          setState("loaded");
          return;
        }
      }
    } catch {
      // Fall through to localStorage
    }

    // Fallback to localStorage
    const local = getCareerPathResumes();
    setResumes(local);
    setState("loaded");
  }

  async function removeResume(id: string) {
    // Delete from server
    try {
      await fetch(`/api/resume/${id}`, { method: "DELETE" });
    } catch {
      // ignore
    }
    // Also clean localStorage
    deleteCareerPathResume(id);
    setResumes((current) => current.filter((r) => r.id !== id));
  }

  async function duplicateResume(id: string) {
    try {
      const res = await fetch(`/api/resume/${id}/duplicate`, { method: "POST" });
      if (res.ok) {
        await loadResumes();
        return;
      }
    } catch {
      // ignore
    }
  }

  if (state === "loading") {
    return (
      <div className="mx-auto max-w-6xl space-y-6">
        <DashboardHeader />
        <div className="flex items-center justify-center py-20 text-slate-500">
          <Loader2 className="mr-2 h-5 w-5 animate-spin" />
          Loading saved resumes...
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <DashboardHeader />

      {resumes.length === 0 ? (
        <EmptyState
          icon={<FileText className="h-10 w-10" />}
          title="No saved resumes yet"
          description="Build, improve, or tailor a resume to save your first version."
          action={<Button asChild><Link href="/builder">Build your first resume</Link></Button>}
        />
      ) : (
        <div className="grid gap-4">
          {resumes.map((resume) => (
            <Card key={resume.id}>
              <CardContent className="p-5">
                <div className="grid gap-4 lg:grid-cols-[1fr_160px_140px_300px] lg:items-center">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="font-semibold text-slate-950">{resume.title}</h2>
                      <Badge variant="secondary">v{resume.version}</Badge>
                    </div>
                    <p className="mt-1 text-sm text-slate-500">{resume.targetRole}</p>
                  </div>
                  <div className="text-sm text-slate-600">
                    <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">Last updated</div>
                    {new Date(resume.updatedAt).toLocaleDateString()}
                  </div>
                  <div>
                    <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">Score</div>
                    <div className="text-lg font-bold text-slate-950">{resume.score?.overall ?? 0}/100</div>
                  </div>
                  <div className="flex flex-wrap gap-2 lg:justify-end">
                    <Button asChild variant="outline" size="sm">
                      <Link href={`/resume/${resume.id}`}>Open</Link>
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => duplicateResume(resume.id)}>
                      <Copy className="mr-1.5 h-3.5 w-3.5" />
                      Duplicate
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => window.open(`/resume/${resume.id}`, "_blank")}>
                      <Printer className="mr-1.5 h-3.5 w-3.5" />
                      Print / Save PDF
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => removeResume(resume.id)} className="text-red-600">
                      <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                      Delete
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function DashboardHeader() {
  return (
    <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
      <div>
        <p className="text-sm font-semibold uppercase tracking-wide text-blue-700">Dashboard</p>
        <h1 className="text-3xl font-bold tracking-tight text-slate-950">Saved resume versions</h1>
        <p className="mt-2 max-w-2xl text-slate-600">Open, duplicate, print or save, or delete a saved CareerPath AI resume.</p>
      </div>
      <Button asChild>
        <Link href="/builder">
          <Plus className="mr-2 h-4 w-4" />
          Build Resume
        </Link>
      </Button>
    </div>
  );
}
