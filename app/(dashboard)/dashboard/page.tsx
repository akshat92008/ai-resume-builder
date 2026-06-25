"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Download, FileText, Plus, Trash2 } from "lucide-react";
import { Badge, Button, Card, CardContent, EmptyState } from "@/components/ui";
import { deleteCareerPathResume, getCareerPathResumes } from "@/lib/careerpath/client-store";
import type { CareerPathResume } from "@/lib/careerpath/types";

export default function DashboardPage() {
  const [resumes, setResumes] = useState<CareerPathResume[]>([]);

  useEffect(() => {
    setResumes(getCareerPathResumes());
  }, []);

  function removeResume(id: string) {
    deleteCareerPathResume(id);
    setResumes(getCareerPathResumes());
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-blue-700">Dashboard</p>
          <h1 className="text-3xl font-bold tracking-tight text-slate-950">Saved resume versions</h1>
          <p className="mt-2 max-w-2xl text-slate-600">Only the essentials: open, download, or delete a saved CareerPath AI resume.</p>
        </div>
        <Button asChild>
          <Link href="/builder">
            <Plus className="mr-2 h-4 w-4" />
            Build Resume
          </Link>
        </Button>
      </div>

      {resumes.length === 0 ? (
        <EmptyState
          icon={<FileText className="h-10 w-10" />}
          title="No saved resumes yet"
          description="Build, improve, or tailor a resume to save your first version."
          action={<Button asChild><Link href="/builder">Open builder</Link></Button>}
        />
      ) : (
        <div className="grid gap-4">
          {resumes.map((resume) => (
            <Card key={resume.id}>
              <CardContent className="p-5">
                <div className="grid gap-4 lg:grid-cols-[1fr_160px_140px_260px] lg:items-center">
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
                    <Button variant="outline" size="sm" onClick={() => window.open(`/resume/${resume.id}`, "_blank")}>
                      <Download className="mr-2 h-4 w-4" />
                      PDF
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => removeResume(resume.id)} className="text-red-600">
                      <Trash2 className="mr-2 h-4 w-4" />
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
